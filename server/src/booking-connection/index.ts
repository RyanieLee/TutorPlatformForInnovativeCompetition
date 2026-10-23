import type {FastifyInstance,FastifyRequest} from 'fastify'
import type {PrismaClient,Prisma} from '@prisma/client'
import type {BookingMessage,ConnectionRole} from '../shared/booking-connection'
import {z} from 'zod'
import {actor,fail} from '../core'
import {parse} from '../validation'

const params=z.object({bookingId:z.string().min(1).max(100)}).strict()
const query=z.object({pageSize:z.coerce.number().int().min(1).max(50).default(20),beforeId:z.string().min(1).max(100).optional()}).strict()
const input=z.object({requestId:z.string().min(8).max(100).regex(/^[\w-]+$/),text:z.string().trim().min(1).max(1000)}).strict()
type Database=PrismaClient|Prisma.TransactionClient
const writable=(status:string)=>status==='pending'||status==='accepted'
const messageDto=(m:{id:string;senderRole:string;text:string;createdAt:Date}):BookingMessage=>({id:m.id,senderRole:m.senderRole as ConnectionRole,text:m.text,createdAt:m.createdAt.toISOString()})
async function access(request:FastifyRequest,db:Database,bookingId:string){
 const {user}=await actor(request,db as PrismaClient,['parent','tutor'])
 const booking=await db.booking.findFirst({where:{id:bookingId,...(user.role==='parent'?{parentId:user.id}:{tutorProfile:{userId:user.id}})},select:{id:true,status:true,areaLabel:true}})
 if(!booking)return fail('NOT_FOUND',404,'预约不存在或当前身份无权查看')
 return {user,booking}
}

/** 每次读写由服务端验证会话及预约双方。读取不会创建会话或消息。 */
export function registerBookingConnections(app:FastifyInstance,db:PrismaClient){
 app.get('/api/booking-connections/:bookingId/messages',async request=>{
  const {bookingId}=parse(params,request.params),q=parse(query,request.query)
  return db.$transaction(async tx=>{
   const {booking}=await access(request,tx,bookingId)
   const cursor=q.beforeId?await tx.bookingMessage.findFirst({where:{id:q.beforeId,bookingId},select:{id:true,createdAt:true}}):null
   if(q.beforeId&&!cursor)return fail('INVALID',400,'消息分页位置无效，请刷新记录')
   const rows=await tx.bookingMessage.findMany({where:{bookingId,...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:q.pageSize+1})
   const messages=rows.slice(0,q.pageSize)
   return {data:{bookingId,status:booking.status,canSend:writable(booking.status),areaLabel:booking.areaLabel,messages:messages.map(messageDto),nextBeforeId:rows.length>q.pageSize?messages[messages.length-1].id:null}}
  })
 })
 app.post('/api/booking-connections/:bookingId/messages',{bodyLimit:8192},async request=>{
  const {bookingId}=parse(params,request.params),body=parse(input,request.body)
  return db.$transaction(async tx=>{
   const {user,booking}=await access(request,tx,bookingId)
   if(!writable(booking.status))return fail('CONFLICT',409,'预约已结束，沟通记录仅可查看')
   const existing=await tx.bookingMessage.findUnique({where:{bookingId_senderId_requestId:{bookingId,senderId:user.id,requestId:body.requestId}}})
   if(existing){
    if(existing.text!==body.text)return fail('CONFLICT',409,'该请求编号已用于不同消息，请重新发送')
    return {data:messageDto(existing)}
   }
   const message=await tx.bookingMessage.create({data:{bookingId,senderId:user.id,senderRole:user.role,requestId:body.requestId,text:body.text}})
   return {data:messageDto(message)}
  })
 })
}
