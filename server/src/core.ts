import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyRequest } from 'fastify'
import type { PrismaClient, User } from '@prisma/client'

const scrypt = promisify(scryptCallback)
export type Role = 'parent' | 'tutor' | 'admin'
export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message) }
}
export function fail(code: string, status: number, message: string): never { throw new ApiError(code, status, message) }
export function publicUser(user: User) { return { id: user.id, displayName: user.displayName, role: user.role as Role } }
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64) as Buffer
  return `scrypt:${salt}:${hash.toString('hex')}`
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false
  const candidate = await scrypt(password, salt, 64) as Buffer
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'))
}
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }
export function newToken() { return randomBytes(32).toString('base64url') }
export async function actor(request: FastifyRequest, db: PrismaClient, roles?: Role[]) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return fail('UNAUTHORIZED', 401, '请先登录')
  const token = header.slice(7)
  if (!/^[\w-]{30,}$/.test(token)) return fail('UNAUTHORIZED', 401, '登录状态无效或已过期')
  const session = await db.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'active') return fail('UNAUTHORIZED', 401, '登录状态无效或已过期')
  if (roles && !roles.includes(session.user.role as Role)) return fail('FORBIDDEN', 403, '当前身份无权执行此操作')
  return { user: session.user, session }
}
export function audit(db: PrismaClient, actorId: string, action: string, entityType: string, entityId: string) {
  return db.auditLog.create({ data: { actorId, action, entityType, entityId } })
}
