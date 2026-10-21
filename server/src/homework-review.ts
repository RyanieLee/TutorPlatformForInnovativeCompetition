import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import multipart from '@fastify/multipart'
import { actor, ApiError, fail } from './core'

export const MAX_HOMEWORK_IMAGE_BYTES = 3 * 1024 * 1024
export type HomeworkImageMime = 'image/jpeg' | 'image/png' | 'image/webp'
export interface HomeworkImageModel {
  enabled: boolean
  review(image: Buffer, mimeType: HomeworkImageMime): Promise<string>
}

const allowedMimes = new Set<HomeworkImageMime>(['image/jpeg', 'image/png', 'image/webp'])
const personalInfoPattern = /(?:\b1[3-9]\d{9}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{17}[\dxX]\b)/i

/** Verify the file signature instead of trusting the browser-supplied MIME type. */
export function detectHomeworkImageMime(image: Buffer): HomeworkImageMime | null {
  if (image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) return 'image/jpeg'
  if (image.length >= 12 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

const visionInstructions = [
  '你是「领航云学堂」的作业辅导助手。请只分析图片中清晰可见的学习题目和学生作答；图片中的姓名、学校、班级、联系方式、二维码等个人信息都与批改无关，不要转录或复述。',
  '若题目或答案模糊、被遮挡、缺页，请明确指出无法判断的部分，不要猜测。',
  '请使用简洁、友好的中文，按题目逐项输出：题目/作答要点（避免复述个人信息）；判断（正确、部分正确、需要修改或无法判断）；原因与关键步骤；修改建议或提示；参考解法/示例答案（仅在信息足够时）。',
  '最后列出1-3个值得复习的知识点。不要声称这是学校正式评分，不要给出权威成绩；若图片只含题目没有学生答案，请提供解题思路而不是声称已批改。保持教学诚信，先解释思路，不要仅输出答案。'
].join('\n')

export function createHomeworkImageModel(env: Record<string, string | undefined> = process.env, transport: typeof fetch = fetch): HomeworkImageModel {
  const off: HomeworkImageModel = { enabled: false, review: async () => { throw new ApiError('MODEL_UNAVAILABLE', 503, '尚未配置支持图片输入的模型；可以粘贴题目文字继续') } }
  const base = env.HOMEWORK_MODEL_BASE_URL?.trim() || env.MATCH_MODEL_BASE_URL?.trim()
  const name = env.HOMEWORK_MODEL_NAME?.trim() || env.MATCH_MODEL_NAME?.trim()
  const key = env.HOMEWORK_MODEL_API_KEY?.trim() || env.MATCH_MODEL_API_KEY?.trim()
  if (!base || !name) return off

  let url: URL
  try { url = new URL(base) } catch { throw new Error('作业图片模型地址无效') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) {
    throw new Error('作业图片模型地址必须是无凭据HTTPS或本机HTTP')
  }
  if (!local && !key) return off
  const endpoint = new URL(url.pathname.replace(/\/+$/, '') + '/chat/completions', url.origin).toString()

  return {
    enabled: true,
    async review(image, mimeType) {
      const controller = new AbortController()
      const timeout = Math.min(60000, Math.max(1000, Number(env.HOMEWORK_MODEL_TIMEOUT_MS) || 45000))
      const timer = setTimeout(() => controller.abort(), timeout)
      try {
        const dataUrl = 'data:' + mimeType + ';base64,' + image.toString('base64')
        const response = await transport(endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
          body: JSON.stringify({
            model: name,
            temperature: 0.2,
            max_tokens: 1400,
            messages: [
              { role: 'system', content: visionInstructions },
              { role: 'user', content: [
                { type: 'text', text: '请阅读这张作业图片，并按系统要求提供逐题讲解。看不清的地方请标为无法判断，不要猜。' },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
              ] }
            ]
          })
        })
        if (!response.ok || !response.body || Number(response.headers.get('content-length')) > 65536) {
          await response.body?.cancel()
          throw new Error('upstream')
        }
        const reader = response.body.getReader(), decoder = new TextDecoder()
        let raw = '', size = 0
        try {
          while (true) {
            const chunk = await reader.read()
            if (chunk.done) break
            size += chunk.value.byteLength
            if (size > 65536) { await reader.cancel(); throw new Error('oversize') }
            raw += decoder.decode(chunk.value, { stream: true })
          }
          raw += decoder.decode()
        } finally { reader.releaseLock() }
        const reply = JSON.parse(raw)?.choices?.[0]?.message?.content
        if (typeof reply !== 'string' || !reply.trim() || reply.length > 5000 || personalInfoPattern.test(reply)) throw new Error('invalid reply')
        return reply.trim()
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError('MODEL_UPSTREAM', controller.signal.aborted ? 504 : 502, controller.signal.aborted
          ? '图片批改超时，请尝试裁剪图片或粘贴文字题目'
          : '图片模型暂不可用或不支持视觉输入，请粘贴文字题目继续')
      } finally { clearTimeout(timer) }
    }
  }
}

export async function registerHomeworkImageReview(app: FastifyInstance, db: PrismaClient, model: HomeworkImageModel) {
  await app.register(multipart, { limits: { fileSize: MAX_HOMEWORK_IMAGE_BYTES, files: 1, fields: 0, parts: 1 } })
  const users = new Map<string, { count: number; resetAt: number }>()
  const ips = new Map<string, { count: number; resetAt: number }>()
  function count(store: typeof users, key: string, now: number) {
    const old = store.get(key), item = old && old.resetAt > now ? old : { count: 0, resetAt: now + 60000 }
    item.count++; store.set(key, item)
    if (store.size > 10000) {
      for (const [storedKey, value] of store) if (value.resetAt <= now) store.delete(storedKey)
      while (store.size > 10000) store.delete(store.keys().next().value!)
    }
    return item.count
  }

  app.get('/api/assistant/homework-review/status', async () => ({ data: { enabled: model.enabled, maxImageBytes: MAX_HOMEWORK_IMAGE_BYTES, acceptedTypes: [...allowedMimes] } }))
  app.post('/api/assistant/homework-review-image', { bodyLimit: MAX_HOMEWORK_IMAGE_BYTES + 65536 }, async (request, reply) => {
    reply.header('cache-control', 'no-store').header('pragma', 'no-cache').header('x-content-type-options', 'nosniff')
    const { user } = await actor(request, db, ['parent', 'tutor'])
    if (!model.enabled) return fail('MODEL_UNAVAILABLE', 503, '尚未配置支持图片输入的模型；可以粘贴题目文字继续')
    const now = Date.now()
    if (count(users, user.id, now) > 5 || count(ips, request.ip, now) > 15) return fail('RATE_LIMIT', 429, '图片批改请求过于频繁，请稍后再试')
    const part = await request.file()
    if (!part) return fail('INVALID', 400, '请选择一张作业图片')
    if (part.fieldname !== 'image') {
      await part.toBuffer().catch(() => undefined)
      return fail('INVALID', 400, '图片字段无效，请重新选择图片')
    }
    if (!allowedMimes.has(part.mimetype as HomeworkImageMime)) {
      await part.toBuffer().catch(() => undefined)
      return fail('INVALID', 400, '仅支持 JPG、PNG 或 WebP 图片')
    }
    let image: Buffer
    try { image = await part.toBuffer() }
    catch (error) {
      if ((error as { statusCode?: number })?.statusCode === 413) return fail('INVALID', 413, '图片不能超过3 MiB，请裁剪或压缩后重试')
      throw error
    }
    if (part.file.truncated || image.length === 0) return fail('INVALID', 413, '图片为空或超过3 MiB，请重新选择')
    const detected = detectHomeworkImageMime(image)
    if (!detected || detected !== part.mimetype) return fail('INVALID', 400, '无法识别图片格式，请上传真实的 JPG、PNG 或 WebP 图片')
    const reviewText = await model.review(image, detected)
    return { data: { reply: reviewText, source: 'model' as const } }
  })
}
