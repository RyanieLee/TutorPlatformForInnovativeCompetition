import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { actor,ApiError,fail } from './core'
import { parse } from './validation'
import { containsPersonalInfo } from './match-model'
import { platformAssistantInstructions } from './platform-assistant-guide'
export const chatSchema=z.object({messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(500)}).strict()).min(1).max(9)}).strict().superRefine((v,c)=>{
 if(v.messages.length%2!==1||v.messages.some((m,i)=>m.role!==(i%2===0?'user':'assistant')))c.addIssue({code:'custom',message:'对话应由用户开始并以用户消息结束'})
 if(v.messages.some(m=>m.role==='user'&&containsPersonalInfo(m.content)))c.addIssue({code:'custom',message:'请勿在对话中填写姓名、联系方式或地址'})
})
export type ChatMessage=z.infer<typeof chatSchema>['messages'][number]
export interface ChatModel{enabled:boolean;reply(messages:ChatMessage[]):Promise<string>}
const actualPersonalInfo=/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{17}[\dxX])/i
export function createChatModel(env:Record<string,string|undefined>=process.env,transport:typeof fetch=fetch):ChatModel{
 const off={enabled:false,reply:async()=>{throw new ApiError('MODEL_UNAVAILABLE',503,'对话模型尚未配置，可使用本机演示助手')}}
 const base=env.MATCH_MODEL_BASE_URL?.trim(),name=env.MATCH_MODEL_NAME?.trim(),key=env.MATCH_MODEL_API_KEY?.trim()
 if(!base||!name)return off
 const url=new URL(base),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname)
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&local))||url.username||url.password||url.search||url.hash)throw new Error('对话模型地址必须是无凭据HTTPS或本机HTTP')
 if(!local&&!key)return off
 const endpoint=new URL(url.pathname.replace(/\/+$/,'')+'/chat/completions',url.origin).toString()
 return {enabled:true,async reply(messages){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(30000,Math.max(1000,Number(env.CHAT_MODEL_TIMEOUT_MS)||15000)))
  try{
   const response=await transport(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify({model:name,temperature:.3,max_tokens:700,messages:[{role:'system',content:platformAssistantInstructions,...messages]})})
   if(!response.ok||!response.body||Number(response.headers.get('content-length'))>32768){await response.body?.cancel();throw new Error('upstream')}
   const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0
   try{while(true){const c=await reader.read();if(c.done)break;size+=c.value.byteLength;if(size>32768){await reader.cancel();throw new Error('oversize')}raw+=decoder.decode(c.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
   const text=JSON.parse(raw)?.choices?.[0]?.message?.content
   if(typeof text!=='string'||!text.trim()||text.length>3000||actualPersonalInfo.test(text))throw new Error('invalid reply')
   return text.trim()
  }catch(error){throw new ApiError('MODEL_UPSTREAM',controller.signal.aborted?504:502,controller.signal.aborted?'对话超时，请重试':'对话服务暂不可用，请重试或主动切换本机演示')}
  finally{clearTimeout(timer)}
 }}
}
export function registerAssistant(app:FastifyInstance,db:PrismaClient,model:ChatModel){
 const users=new Map<string,{n:number;at:number}>(),ips=new Map<string,{n:number;at:number}>()
 function count(store:typeof users,key:string,now:number){const old=store.get(key),v=old&&now-old.at<60000?old:{n:0,at:now};v.n++;store.set(key,v);if(store.size>10000){for(const [k,e]of store)if(now-e.at>=60000)store.delete(k);while(store.size>10000)store.delete(store.keys().next().value!)}return v.n}
 app.get('/api/assistant/status',async()=>({data:{enabled:model.enabled}}))
 app.post('/api/assistant/chat',async request=>{
  const {user}=await actor(request,db,['parent','tutor','admin'])
  const input=parse(chatSchema,request.body)
  if(!model.enabled)return fail('MODEL_UNAVAILABLE',503,'对话模型尚未配置，可主动使用本机演示助手')
  const now=Date.now(),u=count(users,user.id,now),ip=count(ips,request.ip,now)
  if(u>10||ip>30)return fail('RATE_LIMIT',429,'对话过于频繁，请稍后再试')
  return {data:{reply:await model.reply(input.messages),source:'model'}}
 })
}
