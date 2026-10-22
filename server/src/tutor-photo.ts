import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { actor, fail } from './core'
import { application } from './format'
import { idParam, parse } from './validation'

const maxInputBytes = 2 * 1024 * 1024
const keyPattern = /^[a-f0-9]{32}\.jpg$/
function photoPath(root: string, key: string): string {
  if (!keyPattern.test(key)) throw new Error('Invalid stored photo key')
  return join(root, key)
}

/** Used only in authenticated application responses, so unapproved photos stay private. */
export async function readTutorPhotoDataUrl(root: string, key: string | null): Promise<string | undefined> {
  if (!key) return undefined
  const bytes = await readFile(photoPath(root, key))
  return `data:image/jpeg;base64,${bytes.toString('base64')}`
}

export async function registerTutorPhotoRoutes(app: FastifyInstance, db: PrismaClient, root: string): Promise<void> {
  await app.register(multipart, { limits: { fileSize: maxInputBytes, files: 1, fields: 0, parts: 1 } })

  app.post('/api/tutor-applications/photo', { bodyLimit: maxInputBytes + 8192 }, async request => {
    const { user } = await actor(request, db, ['tutor'])
    const existing = await db.tutorApplication.findUnique({ where: { userId: user.id } })
    if (!existing) return fail('CONFLICT', 409, '请先保存入驻草稿，再上传照片')
    if (existing.status === 'pending') return fail('CONFLICT', 409, '审核期间不可修改照片')
    const part = await request.file()
    if (!part) return fail('INVALID', 400, '请选择 JPG、PNG 或 WebP 照片')
    let result: Buffer
    try {
      const raw = await part.toBuffer()
      const image = sharp(raw, { limitInputPixels: 12_000_000, failOn: 'error' })
      const metadata = await image.metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) return fail('INVALID', 400, '仅支持 JPG、PNG 或 WebP 照片')
      result = await image.rotate().resize(512, 512, { fit: 'cover', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
      if (result.length > 512_000) return fail('INVALID', 400, '照片处理后仍过大，请换一张')
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) throw error
      return fail('INVALID', 400, '照片内容无效或超过 2 MB')
    }
    const key = `${randomBytes(16).toString('hex')}.jpg`
    await mkdir(root, { recursive: true, mode: 0o700 })
    await writeFile(photoPath(root, key), result, { flag: 'wx', mode: 0o600 })
    try {
      const {saved,oldKey} = await db.$transaction(async tx => {
        const prior=await tx.tutorApplication.findUnique({where:{userId:user.id}})
        if(!prior||prior.status==='pending')return fail('CONFLICT',409,'审核状态已变化，请刷新后重试')
        const changed = await tx.tutorApplication.updateMany({
          where: { userId: user.id, status: prior.status },
          data: { photoKey: key, status: 'draft', reviewedAt: null, rejectionReason: null }
        })
        if (changed.count !== 1) return fail('CONFLICT', 409, '审核状态已变化，请刷新后重试')
        if (prior.status === 'approved') await tx.tutorProfile.update({ where: { userId: user.id }, data: { published: false } })
        return {saved:await tx.tutorApplication.findUniqueOrThrow({where:{userId:user.id}}),oldKey:prior.photoKey}
      })
      if (oldKey && oldKey !== key) await unlink(photoPath(root, oldKey)).catch(() => {})
      return { data: application(saved, `data:image/jpeg;base64,${result.toString('base64')}`) }
    } catch (error) {
      await unlink(photoPath(root, key)).catch(() => {})
      throw error
    }
  })

  app.get('/api/tutors/:id/photo', async (request, reply) => {
    const { id } = parse(idParam, request.params)
    const profile = await db.tutorProfile.findFirst({ where: { id, published: true, user: { status: 'active', application: { status: 'approved' } } } })
    if (!profile?.photoKey) return fail('NOT_FOUND', 404, '照片不存在')
    let bytes: Buffer
    try { bytes = await readFile(photoPath(root, profile.photoKey)) }
    catch { return fail('NOT_FOUND', 404, '照片不存在') }
    return reply.type('image/jpeg').header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'no-store').send(bytes)
  })
}
