import type {FastifyInstance,FastifyRequest} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {requireBooking} from '../teaching/access'
import {parse} from '../validation'
import {ApiError,fail} from '../core'
import {createLoop,applyCommand,parentView,type LoopState,type Command} from './engine'
import {LoopError} from './types'
import {createTeachingModel,type TeachingModel} from './model'
const commandSchema=z.object({requestId:z.string().min(8).max(100),expectedRevision:z.number().int().min(0),type:z.enum(['initialize','saveDraft','discardDraft','publish','record','feedback','editFeedback','publishFeedback','suggest','applyRevision','rejectRevision']),payload:z.record(z.unknown())}).strict()
const generationSchema=z.object({kind:z.enum(['course','feedback','revision']),requestId:z.string().min(8).max(100),expectedRevision:z.number().int().min(0)}).strict()
function bookingId(r:FastifyRequest){return parse(z.object({bookingId:z.string().min(1).max(100)}).strict(),r.params).bookingId}
async function load(db:Pick<PrismaClient,'teachingLoop'>,id:string){const row=await db.teachingLoop.findUnique({where:{bookingId:id}});return row?JSON.parse(row.stateJson) as LoopState:createLoop(id)}
function translate(error:unknown):never{if(error instanceof LoopError)throw new ApiError(error.code,error.code==='INVALID'?400:409,error.message);throw error}
export async function registerLoopRoutes(app:FastifyInstance,db:PrismaClient,model:TeachingModel=createTeachingModel()){
 const attempts=new Map<string,{n:number;until:number}>()
 function limit(key:string,max:number){const now=Date.now(),old=attempts.get(key),row=old&&old.until>now?old:{n:0,until:now+60000};row.n++;attempts.set(key,row);if(attempts.size>10000){for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);if(attempts.size>10000)return fail('RATE_LIMIT',429,'请求过多，请稍后重试')}if(row.n>max)return fail('RATE_LIMIT',429,'教学模型请求过于频繁，请稍后再试')}
 async function write(request:FastifyRequest,id:string,command:Command){
  try{return await db.$transaction(async tx=>{
   await requireBooking(request,tx,id,'draft')
   const old=await tx.teachingLoop.findUnique({where:{bookingId:id}}),state=old?JSON.parse(old.stateJson)as LoopState:createLoop(id)
   const next=applyCommand(state,command,new Date().toISOString())
   if(next.revision===state.revision)return next
   if(JSON.stringify(next).length>2_000_000)return fail('INVALID',400,'教学历史较大，请改用其他演示预约')
   if(old){const updated=await tx.teachingLoop.updateMany({where:{bookingId:id,revision:state.revision,booking:{status:'accepted'}},data:{revision:next.revision,stateJson:JSON.stringify(next)}});if(updated.count!==1)return fail('CONFLICT',409,'教学内容或预约已变化，请刷新')}
   else await tx.teachingLoop.create({data:{bookingId:id,revision:next.revision,stateJson:JSON.stringify(next)}})
   return next
  })}catch(e){translate(e)}
 }
 app.get('/api/bookings/:bookingId/teaching-loop',async request=>{
  const id=bookingId(request),access=await requireBooking(request,db,id),state=await load(db,id)
  return{data:{...(access.user.role==='parent'?parentView(state):state),modelEnabled:model.enabled}}
 })
 app.post('/api/bookings/:bookingId/teaching-loop',{bodyLimit:180000},async request=>{
  const id=bookingId(request);await requireBooking(request,db,id,'draft');const command=parse(commandSchema,request.body)as Command
  if(command.payload.source==='model'||command.payload.feedback?.source==='model'||command.payload.suggestion?.source==='model')return fail('INVALID',400,'模型来源只能由服务端实际调用写入')
  return{data:{...await write(request,id,command),modelEnabled:model.enabled}}
 })
 app.post('/api/bookings/:bookingId/teaching-loop/generate',{bodyLimit:10000},async request=>{
  const id=bookingId(request),access=await requireBooking(request,db,id,'draft'),body=parse(generationSchema,request.body),state=await load(db,id)
  const receipt=state.receipts.find(r=>r.id===body.requestId)
  if(receipt){const old=JSON.parse(receipt.command),types={course:'saveDraft',feedback:'feedback',revision:'suggest'};const source=old.payload?.source??old.payload?.feedback?.source??old.payload?.suggestion?.source;if(old.type!==types[body.kind]||source!=='model'||old.expectedRevision!==body.expectedRevision)return fail('CONFLICT',409,'请求标识对应其他生成操作');return{data:{...state,modelEnabled:model.enabled}}}
  if(state.revision!==body.expectedRevision)return fail('CONFLICT',409,'内容已更新，请刷新再生成')
  if(!model.enabled)return fail('MODEL_UNAVAILABLE',503,'教学模型未配置，可选择预置演示课程或样例反馈')
  limit('user:'+access.user.id,6);limit('ip:'+request.ip,20)
  try{
   const command=await model.generate(body.kind,state,new Date().toISOString())
   const result=await write(request,id,{...command,requestId:body.requestId,expectedRevision:body.expectedRevision})
   return{data:{...result,modelEnabled:model.enabled}}
  }catch(e){translate(e)}
 })
}
