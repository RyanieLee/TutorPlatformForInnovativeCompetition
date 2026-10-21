import type { FastifyInstance } from 'fastify'
import type { PrismaClient,Prisma } from '@prisma/client'
import { actor } from './core'
import { bookingListQuery,parse } from './validation'
/** 地图专用投影：不返回学生称呼、家长ID、联系方式、备注或精确坐标。 */
export function registerOrderMap(app:FastifyInstance,db:PrismaClient){
 app.get('/api/bookings/map',async request=>{
  const {user}=await actor(request,db,['parent','tutor','admin'])
  const q=parse(bookingListQuery,request.query)
  const scope:Prisma.BookingWhereInput=user.role==='parent'?{parentId:user.id}:user.role==='tutor'?{tutorProfile:{userId:user.id}}:{}
  const where:Prisma.BookingWhereInput={...scope,...(q.status?{status:q.status}:{})}
  const [total,rows]=await db.$transaction([
   db.booking.count({where}),
   db.booking.findMany({where,select:{id:true,subject:true,status:true,areaLabel:true,expectedTime:true,createdAt:true,updatedAt:true,tutorProfile:{select:{id:true,displayName:true,teachingMode:true,pricePerHour:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return {data:{items:rows.map(b=>({id:b.id,subject:b.subject,status:b.status,areaLabel:b.areaLabel,tutorId:b.tutorProfile.id,tutorName:b.tutorProfile.displayName,teachingMode:b.tutorProfile.teachingMode,referencePrice:b.tutorProfile.pricePerHour,expectedTime:b.expectedTime,createdAt:b.createdAt.toISOString(),updatedAt:b.updatedAt.toISOString()})),meta:{total,page:q.page,pageSize:q.pageSize},scope:user.role,serverTime:new Date().toISOString()}}
 })
}
