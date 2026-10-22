import type {Prisma,PrismaClient} from '@prisma/client'
import type {FastifyRequest} from 'fastify'
import {actor,fail} from '../core'
export type Db=PrismaClient|Prisma.TransactionClient
export async function requireBooking(request:FastifyRequest,db:Db,bookingId:string,mode:'read'|'draft'|'submit'='read') {
 const auth=await actor(request,db as PrismaClient,['parent','tutor'])
 if(mode==='draft'&&auth.user.role!=='tutor'||mode==='submit'&&auth.user.role!=='parent')return fail('FORBIDDEN',403,'当前身份无权操作')
 const booking=await db.booking.findUnique({where:{id:bookingId},include:{tutorProfile:true}})
 if(!booking||(auth.user.role==='parent'?booking.parentId!==auth.user.id:booking.tutorProfile.userId!==auth.user.id))return fail('NOT_FOUND',404,'预约不存在')
 if(mode==='draft'&&booking.status!=='accepted')return fail('CONFLICT',409,'当前预约不能发布或编辑课次')
 if(mode==='submit'&&!['accepted','completed'].includes(booking.status))return fail('CONFLICT',409,'当前预约不能提交作业')
 return{...auth,booking,tutorUserId:booking.tutorProfile.userId}
}
export async function requireLesson(request:FastifyRequest,db:Db,id:string,mode:'read'|'draft'|'submit'='read'){
 // Validate role before fetching, so the response does not disclose lesson existence.
 await actor(request,db as PrismaClient,['parent','tutor'])
 const lesson=await db.lesson.findUnique({where:{id}})
 if(!lesson)return fail('NOT_FOUND',404,'课次不存在')
 const access=await requireBooking(request,db,lesson.bookingId,mode)
 if(access.user.role==='parent'&&lesson.status!=='published')return fail('NOT_FOUND',404,'课次不存在')
 if(mode==='draft'&&lesson.status!=='draft')return fail('CONFLICT',409,'课次已发布，内容不能修改')
 if(mode==='submit'&&lesson.status!=='published')return fail('CONFLICT',409,'作业尚未发布')
 return{...access,lesson}
}

