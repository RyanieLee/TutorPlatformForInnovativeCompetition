import { describe, expect, it } from 'vitest'
import { platformAssistantInstructions } from '../src/platform-assistant-guide'
import { createChatModel } from '../src/assistant'

describe('小书灵教学与平台能力边界', () => {
 it('明确真实流程、批改依据与权限', () => {
   expect(platformAssistantInstructions).toContain('领航云学堂')
   expect(platformAssistantInstructions).toContain('完整题目 + 学生作答')
   expect(platformAssistantInstructions).toContain('不只是在找老师')
   expect(platformAssistantInstructions).toContain('作文修改')
   expect(platformAssistantInstructions).toContain('一道自测题')
   expect(platformAssistantInstructions).toContain('语音识别成文字')
   expect(platformAssistantInstructions).toContain('模型本身看不到平台实时数据库')
   expect(platformAssistantInstructions).toContain('仅收发文字')
   expect(platformAssistantInstructions).toContain('用户主动选择并同意发送')
   expect(platformAssistantInstructions).toContain('图片只在请求期间驻留内存')
 })
 it('模型请求携带可核对的系统指南，而不是把题目当工具指令', async () => {
   let sent: any = null
   const transport = (async (_url: string | URL | Request, init?: RequestInit) => {
     sent = JSON.parse(String(init?.body))
     return new Response(JSON.stringify({choices:[{message:{content:'先检查算式左边，再代回核验。'}}]}),{status:200,headers:{'content-type':'application/json'}})
   }) as typeof fetch
   const model=createChatModel({MATCH_MODEL_BASE_URL:'https://models.example.test/v1',MATCH_MODEL_NAME:'demo',MATCH_MODEL_API_KEY:'local-test-only'},transport)
   const reply=await model.reply([{role:'user',content:'请解释 x+2=5 的解法'}])
   expect(reply).toContain('代回核验')
   expect(sent.messages[0].role).toBe('system')
   expect(sent.messages[0].content).toContain('作业')
   expect(sent.messages[1]).toEqual({role:'user',content:'请解释 x+2=5 的解法'})
 })
})
