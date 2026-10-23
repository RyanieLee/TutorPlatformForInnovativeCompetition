import { describe, expect, it, vi } from 'vitest'
import { chatSchema, createChatModel } from '../src/assistant'

const env={MATCH_MODEL_BASE_URL:'https://api.deepseek.com',MATCH_MODEL_NAME:'deepseek-flash',MATCH_MODEL_API_KEY:'fixture-secret-not-real'}
const question=[{role:'user' as const,content:'给我介绍一下二元一次方程组'}]
const response=(content:string,finish_reason='stop')=>new Response(JSON.stringify({choices:[{finish_reason,message:{content,reasoning_content:'internal reasoning is not an answer'}}]}))

describe('学习问答的真实供应商协议回归（不调用付费模型）',()=>{
 it('较长方程讲解成功返回，DeepSeek 普通助手显式关闭默认思考且增加回答预算',async()=>{
  const answer='二元一次方程组含两个未知数；可使用代入消元法和加减消元法。\n'.repeat(120)
  let sent:any
  const transport:typeof fetch=async(_url,init)=>{sent=JSON.parse(String(init?.body));return response(answer)}
  const result=await createChatModel(env,transport).reply(question)
  expect(result).toBe(answer.trim());expect(result.length).toBeGreaterThan(3000)
  expect(sent).toMatchObject({model:'deepseek-flash',thinking:{type:'disabled'}})
  expect(sent.max_tokens).toBeGreaterThan(700)
  expect(result).not.toContain('internal reasoning')
 })
 it('其他兼容服务不发送 DeepSeek 专属参数，也不自动切换管理员选定的模型',async()=>{
  let sent:any
  await createChatModel({...env,MATCH_MODEL_BASE_URL:'https://other.example/v1',MATCH_MODEL_NAME:'chosen-model'},async(_url,init)=>{sent=JSON.parse(String(init?.body));return response('可以使用消元法。')}).reply(question)
  expect(sent.model).toBe('chosen-model');expect(sent).not.toHaveProperty('thinking')
 })
 it('截断回答明确提示长度问题，不伪装完整答案、不泄露推理或自动产生第二次计费',async()=>{
  const transport=vi.fn<typeof fetch>(async()=>response('', 'length'))
  await expect(createChatModel(env,transport).reply(question)).rejects.toMatchObject({code:'MODEL_UPSTREAM',message:expect.stringContaining('长度上限')})
  expect(transport).toHaveBeenCalledTimes(1)
 })
 it.each([[401,'认证失败'],[402,'余额不足'],[429,'速率受限'],[422,'参数'],[503,'繁忙']])('上游 %s 返回可区分且脱敏的提示',async(status,message)=>{
  const transport:typeof fetch=async()=>new Response(env.MATCH_MODEL_API_KEY,{status:Number(status)})
  await expect(createChatModel(env,transport).reply(question)).rejects.toMatchObject({status:502,message:expect.stringContaining(String(message))})
 })
 it('超时由请求信号中止，不等待无限长时间',async()=>{
  vi.useFakeTimers()
  try{
   const transport:typeof fetch=async(_url,init)=>new Promise((_ok,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))
   const pending=expect(createChatModel({...env,CHAT_MODEL_TIMEOUT_MS:'1000'},transport).reply(question)).rejects.toMatchObject({status:504,message:expect.stringContaining('等待超时')})
   await vi.advanceTimersByTimeAsync(1000);await pending
  }finally{vi.useRealTimers()}
 })
 it('长回答可用于后续追问，用户输入仍有独立限长',()=>{
  expect(chatSchema.safeParse({messages:[...question,{role:'assistant',content:'消元法讲解。'.repeat(700)},...question]}).success).toBe(true)
  expect(chatSchema.safeParse({messages:[{role:'user',content:'题'.repeat(501)}]}).success).toBe(false)
  expect(chatSchema.safeParse({messages:[...question,{role:'assistant',content:'答'.repeat(12001)},...question]}).success).toBe(false)
 })
})
