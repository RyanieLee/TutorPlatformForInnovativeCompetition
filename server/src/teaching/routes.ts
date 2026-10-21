import type {FastifyInstance} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import multipart from '@fastify/multipart'
import {actor,fail} from '../core'
import {requireLesson} from './access'
import {parse} from '../validation'
import type {TeachingOptions} from './types'
import {idParam,purposeSchema} from './validation'
import {createLesson,getLesson,listLessons,saveLesson,publishLesson} from './lessons'
import {receiveAttachment,streamAttachment,MAX_FILE} from './files'
import {cleanupUploads,discardUpload} from './cleanup'
import {submitHomework,listSubmissions} from './submissions'
export async function registerTeachingRoutes(app:FastifyInstance,db:PrismaClient,options:TeachingOptions){
 await app.register(multipart,{limits:{fileSize:MAX_FILE,files:1,fields:0,parts:1}})
 app.addHook('onReady',async()=>{await cleanupUploads(db,options,{recover:true})})
 app.get('/api/bookings/:bookingId/lessons',r=>listLessons(r,db,idParam(r.params,'bookingId')))
 app.post('/api/bookings/:bookingId/lessons',{bodyLimit:131072},r=>createLesson(r,db,idParam(r.params,'bookingId')))
 app.get('/api/lessons/:lessonId',r=>getLesson(r,db,idParam(r.params,'lessonId')))
 app.put('/api/lessons/:lessonId',{bodyLimit:131072},r=>saveLesson(r,db,idParam(r.params,'lessonId')))
 app.post('/api/lessons/:lessonId/publish',r=>publishLesson(r,db,options,idParam(r.params,'lessonId')))
 app.post('/api/lessons/:lessonId/attachments',async r=>({data:await receiveAttachment(r,db,options,idParam(r.params,'lessonId'),parse(purposeSchema,r.query).purpose)}))
 app.delete('/api/attachments/:attachmentId',async r=>{
  const id=idParam(r.params,'attachmentId')
  await actor(r,db,['parent','tutor'])
  await discardUpload(db,options,id,async(tx,row)=>{
   const auth=await actor(r,tx as PrismaClient,['parent','tutor'])
   if(!row||row.ownerId!==auth.user.id)return fail('NOT_FOUND',404,'附件不存在')
   if(row.lessonBinding||row.submissionBinding||row.uploadState!=='ready')return fail('CONFLICT',409,'附件已提交或正在上传，不能移除')
   await requireLesson(r,tx,row.lessonId,row.purpose==='submission'?'submit':'draft')
  })
  return{data:{id}}
 })
 app.get('/api/attachments/:attachmentId/content',(r,reply)=>streamAttachment(r,reply,db,options,idParam(r.params,'attachmentId')))
 app.get('/api/lessons/:lessonId/submissions',r=>listSubmissions(r,db,idParam(r.params,'lessonId')))
 app.post('/api/lessons/:lessonId/submissions',r=>submitHomework(r,db,options,idParam(r.params,'lessonId')))
}
