import { describe, expect, it, vi } from 'vitest'
import { createHomeworkImageModel, detectHomeworkImageMime } from '../src/homework-review'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02])

describe('homework image review model', () => {
  it('recognizes only supported image signatures', () => {
    expect(detectHomeworkImageMime(png)).toBe('image/png')
    expect(detectHomeworkImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x01]))).toBe('image/jpeg')
    expect(detectHomeworkImageMime(Buffer.from('RIFFxxxxWEBPdata'))).toBe('image/webp')
    expect(detectHomeworkImageMime(Buffer.from('<svg><script>'))).toBeNull()
    expect(detectHomeworkImageMime(Buffer.from('not an image'))).toBeNull()
  })

  it('is disabled when no vision model is configured', async () => {
    const model = createHomeworkImageModel({})
    expect(model.enabled).toBe(false)
    await expect(model.review(png, 'image/png')).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE', status: 503 })
  })

  it('sends a data URL to the configured OpenAI-compatible vision endpoint', async () => {
    let sentUrl = '', sentBody = '', sentAuthorization = ''
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      sentUrl = String(input)
      sentBody = String(init?.body ?? '')
      sentAuthorization = new Headers(init?.headers).get('authorization') ?? ''
      return new Response(JSON.stringify({ choices: [{ message: { content: '第1题：步骤正确。请继续核对单位。' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const model = createHomeworkImageModel({
      HOMEWORK_MODEL_BASE_URL: 'http://127.0.0.1:9000/v1',
      HOMEWORK_MODEL_NAME: 'vision-demo',
      HOMEWORK_MODEL_TIMEOUT_MS: '3000'
    }, transport as unknown as typeof fetch)

    expect(model.enabled).toBe(true)
    await expect(model.review(png, 'image/png')).resolves.toContain('步骤正确')
    expect(sentUrl).toBe('http://127.0.0.1:9000/v1/chat/completions')
    expect(JSON.parse(sentBody).messages[1].content[1].image_url.url).toBe('data:image/png;base64,' + png.toString('base64'))
    expect(sentAuthorization).toBe('')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('does not return a model response that contains a phone number', async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '请联系13800138000咨询。' } }] }), { status: 200 }))
    const model = createHomeworkImageModel({
      HOMEWORK_MODEL_BASE_URL: 'http://localhost:9000/v1',
      HOMEWORK_MODEL_NAME: 'vision-demo'
    }, transport as unknown as typeof fetch)
    await expect(model.review(png, 'image/png')).rejects.toMatchObject({ code: 'MODEL_UPSTREAM', status: 502 })
  })
})
