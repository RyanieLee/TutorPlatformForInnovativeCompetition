import type {PrismaClient,Prisma} from '@prisma/client'
import {fail} from '../core'
const queues=new WeakMap<PrismaClient,Promise<unknown>>()
export async function writeTransaction<T>(db:PrismaClient,work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 const prior=queues.get(db)??Promise.resolve()
 const task=prior.catch(()=>{}).then(async()=>{
  for(let attempt=0;;attempt++){
   try{return await db.$transaction(work,{maxWait:5000,timeout:10000})}
   catch(e){const code=(e as any)?.code;if(attempt>=4||!['P2034','P1008','P2028'].includes(code))throw e;await new Promise(r=>setTimeout(r,10*(attempt+1)))}
  }
 })
 queues.set(db,task.catch(()=>{}));return task
}
export const DAILY_LIMIT=500*1024*1024
export async function reserveBytes(db:PrismaClient,id:string,bytes:number){
 return writeTransaction(db,async tx=>{
  const row=await tx.teachingAttachment.findUniqueOrThrow({where:{id}})
  const where={userId_day:{userId:row.ownerId,day:row.quotaDate}}
  const q=await tx.uploadQuota.upsert({where,create:{userId:row.ownerId,day:row.quotaDate},update:{}})
  if(q.usedBytes+q.reservedBytes+bytes>DAILY_LIMIT)return fail('RATE_LIMIT',429,'今日上传量已达到500 MiB，请明天再试')
  await tx.uploadQuota.update({where,data:{reservedBytes:{increment:bytes}}})
  await tx.teachingAttachment.update({where:{id},data:{reservedBytes:{increment:bytes}}})
 })
}

