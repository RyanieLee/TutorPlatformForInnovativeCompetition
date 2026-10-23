import {randomUUID} from 'node:crypto'
import type {FastifyInstance,FastifyRequest} from 'fastify'
import type {PrismaClient,Prisma} from '@prisma/client'
import {z} from 'zod'
import type {ChatModel} from '../assistant'
import {actor,ApiError,fail} from '../core'
import {parse} from '../validation'
import {containsPersonalInfo} from '../match-model'
import type {ArchiveState,ArchiveBooking,ArchiveContext,ArchiveCommand,ArchiveAnalysis} from '../shared/student-archive'
import {ArchiveError,createArchive,applyArchiveCommand,projectArchive,archiveFingerprint,SAMPLE_ANALYSIS} from '../shared/student-archive-engine'
import {generateArchiveAnalysis} from './model'
type DB=PrismaClient|Prisma.TransactionClient
const createSchema=z.object({nickname:z.string().trim().min(1).max(40),grade:z.string().trim().min(1).max(40),goals:z.string().trim().max(1000),requestId:z.string().min(8).max(100)}).strict()
const commandSchema=z.object({requestId:z.string().min(8).max(100),expectedRevision:z.number().int().min(0),type:z.string().max(40),payload:z.record(z.unknown())}).strict()
function translate(e:unknown):never{if(e instanceof ArchiveError)throw new ApiError(e.code,e.code==='INVALID'?400:e.code==='NOT_FOUND'?404:e.code==='FORBIDDEN'?403:409,e.message);if(e&&typeof e==='object'&&'code'in e&&['P2002','P2034','P2028'].includes(String(e.code)))throw new ApiError('CONFLICT',409,'档案或预约已变化，请刷新');throw e}
async function wrap<T>(fn:()=>Promise<T>):Promise<T>{try{return await fn()}catch(e){return translate(e)}}
function id(request:FastifyRequest){return parse(z.object({id:z.string().min(1).max(100)}).strict(),request.params).id}
async function bookings(db:DB,parentId:string):Promise<ArchiveBooking[]>{const rows=await db.booking.findMany({where:{parentId},include:{tutorProfile:{select:{userId:true,displayName:true}},archiveBinding:true},take:1000,orderBy:{createdAt:'desc'}});return rows.map(b=>({id:b.id,parentId:b.parentId,teacherId:b.tutorProfile.userId,teacherName:b.tutorProfile.displayName,subject:b.subject,status:b.status,...(b.archiveBinding?{archiveId:b.archiveBinding.archiveId}:{})}))}
async function load(db:DB,archiveId:string){const row=await db.studentArchive.findUnique({where:{id:archiveId}});if(!row)return fail('NOT_FOUND',404,'未找到学生档案');return{row,state:JSON.parse(row.stateJson) as ArchiveState}}
async function context(db:DB,state:ArchiveState,user:{id:string;role:string}):Promise<ArchiveContext>{return{actor:{id:user.id,role:user.role},bookings:await bookings(db,state.parentId),now:new Date().toISOString()}}
async function submission(db:DB,state:ArchiveState,command:ArchiveCommand){if(command.type!=='createReview'||!command.payload.submissionId)return undefined;const input=command.payload,row=await db.homeworkSubmission.findUnique({where:{id:input.submissionId},include:{lesson:{select:{bookingId:true}}}});if(!row||row.parentId!==state.parentId||row.lesson.bookingId!==input.bookingId||!state.bookingIds.includes(row.lesson.bookingId))return fail('NOT_FOUND',404,'未找到该预约的本人作业提交');return row.id}
/** Each transaction reloads current sessions, bookings, revision and source ownership. */
export function registerStudentArchives(app:FastifyInstance,db:PrismaClient,model:ChatModel){
 const requests=new Map<string,{n:number;until:number}>()
 function limit(key:string){const now=Date.now();for(const[k,v]of requests)if(v.until<=now)requests.delete(k);const old=requests.get(key)??{n:0,until:now+60000};if(++old.n>6)return fail('RATE_LIMIT',429,'学习模型请求过于频繁，请稍后再试');if(requests.size>=10000&&!requests.has(key))return fail('RATE_LIMIT',429,'服务繁忙，请稍后重试');requests.set(key,old)}
 const dto=(state:ArchiveState,c:ArchiveContext)=>({...projectArchive(state,c),modelEnabled:model.enabled})
 app.get('/api/student-archives/bookings',async request=>wrap(async()=>{const{user}=await actor(request,db,['parent','tutor']);if(user.role==='parent')return{data:await bookings(db,user.id)};const rows=await db.booking.findMany({where:{tutorProfile:{userId:user.id}},include:{tutorProfile:{select:{userId:true,displayName:true}},archiveBinding:true},take:1000,orderBy:{createdAt:'desc'}});return{data:rows.map(b=>({id:b.id,parentId:b.parentId,teacherId:user.id,teacherName:b.tutorProfile.displayName,subject:b.subject,status:b.status,...(b.archiveBinding?{archiveId:b.archiveBinding.archiveId}:{})}))}}))
 app.get('/api/student-archives',async request=>wrap(async()=>{const{user}=await actor(request,db,['parent','tutor']);const rows=await db.studentArchive.findMany({where:user.role==='parent'?{parentId:user.id}:{bookings:{some:{booking:{tutorProfile:{userId:user.id}}}}},take:300,orderBy:{createdAt:'desc'}});const result=[];for(const row of rows){const state=JSON.parse(row.stateJson) as ArchiveState;const view=dto(state,await context(db,state,user));result.push({id:view.id,nickname:view.nickname,grade:view.grade,goals:view.goals,revision:view.revision,access:view.access,createdAt:view.createdAt,bookings:view.bookings,trials:[],modelEnabled:view.modelEnabled})}return{data:result}}))
 app.post('/api/student-archives',{bodyLimit:10000},async request=>wrap(async()=>{const input=parse(createSchema,request.body),fingerprint=archiveFingerprint(input);return db.$transaction(async tx=>{const{user}=await actor(request,tx as PrismaClient,['parent']),old=await tx.studentArchive.findUnique({where:{parentId_requestId:{parentId:user.id,requestId:input.requestId}}});if(old){if(old.requestFingerprint!==fingerprint)return fail('CONFLICT',409,'请求标识已用于其他学生资料');const state=JSON.parse(old.stateJson)as ArchiveState;return{data:dto(state,await context(tx,state,user))}}if(await tx.studentArchive.count({where:{parentId:user.id}})>=30)return fail('INVALID',400,'最多创建30个学生档案');const state=createArchive(randomUUID(),user.id,input,new Date().toISOString());await tx.studentArchive.create({data:{id:state.id,parentId:user.id,requestId:input.requestId,requestFingerprint:fingerprint,stateJson:JSON.stringify(state)}});return{data:dto(state,await context(tx,state,user))}})}))
 app.get('/api/student-archives/:id',async request=>wrap(async()=>{const{user}=await actor(request,db,['parent','tutor']),{state}=await load(db,id(request));return{data:dto(state,await context(db,state,user))}}))
 app.post('/api/student-archives/:id/actions',{bodyLimit:100000},async request=>wrap(async()=>{
  const archiveId=id(request),command=parse(commandSchema,request.body) as ArchiveCommand
  const {user}=await actor(request,db,['parent','tutor']),{state}=await load(db,archiveId),c=await context(db,state,user)
  projectArchive(state,c)
  const validatedSubmissionId=await submission(db,state,command)
  // Preflight performs the same bounded validation and authorization without persisting.
  const preflight=applyArchiveCommand(state,command,{...c,generatedAnalysis:SAMPLE_ANALYSIS,validatedSubmissionId})
  let analysis:ArchiveAnalysis|undefined
  if(command.type==='createReview'&&preflight!==state){
   const input=command.payload
   if([input.question,input.answer,input.referenceAnswer].some(containsPersonalInfo))return fail('INVALID',400,'请移除学习文字中的姓名、联系方式或住址')
   if(input.mode==='model'){limit(user.id);analysis=await generateArchiveAnalysis(model,input)}else analysis=SAMPLE_ANALYSIS
  }
  return db.$transaction(async tx=>{
   const{user:currentUser}=await actor(request,tx as PrismaClient,['parent','tutor']),{state:current}=await load(tx,archiveId),currentContext=await context(tx,current,currentUser)
   const sourceId=await submission(tx,current,command)
   const next=applyArchiveCommand(current,command,{...currentContext,generatedAnalysis:analysis??SAMPLE_ANALYSIS,validatedSubmissionId:sourceId})
   if(next===current)return{data:dto(current,currentContext)}
   if(command.type==='createReview'&&command.payload.mode==='model'&&!model.enabled)return fail('MODEL_UNAVAILABLE',503,'模型配置已停用，请刷新')
   // Capacity must never prevent a guardian from closing an existing grant.
   // Normal writes stop at 2 MB; revocation adds only bounded security receipts.
   if(command.type!=='revoke'&&Buffer.byteLength(JSON.stringify(next),'utf8')>2_000_000)return fail('INVALID',400,'档案内容已达容量上限，请另建档案')
   const updated=await tx.studentArchive.updateMany({where:{id:archiveId,revision:current.revision},data:{revision:next.revision,stateJson:JSON.stringify(next)}})
   if(updated.count!==1)return fail('CONFLICT',409,'档案已变化，请刷新')
   if(command.type==='bindBooking')await tx.archiveBooking.create({data:{archiveId,bookingId:command.payload.bookingId}})
   return{data:dto(next,currentContext)}
  })
 }))
}
