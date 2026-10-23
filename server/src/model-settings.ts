import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { actor, ApiError } from './core'
import { parse } from './validation'
import { createChatModel, type ChatModel } from './assistant'
import { createHomeworkImageModel, type HomeworkImageModel } from './homework-review'

const settingsSchema = z.object({
  baseUrl: z.string().trim().url().max(240),
  model: z.string().trim().min(1).max(100).regex(/^[\w./:-]+$/),
  apiKey: z.string().trim().min(1).max(512).optional(),
  enabled: z.boolean(), vision: z.boolean()
}).strict()
type Settings = z.infer<typeof settingsSchema>
export interface ModelSettingsOptions { file?: string; encryptionKey?: string; transport?: typeof fetch; allowedHosts?: string[] }

/** One server-owned configuration, shared by chat and review. Secrets never enter public DTOs. */
export function createModelSettings(options: ModelSettingsOptions = {}) {
  const file = resolve(options.file || process.env.AI_CONFIG_FILE || './.ai-config/provider.enc')
  const transport = options.transport || fetch
  const allowed = options.allowedHosts || (process.env.AI_ALLOWED_HOSTS || 'api.deepseek.com').split(',').map(s => s.trim()).filter(Boolean)
  let current: Settings | undefined
  let storageError = false
  function key() {
    const configured = options.encryptionKey || process.env.AI_CONFIG_ENCRYPTION_KEY
    if (configured) {
      if (!/^[\da-f]{64}$/i.test(configured)) throw new Error('AI_CONFIG_ENCRYPTION_KEY must be 64 hex characters')
      return Buffer.from(configured, 'hex')
    }
    const keyFile = file + '.key'
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
    try { return readFileSync(keyFile) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const generated = randomBytes(32)
      try { writeFileSync(keyFile, generated, { mode: 0o600, flag: 'wx' }); return generated }
      catch (race) { if ((race as NodeJS.ErrnoException).code === 'EEXIST') return readFileSync(keyFile); throw race }
    }
  }
  function validate(input: Settings) {
    const u = new URL(input.baseUrl)
    if (u.protocol !== 'https:' || u.port && u.port !== '443' || u.username || u.password || u.search || u.hash || !allowed.includes(u.hostname) || !['', '/', '/v1', '/v1/'].includes(u.pathname)) {
      throw new ApiError('INVALID', 400, '服务地址须使用已允许的 HTTPS 域名，路径仅支持根目录或 /v1')
    }
    return { ...input, baseUrl: u.toString().replace(/\/$/, '') }
  }
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(saved.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(saved.tag, 'base64'))
    current = validate(settingsSchema.parse(JSON.parse(Buffer.concat([decipher.update(Buffer.from(saved.data, 'base64')), decipher.final()]).toString('utf8'))))
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') storageError = true }
  function snapshot() {
    return { baseUrl: current?.baseUrl || 'https://api.deepseek.com', model: current?.model || 'deepseek-flash', enabled: current?.enabled || false, vision: current?.vision || false, hasKey: !!current?.apiKey, storageError, allowedHosts: [...allowed], configured: !!current }
  }
  function save(input: unknown) {
    const parsed = parse(settingsSchema, input)
    const next = validate({ ...parsed, apiKey: parsed.apiKey || (current?.baseUrl === parsed.baseUrl.replace(/\/$/, '') ? current.apiKey : undefined) })
    if (next.enabled && !next.apiKey) throw new ApiError('INVALID', 400, '启用前请填写 API 密钥；更换服务地址时需重新填写')
    try {
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
      const data = Buffer.concat([cipher.update(JSON.stringify(next), 'utf8'), cipher.final()])
      const temporary = file + '.' + randomBytes(6).toString('hex') + '.tmp'
      writeFileSync(temporary, JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }), { mode: 0o600, flag: 'wx' })
      renameSync(temporary, file)
      current = next; storageError = false
      return snapshot()
    } catch { throw new ApiError('CONFIG_STORAGE', 503, '模型配置无法保存，请检查服务端配置目录或加密密钥') }
  }
  function env() {
    return { MATCH_MODEL_BASE_URL: current?.baseUrl, MATCH_MODEL_NAME: current?.model, MATCH_MODEL_API_KEY: current?.apiKey, CHAT_MODEL_TIMEOUT_MS: process.env.CHAT_MODEL_TIMEOUT_MS, HOMEWORK_MODEL_TIMEOUT_MS: process.env.HOMEWORK_MODEL_TIMEOUT_MS }
  }
  const chat: ChatModel = {
    get enabled() { return !!current?.enabled && !!current.apiKey },
    async reply(messages,purpose) {
      if (!chat.enabled) throw new ApiError('MODEL_UNAVAILABLE', 503, '管理员尚未启用模型，请先完成模型接入')
      const model=createChatModel(env(), transport)
      return purpose?model.reply(messages,purpose):model.reply(messages)
    }
  }
  const image: HomeworkImageModel = {
    get enabled() { return chat.enabled && !!current?.vision },
    async review(buffer, mime) {
      if (!image.enabled) throw new ApiError('MODEL_UNAVAILABLE', 503, '管理员尚未启用图片输入')
      return createHomeworkImageModel(env(), transport).review(buffer, mime)
    }
  }
  async function test() {
    if (!current?.apiKey) throw new ApiError('MODEL_UNAVAILABLE', 503, '请先保存 API 密钥')
    const start = Date.now()
    // Explicit, small, fixed request. Testing a saved but disabled provider does not enable it.
    await createChatModel(env(), transport).reply([{ role: 'user', content: '连接测试，请只回复：连接成功。' }])
    return { ok: true, latencyMs: Date.now() - start, model: current.model, testedAt: new Date().toISOString(), scope: 'text' }
  }
  return { snapshot, save, test, chat, image, get configured() { return !!current || storageError } }
}
export type ModelSettings = ReturnType<typeof createModelSettings>

export function registerModelSettings(app: FastifyInstance, db: PrismaClient, settings: ModelSettings) {
  let lastTest = 0
  app.get('/api/admin/model-settings', async (request, reply) => {
    await actor(request, db, ['admin']); reply.header('cache-control', 'no-store')
    return { data: settings.snapshot() }
  })
  app.put('/api/admin/model-settings', async (request, reply) => {
    const { user } = await actor(request, db, ['admin']); reply.header('cache-control', 'no-store')
    const result = settings.save(request.body)
    await db.auditLog.create({ data: { actorId: user.id, action: 'configure-model', entityType: 'ModelSettings', entityId: 'default' } })
    return { data: result }
  })
  app.post('/api/admin/model-settings/test', async (request, reply) => {
    await actor(request, db, ['admin']); reply.header('cache-control', 'no-store')
    if (Date.now() - lastTest < 5000) throw new ApiError('RATE_LIMIT', 429, '请等待 5 秒后再次测试')
    lastTest = Date.now()
    return { data: await settings.test() }
  })
}
