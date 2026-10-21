import type {FastifyRequest} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {fail} from '../core'
import {parse} from '../validation'
import {requireLesson} from './access'
import {pageQuery,submissionSchema,fingerprint} from './validation'
import {writeTransaction} from './quota'
import {attachmentDto} from './files'
import type {TeachingOptions} from './types'
const include={attachments:{include:{attachment:true}}} as const
function dto(row:any){
 const {requestFingerprint,requestId,...rest}=row
 return{...rest,attachments:row.attachments.map((a:any)=>attachmentDto(a.attachment))}
}
export async function submitHomework(request:FastifyRequest,db:PrismaClient,options:TeachingOptions,lessonId:string){
 const body=parse(submissionSchema,request.body),ids=[...body.attachmentIds].sort()
 if(new Set(ids).size!==ids.length)return fail('INVALID',400,'不能重复提交同一个附件')
 const hash=fingerprint({lessonId,note:body.note,attachmentIds:ids})
 return writeTransaction(db,async tx=>{
  const access=await requireLesson(request,tx,lessonId)
  if(access.user.role!=='parent')return fail('FORBIDDEN',403,'请使用学生/家长账号提交作业')
  const old=await tx.homeworkSubmission.findUnique({where:{parentId_requestId:{parentId:access.user.id,requestId:body.requestId}},include})
  if(old){
   if(old.requestFingerprint!==hash)return fail('CONFLICT',409,'请求标识对应另一份作业，请刷新确认')
   return{data:dto(old)}
  }
  await requireLesson(request,tx,lessonId,'submit')
  const attachments=await tx.teachingAttachment.findMany({where:{id:{in:ids},lessonId,ownerId:access.user.id,purpose:'submission',uploadState:'ready',expiresAt:{gt:options.now()},lessonBinding:null,submissionBinding:null}})
  if(attachments.length!==ids.length)return fail('INVALID',400,'附件已使用、已过期或不属于本份作业，请重新上传')
  const latest=await tx.homeworkSubmission.aggregate({where:{lessonId},_max:{revision:true}})
  const submittedAt=options.now()
  const row=await tx.homeworkSubmission.create({data:{lessonId,parentId:access.user.id,requestId:body.requestId,requestFingerprint:hash,note:body.note,submittedAt,late:Boolean(access.lesson.dueAt&&submittedAt>access.lesson.dueAt),revision:(latest._max.revision??0)+1,attachments:{create:ids.map(attachmentId=>({attachmentId}))}},include})
  return{data:dto(row)}
 })
}
export async function listSubmissions(request:FastifyRequest,db:PrismaClient,lessonId:string){
 const access=await requireLesson(request,db,lessonId),q=pageQuery(request.query)
 const where={lessonId,parentId:access.booking.parentId}
 const [total,rows]=await db.$transaction([db.homeworkSubmission.count({where}),db.homeworkSubmission.findMany({where,include,orderBy:{revision:'desc'},skip:(q.page-1)*q.pageSize,take:q.pageSize})])
 return{data:rows.map(dto),meta:{total,...q}}
}

