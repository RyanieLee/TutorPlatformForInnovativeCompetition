import type {FastifyRequest,FastifyReply} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {randomBytes} from 'node:crypto'
import {open,rename} from 'node:fs/promises'
import {createReadStream,constants} from 'node:fs'
import {actor,ApiError,fail} from '../core'
import {requireLesson} from './access'
import {reserveBytes,writeTransaction} from './quota'
import {ensureUploadRoot,storagePath,discardUpload} from './cleanup'
import {detectFileType} from './file-types'
import type {AttachmentPurpose,TeachingOptions} from './types'
export const MAX_FILE=20*1024*1024
export function attachmentDto(a:any){return{id:a.id,originalName:a.originalName,mediaType:a.mediaType,size:a.size,purpose:a.purpose,createdAt:a.createdAt}}
async function uploadAccess(request:FastifyRequest,db:any,id:string,purpose:AttachmentPurpose){
 return requireLesson(request,db,id,purpose==='submission'?'submit':'draft')
}
export async function receiveAttachment(request:FastifyRequest,db:PrismaClient,options:TeachingOptions,lessonId:string,purpose:AttachmentPurpose){
 const access=await uploadAccess(request,db,lessonId,purpose)
 await ensureUploadRoot(options.uploadRoot)
 let id:string|undefined,key='',name='',size=0,seen=false
 try{
  for await(const part of request.parts()){
   if(part.type!=='file'||part.fieldname!=='file'||seen)return fail('INVALID',400,'每次仅允许上传一个文件')
   seen=true;name=part.filename
   if(!name||name.length>200||/[\\/\x00-\x1f\x7f]/.test(name))return fail('INVALID',400,'文件名无效，请重命名')
   key=randomBytes(24).toString('hex')
   const row=await db.teachingAttachment.create({data:{lessonId,ownerId:access.user.id,purpose,originalName:name,storageKey:key,quotaDate:options.now().toISOString().slice(0,10),expiresAt:new Date(options.now().getTime()+24*3600000)}})
   id=row.id
   const file=await open(storagePath(options.uploadRoot,key,true),'wx',0o600)
   try{
    for await(const chunk of part.file){
     const bytes=Buffer.from(chunk);size+=bytes.length
     if(size>MAX_FILE)return fail('INVALID',413,'单个文件不能超过20 MiB')
     await reserveBytes(db,id!,bytes.length)
     let position=0;while(position<bytes.length)position+=(await file.write(bytes,position,bytes.length-position)).bytesWritten
    }
    if(part.file.truncated)return fail('INVALID',413,'单个文件不能超过20 MiB')
   }finally{await file.close()}
  }
  if(!id||size===0)return fail('INVALID',400,'请选择非空文件')
  const type=await detectFileType(storagePath(options.uploadRoot,key,true),name)
  await rename(storagePath(options.uploadRoot,key,true),storagePath(options.uploadRoot,key))
  return await writeTransaction(db,async tx=>{
   await uploadAccess(request,tx,lessonId,purpose)
   const row=await tx.teachingAttachment.findUniqueOrThrow({where:{id}})
   await tx.uploadQuota.update({where:{userId_day:{userId:row.ownerId,day:row.quotaDate}},data:{usedBytes:{increment:size},reservedBytes:{decrement:row.reservedBytes}}})
   return attachmentDto(await tx.teachingAttachment.update({where:{id},data:{size,mediaType:type.mediaType,uploadState:'ready',reservedBytes:0}}))
  })
 }catch(error){
  if(id)await discardUpload(db,options,id)
  if(error instanceof ApiError)throw error
  if((error as any)?.statusCode===413)return fail('INVALID',413,'单个文件不能超过20 MiB，且每次仅上传一个文件')
  throw error
 }
}
export async function streamAttachment(request:FastifyRequest,reply:FastifyReply,db:PrismaClient,options:TeachingOptions,id:string){
 const {user}=await actor(request,db,['parent','tutor'])
 const row=await db.teachingAttachment.findUnique({where:{id},include:{lessonBinding:true,submissionBinding:true}})
 if(!row||row.uploadState!=='ready')return fail('NOT_FOUND',404,'文件不存在')
 await requireLesson(request,db,row.lessonId)
 const bound=Boolean(row.lessonBinding||row.submissionBinding)
 if(!bound&&row.ownerId!==user.id)return fail('NOT_FOUND',404,'文件不存在')
 const path=storagePath(options.uploadRoot,row.storageKey)
 let file
 try{file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await file.stat();if(!stat.isFile())throw new Error('Not regular file')}
 catch{return fail('NOT_FOUND',404,'文件暂时无法读取')}
 const stream=file.createReadStream({autoClose:true})
 reply.header('content-type',row.mediaType).header('x-content-type-options','nosniff').header('cache-control','private, no-store').header('content-disposition',"attachment; filename=\"download\"; filename*=UTF-8''"+encodeURIComponent(row.originalName)).header('content-length',row.size)
 return reply.send(stream)
}

