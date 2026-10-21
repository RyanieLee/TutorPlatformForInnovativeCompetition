import type {FastifyRequest} from 'fastify'
import type {PrismaClient,Prisma} from '@prisma/client'
import {fail} from '../core'
import {parse} from '../validation'
import {requireBooking,requireLesson} from './access'
import {lessonCreate,lessonUpdate,pageQuery,fingerprint,publishSchema} from './validation'
import {writeTransaction} from './quota'
import type {TeachingOptions} from './types'
const attachmentSelect={id:true,originalName:true,mediaType:true,size:true,purpose:true,createdAt:true} as const
export function lessonDto(row:any){
 const {requestFingerprint,publishedFingerprint,requestId,...dto}=row
 if(dto.attachments)dto.attachments=dto.attachments.map((binding:any)=>binding.attachment)
 return dto
}
export const lessonInclude={attachments:{include:{attachment:{select:attachmentSelect}}}} as const
export async function getLesson(request:FastifyRequest,db:PrismaClient,id:string){
 const access=await requireLesson(request,db,id)
 const data=lessonDto(await db.lesson.findUniqueOrThrow({where:{id},include:lessonInclude}))
 if(access.user.role==='tutor'&&data.status==='draft')data.pendingAttachments=await db.teachingAttachment.findMany({where:{lessonId:id,ownerId:access.user.id,uploadState:'ready',lessonBinding:null,submissionBinding:null},select:attachmentSelect})
 return{data}
}
export async function publishLesson(request:FastifyRequest,db:PrismaClient,options:TeachingOptions,id:string){
 const body=parse(publishSchema,request.body)
 const ids=[...body.attachmentIds].sort(),hash=fingerprint({version:body.version,attachmentIds:ids})
 if(new Set(ids).size!==ids.length)return fail('INVALID',400,'不能重复选择同一个附件')
 return writeTransaction(db,async tx=>{
  const access=await requireLesson(request,tx,id)
  if(access.user.role!=='tutor')return fail('FORBIDDEN',403,'仅老师可以发布课次')
  const old=await tx.lesson.findUniqueOrThrow({where:{id},include:lessonInclude})
  if(old.status==='published'){
   if(old.publishedFingerprint!==hash)return fail('CONFLICT',409,'课次已发布且内容不同，请刷新')
   return{data:lessonDto(old)}
  }
  if(access.booking.status!=='accepted'||old.version!==body.version)return fail('CONFLICT',409,'课次或预约状态已改变，请刷新')
  if(old.dueAt&&old.dueAt<=options.now())return fail('INVALID',400,'作业截止时间必须晚于发布时间')
  const attachments=await tx.teachingAttachment.findMany({where:{id:{in:ids},lessonId:id,ownerId:access.user.id,uploadState:'ready',purpose:{in:['preview','homework']},expiresAt:{gt:options.now()},lessonBinding:null,submissionBinding:null}})
  if(attachments.length!==ids.length)return fail('INVALID',400,'附件不存在、已过期或不属于本课次')
  for(const purpose of ['preview','homework'])if(attachments.filter(a=>a.purpose===purpose).length>5)return fail('INVALID',400,'每组最多选择5个附件')
  const updated=await tx.lesson.updateMany({where:{id,status:'draft',version:body.version,booking:{status:'accepted'}},data:{status:'published',publishedAt:options.now(),version:{increment:1},publishedFingerprint:hash}})
  if(updated.count!==1)return fail('CONFLICT',409,'课次已发生变化，请刷新')
  for(const attachmentId of ids)await tx.lessonAttachment.create({data:{lessonId:id,attachmentId}})
  return{data:lessonDto(await tx.lesson.findUniqueOrThrow({where:{id},include:lessonInclude}))}
 })
}
export async function listLessons(request:FastifyRequest,db:PrismaClient,bookingId:string){
 const a=await requireBooking(request,db,bookingId),q=pageQuery(request.query)
 const where={bookingId,...(a.user.role==='parent'?{status:'published'}:{})}
 const [total,rows]=await db.$transaction([db.lesson.count({where}),db.lesson.findMany({where,include:lessonInclude,orderBy:[{scheduledAt:'asc'},{createdAt:'asc'},{id:'asc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})])
 return{data:rows.map(lessonDto),meta:{total,...q}}
}
export async function createLesson(request:FastifyRequest,db:PrismaClient,bookingId:string){
 const body=parse(lessonCreate,request.body),{requestId,...input}=body
 const normalized={...input,scheduledAt:new Date(input.scheduledAt).toISOString(),dueAt:input.dueAt?new Date(input.dueAt).toISOString():null}
 const hash=fingerprint(normalized)
 return db.$transaction(async tx=>{
  await requireBooking(request,tx,bookingId,'draft')
  const old=await tx.lesson.findUnique({where:{bookingId_requestId:{bookingId,requestId}},include:lessonInclude})
  if(old){if(old.requestFingerprint!==hash)return fail('CONFLICT',409,'请求标识对应其他课次内容');return{data:lessonDto(old)}}
  const row=await tx.lesson.create({data:{bookingId,requestId,requestFingerprint:hash,...normalized,scheduledAt:new Date(normalized.scheduledAt),dueAt:normalized.dueAt?new Date(normalized.dueAt):null},include:lessonInclude})
  return{data:lessonDto(row)}
 })
}
export async function saveLesson(request:FastifyRequest,db:PrismaClient,id:string){
 const {version,...input}=parse(lessonUpdate,request.body)
 return db.$transaction(async tx=>{
  await requireLesson(request,tx,id,'draft')
  const result=await tx.lesson.updateMany({where:{id,status:'draft',version,booking:{status:'accepted'}},data:{...input,scheduledAt:new Date(input.scheduledAt),dueAt:input.dueAt?new Date(input.dueAt):null,version:{increment:1}}})
  if(result.count!==1)return fail('CONFLICT',409,'课次内容已更新，请刷新后重试')
  return{data:lessonDto(await tx.lesson.findUniqueOrThrow({where:{id},include:lessonInclude}))}
 })
}
