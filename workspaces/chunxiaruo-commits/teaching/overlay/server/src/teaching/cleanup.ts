import type {Prisma,PrismaClient} from '@prisma/client'
import {unlink,mkdir,lstat,readdir} from 'node:fs/promises'
import {join} from 'node:path'
import type {TeachingOptions} from './types'
import {writeTransaction} from './quota'
export function storagePath(root:string,key:string,partial=false){
 if(!/^[a-f0-9]{48}$/.test(key))throw new Error('Invalid storage key')
 return join(root,key+(partial?'.part':''))
}
export async function ensureUploadRoot(root:string){
 await mkdir(root,{recursive:true})
 if((await lstat(root)).isSymbolicLink())throw new Error('上传目录不能是符号链接')
}
export async function discardUpload(db:PrismaClient,options:TeachingOptions,id:string,validate?:(tx:Prisma.TransactionClient,row:Prisma.TeachingAttachmentGetPayload<{include:{lessonBinding:true;submissionBinding:true}}>|null)=>Promise<void>){
 const removed=await writeTransaction(db,async tx=>{
  const row=await tx.teachingAttachment.findUnique({where:{id},include:{lessonBinding:true,submissionBinding:true}})
  await validate?.(tx,row)
  if(!row||row.lessonBinding||row.submissionBinding)return null
  const deleted=await tx.teachingAttachment.deleteMany({where:{id,lessonBinding:null,submissionBinding:null}})
  if(!deleted.count)return null
  if(row.reservedBytes)await tx.uploadQuota.updateMany({where:{userId:row.ownerId,day:row.quotaDate,reservedBytes:{gte:row.reservedBytes}},data:{reservedBytes:{decrement:row.reservedBytes}}})
  return row
 })
 if(removed)for(const partial of [false,true])await unlink(storagePath(options.uploadRoot,removed.storageKey,partial)).catch(e=>{if(e.code!=='ENOENT')throw e})
 return removed
}
export async function cleanupUploads(db:PrismaClient,options:TeachingOptions,{recover=false}={}){
 await ensureUploadRoot(options.uploadRoot)
 const rows=await db.teachingAttachment.findMany({where:{lessonBinding:null,submissionBinding:null,OR:[{uploadState:'ready',expiresAt:{lt:options.now()}},...(recover?[{uploadState:'uploading'}]:[])]}})
 let removed=0,recovered=0
 for(const row of rows)if(await discardUpload(db,options,row.id)){removed++;if(row.uploadState==='uploading')recovered++}
 // A crash can occur between committing metadata deletion and unlinking its file.
 // Only old regular files with our random-key format and no current DB owner qualify.
 const cutoff=options.now().getTime()-24*3600000
 for(const name of await readdir(options.uploadRoot)){
  const match=/^([a-f0-9]{48})(\.part)?$/.exec(name)
  if(!match)continue
  const path=storagePath(options.uploadRoot,match[1],Boolean(match[2]))
  const stat=await lstat(path).catch(()=>null)
  if(!stat?.isFile()||stat.mtimeMs>=cutoff)continue
  if(await db.teachingAttachment.findUnique({where:{storageKey:match[1]},select:{id:true}}))continue
  await unlink(path).catch(e=>{if(e.code!=='ENOENT')throw e});removed++
 }
 return{removed,recovered}
}

