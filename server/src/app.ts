import { createExamModel, examRequestSchema, type ExamModel } from './learning-model'
import { registerOrderMap } from './order-map'
import { registerAssistant, createChatModel, type ChatModel } from './assistant'
import Fastify from 'fastify'
import { resolve } from 'node:path'
import { registerTeachingRoutes } from './teaching/routes'
import type { TeachingOptions } from './teaching/types'
import cors from '@fastify/cors'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { actor, ApiError, audit, fail, hashPassword, newToken, publicUser, tokenHash, verifyPassword } from './core'
import { applicationSchema, bookingSchema, draftSchema, idParam, parse, reportSchema, bookingListQuery, applicationListQuery, reportListQuery, bookingStatuses, applicationStatuses, reportStatuses } from './validation'
import { application, booking, report, tutor } from './format'
import { containsPersonalInfo, createMatchModel, type MatchModel } from './match-model'

const include = { tutorProfile: true } as const
const rules = { accept: { from: ['pending'], to: 'accepted', role: 'tutor' }, reject: { from: ['pending'], to: 'rejected', role: 'tutor' }, cancel: { from: ['pending','accepted'], to: 'cancelled', role: 'parent' }, complete: { from: ['accepted'], to: 'completed', role: 'tutor' } } as const
const data = (input: z.infer<typeof applicationSchema>) => { const {subjects,...fields}=input;return {...fields,subjectsJson:JSON.stringify(subjects)} }

export function buildApp(db: PrismaClient = new PrismaClient(), matchModel: MatchModel = createMatchModel(), teachingOptions?: TeachingOptions, examModel: ExamModel = createExamModel(), chatModel: ChatModel = createChatModel()) {
 const app=Fastify({logger:process.env.NODE_ENV==='test'?false:{redact:['req.headers.authorization','req.body.password']},bodyLimit:32768})
 app.register(cors,{methods:['GET','HEAD','POST','PUT','DELETE','OPTIONS'],origin:(process.env.CORS_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim())})
 app.register(async child=>registerTeachingRoutes(child,db,teachingOptions??{uploadRoot:resolve(process.env.TEACHING_UPLOAD_ROOT||'./.teaching-uploads'),now:()=>new Date()}))
 registerOrderMap(app,db)
 registerAssistant(app,db,chatModel)
 const attempts=new Map<string,{count:number;resetAt:number}>()
 const ipAttempts=new Map<string,{count:number;resetAt:number}>()
 const modelUserAttempts=new Map<string,{count:number;resetAt:number}>()
 const modelIpAttempts=new Map<string,{count:number;resetAt:number}>()
 const examUserAttempts=new Map<string,{count:number;resetAt:number}>()
 const examIpAttempts=new Map<string,{count:number;resetAt:number}>()
 const dummyHash=hashPassword(newToken())
 function countAttempt(store:typeof attempts,key:string,now:number):number {
  const previous=store.get(key)
  const entry=previous&&previous.resetAt>now?previous:{count:0,resetAt:now+60000}
  entry.count++
  store.set(key,entry)
  if(store.size>10000){
   for(const [storedKey,value] of store)if(value.resetAt<=now)store.delete(storedKey)
   while(store.size>10000)store.delete(store.keys().next().value!)
  }
  return entry.count
 }
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof ApiError)return reply.status(error.status).send({error:{code:error.code,message:error.message}})
  if(error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500)return reply.status(error.statusCode).send({error:{code:'INVALID',message:'请求格式无效'}})
  if(error && typeof error === 'object' && 'code'in error && error.code==='P2002')return reply.status(409).send({error:{code:'CONFLICT',message:'记录已存在'}})
  if(error && typeof error === 'object' && 'code'in error && error.code==='P2034')return reply.status(409).send({error:{code:'CONFLICT',message:'数据已被其他操作更新，请刷新后重试'}})
  app.log.error(error);return reply.status(500).send({error:{code:'INTERNAL',message:'服务暂时不可用'}})
 })
 app.addHook('onClose',async()=>{await db.$disconnect()})
 app.setNotFoundHandler((_request,reply)=>reply.status(404).send({error:{code:'NOT_FOUND',message:'接口不存在'}}))
 app.get('/api/learning/status',async()=>({data:{enabled:examModel.enabled}}))
 app.post('/api/learning/exams',async request=>{
  const{user}=await actor(request,db)
  const input=parse(examRequestSchema,request.body)
  if(!examModel.enabled)return fail('MODEL_UNAVAILABLE',503,'尚未配置模型，可先使用原创示例试卷')
  const now=Date.now()
  const userCount=countAttempt(examUserAttempts,user.id,now),ipCount=countAttempt(examIpAttempts,request.ip,now)
  if(userCount>5||ipCount>15)return fail('RATE_LIMIT',429,'生成试卷过于频繁，请稍后重试')
  return{data:await examModel.generate(input)}
 })
 app.get('/health',async()=>{await db.$queryRaw`SELECT 1`;return{data:{status:'ok'}}})
 app.post('/api/auth/login',async request=>{
  const body=parse(z.object({loginId:z.string().min(1).max(80),password:z.string().min(1).max(200)}).strict(),request.body)
  const now=Date.now()
  const byIp=countAttempt(ipAttempts,request.ip,now)
  const byAccount=countAttempt(attempts,JSON.stringify([request.ip,body.loginId]),now)
  if(byIp>30||byAccount>5)return fail('RATE_LIMIT',429,'登录尝试过于频繁，请稍后重试')
  if(process.env.NODE_ENV==='production'&&body.loginId.startsWith('demo.'))return fail('UNAUTHORIZED',401,'账户或密码错误')
  const user=await db.user.findUnique({where:{loginId:body.loginId}})
  const passwordValid=await verifyPassword(body.password,user?.passwordHash??await dummyHash)
  if(!user||user.status!=='active'||!passwordValid)return fail('UNAUTHORIZED',401,'账户或密码错误')
  const token=newToken(),hours=Math.max(1,Math.min(168,Number(process.env.SESSION_HOURS)||24))
  const expiresAt=new Date(Date.now()+hours*3600000)
  await db.session.create({data:{userId:user.id,tokenHash:tokenHash(token),expiresAt}})
  return{data:{token,user:publicUser(user),expiresAt:expiresAt.toISOString()}}
 })
 app.get('/api/auth/me',async request=>({data:publicUser((await actor(request,db)).user)}))
 app.post('/api/auth/logout',async request=>{const{session}=await actor(request,db);await db.session.update({where:{id:session.id},data:{revokedAt:new Date()}});return{data:{ok:true}}})

 app.get('/api/match-assistant/status',async()=>({data:{enabled:matchModel.enabled}}))
 app.post('/api/match-assistant/parse',async request=>{
  const{user}=await actor(request,db,['parent'])
  if(!matchModel.enabled)return fail('MODEL_UNAVAILABLE',503,'模型解析尚未配置，请使用规则匹配表单')
  const{brief}=parse(z.object({brief:z.string().trim().min(6).max(160)}).strict(),request.body)
  if(containsPersonalInfo(brief))return fail('INVALID',400,'需求中不要填写姓名、联系方式或地址')
  const now=Date.now()
  if(countAttempt(modelUserAttempts,user.id,now)>10||countAttempt(modelIpAttempts,request.ip,now)>30)return fail('RATE_LIMIT',429,'模型解析请求过于频繁，请稍后重试')
  return{data:await matchModel.parse(brief)}
 })

 app.get('/api/tutors',async request=>{
  const q=parse(z.object({keyword:z.string().max(80).optional(),subject:z.string().max(30).optional(),teachingMode:z.enum(['线上','线下']).optional(),minPrice:z.coerce.number().min(0).max(2000).multipleOf(0.01).optional(),maxPrice:z.coerce.number().min(0).max(2000).multipleOf(0.01).optional(),page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)}).refine(q=>q.minPrice===undefined||q.maxPrice===undefined||q.minPrice<=q.maxPrice,{message:'最低价格不能高于最高价格'}),request.query)
  const keyword=q.keyword?.trim(),subject=q.subject?.trim()
  const where:Prisma.TutorProfileWhereInput={
   published:true,user:{status:'active',application:{status:'approved'}},
   ...(subject?{subjects:{some:{subject}}}:{}),
   ...(q.teachingMode?{teachingMode:{in:[q.teachingMode,'均可']}}:{}),
   ...((q.minPrice!==undefined||q.maxPrice!==undefined)?{pricePerHour:{...(q.minPrice!==undefined?{gte:Math.ceil(q.minPrice)}:{}),...(q.maxPrice!==undefined?{lte:Math.floor(q.maxPrice)}:{})}}:{}),
   ...(keyword?{OR:[{displayName:{contains:keyword}},{university:{contains:keyword}},{major:{contains:keyword}},{area:{contains:keyword}},{subjects:{some:{subject:{contains:keyword}}}}]}:{})
  }
  const [total,rows]=await db.$transaction([
   db.tutorProfile.count({where}),
   db.tutorProfile.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return{data:rows.map(tutor),meta:{total,page:q.page,pageSize:q.pageSize}}
 })
 app.get('/api/tutors/me',async request=>{const{user}=await actor(request,db,['tutor']);const p=await db.tutorProfile.findUnique({where:{userId:user.id}});return{data:p?tutor(p):null}})
 app.patch('/api/tutors/me',async request=>{
  const{user}=await actor(request,db,['tutor']),patch=parse(applicationSchema.partial(),request.body)
  const p=await db.tutorProfile.findUnique({where:{userId:user.id}})
  if(!p)return fail('NOT_FOUND',404,'请先创建入驻申请')
  const {subjects,...rest}=patch,fields={...rest,...(subjects?{subjectsJson:JSON.stringify(subjects)}:{})}
  const updated=await db.$transaction(async tx=>{
   const changed=await tx.tutorApplication.updateMany({where:{userId:user.id,status:{in:['draft','approved','rejected']}},data:{...fields,status:'draft',reviewedAt:null,rejectionReason:null}})
   if(changed.count!==1)return fail('CONFLICT',409,'审核期间不可修改资料')
   return tx.tutorProfile.update({where:{userId:user.id},data:{...fields,published:false,...(subjects?{subjects:{deleteMany:{},create:subjects.map(subject=>({subject}))}}:{})}})
  })
  return{data:tutor(updated)}
 })
 app.get('/api/tutors/:id',async request=>{const{id}=parse(idParam,request.params);const p=await db.tutorProfile.findFirst({where:{id,published:true,user:{status:'active',application:{status:'approved'}}}});if(!p)return fail('NOT_FOUND',404,'家教不存在');return{data:tutor(p)}})
 app.get('/api/tutor-applications/mine',async request=>{const{user}=await actor(request,db,['tutor']);const a=await db.tutorApplication.findUnique({where:{userId:user.id}});return{data:a?application(a):null}})
 app.put('/api/tutor-applications/draft',async request=>{
  const{user}=await actor(request,db,['tutor']),input=parse(draftSchema,request.body)
  const current=await db.tutorApplication.findUnique({where:{userId:user.id}})
  if(current?.status==='pending')return fail('CONFLICT',409,'审核期间不可修改资料')
  const {subjects,...fields}=input
  const row=await db.$transaction(async tx=>{
   let saved
   if(current){
    const changed=await tx.tutorApplication.updateMany({where:{userId:user.id,status:{in:['draft','approved','rejected']}},data:{...fields,subjectsJson:JSON.stringify(subjects),status:'draft',reviewedAt:null,rejectionReason:null}})
    if(changed.count!==1)return fail('CONFLICT',409,'审核期间不可修改资料')
    saved=await tx.tutorApplication.findUniqueOrThrow({where:{userId:user.id}})
   } else saved=await tx.tutorApplication.create({data:{userId:user.id,...fields,subjectsJson:JSON.stringify(subjects),status:'draft'}})
   if(current?.status==='approved')await tx.tutorProfile.update({where:{userId:user.id},data:{published:false}})
   return saved
  })
  return{data:application(row)}
 })
 app.post('/api/tutor-applications',async request=>{
  const{user}=await actor(request,db,['tutor']),input=parse(applicationSchema,request.body)
  const current=await db.tutorApplication.findUnique({where:{userId:user.id}})
  if(current&&['pending','approved'].includes(current.status))return fail('CONFLICT',409,'申请正在审核或已通过')
  const a=await db.$transaction(async tx=>{
   let row
   if(current){
    const changed=await tx.tutorApplication.updateMany({where:{userId:user.id,status:{in:['draft','rejected']}},data:{...data(input),status:'pending',rejectionReason:null,reviewedAt:null}})
    if(changed.count!==1)return fail('CONFLICT',409,'申请正在审核或已通过')
    row=await tx.tutorApplication.findUniqueOrThrow({where:{userId:user.id}})
   } else row=await tx.tutorApplication.create({data:{userId:user.id,...data(input),status:'pending'}})
   await tx.tutorProfile.upsert({where:{userId:user.id},create:{userId:user.id,...data(input),published:false,subjects:{create:input.subjects.map(subject=>({subject}))}},update:{...data(input),published:false,subjects:{deleteMany:{},create:input.subjects.map(subject=>({subject}))}}})
   await tx.auditLog.create({data:{actorId:user.id,action:'submit',entityType:'TutorApplication',entityId:row.id}});return row
  });return{data:application(a)}
 })
 app.get('/api/admin/tutor-applications',async request=>{
  await actor(request,db,['admin'])
  const q=parse(applicationListQuery,request.query)
  const where:Prisma.TutorApplicationWhereInput=q.status?{status:q.status}:{}
  const [total,rows]=await db.$transaction([
   db.tutorApplication.count({where}),
   db.tutorApplication.findMany({where,orderBy:[{updatedAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return{data:rows.map(application),meta:{total,page:q.page,pageSize:q.pageSize}}
 })
 app.get('/api/admin/overview',async request=>{
  await actor(request,db,['admin'])
  return db.$transaction(async tx=>{
   const applications=await tx.tutorApplication.groupBy({by:['status'],_count:{_all:true}})
   const bookings=await tx.booking.groupBy({by:['status'],_count:{_all:true}})
   const reports=await tx.report.groupBy({by:['status'],_count:{_all:true}})
   const published=await tx.tutorProfile.count({where:{published:true,user:{status:'active',application:{status:'approved'}}}})
   function counts(statuses:readonly string[],rows:{status:string;_count:{_all:number}}[]) {
    const result:Record<string,number>=Object.fromEntries(statuses.map(status=>[status,0]))
    result.total=0
    for(const row of rows){result.total+=row._count._all;if(statuses.includes(row.status))result[row.status]=row._count._all}
    return result
   }
   return{data:{applications:counts(applicationStatuses,applications),bookings:counts(bookingStatuses,bookings),reports:counts(reportStatuses,reports),tutors:{published}}}
  })
 })
 app.get('/api/admin/tutor-applications/:id',async request=>{await actor(request,db,['admin']);const{id}=parse(idParam,request.params),a=await db.tutorApplication.findUnique({where:{id}});if(!a)return fail('NOT_FOUND',404,'申请不存在');return{data:application(a)}})
 app.post('/api/admin/tutor-applications/:id/review',async request=>{
  const{user}=await actor(request,db,['admin']),{id}=parse(idParam,request.params)
  const body=parse(z.object({decision:z.enum(['approved','rejected']),reason:z.string().trim().max(500).optional()}).strict(),request.body)
  if(body.decision==='rejected'&&!body.reason)return fail('INVALID',400,'请填写驳回原因')
  const row=await db.$transaction(async tx=>{
   const changed=await tx.tutorApplication.updateMany({where:{id,status:'pending'},data:{status:body.decision,rejectionReason:body.decision==='rejected'?body.reason:null,reviewedAt:new Date()}})
   if(changed.count!==1)return null
   const a=await tx.tutorApplication.findUniqueOrThrow({where:{id}})
   await tx.tutorProfile.update({where:{userId:a.userId},data:{published:body.decision==='approved'}})
   await tx.auditLog.create({data:{actorId:user.id,action:body.decision,entityType:'TutorApplication',entityId:id}})
   return a
  })
  if(!row){if(!(await db.tutorApplication.findUnique({where:{id}})))return fail('NOT_FOUND',404,'申请不存在');return fail('CONFLICT',409,'申请已被处理')}
  return{data:application(row)}
 })

 app.post('/api/bookings',async request=>{
  const{user}=await actor(request,db,['parent']),input=parse(bookingSchema,request.body)
  const existing=input.requestId?await db.booking.findUnique({where:{parentId_requestId:{parentId:user.id,requestId:input.requestId}},include}):null
  const matches=(row:NonNullable<typeof existing>)=>row.tutorProfileId===input.tutorId&&row.studentName===input.studentName&&row.subject===input.subject&&row.expectedTime===input.expectedTime&&row.note===input.note&&(row.areaLabel??undefined)===input.areaLabel
  if(existing){if(!matches(existing))return fail('CONFLICT',409,'重复请求标识对应不同预约');return{data:booking(existing)}}
  const p=await db.tutorProfile.findFirst({where:{id:input.tutorId,published:true,user:{status:'active',application:{status:'approved'}}}})
  if(!p)return fail('NOT_FOUND',404,'家教不存在')
  if(!(JSON.parse(p.subjectsJson) as string[]).includes(input.subject))return fail('INVALID',400,'家教不提供该科目')
  let row
  try {
   row=await db.$transaction(async tx=>{
    const created=await tx.booking.create({data:{parentId:user.id,tutorProfileId:p.id,requestId:input.requestId,studentName:input.studentName,areaLabel:input.areaLabel,subject:input.subject,expectedTime:input.expectedTime,note:input.note},include})
    await audit(tx,user.id,'create','Booking',created.id)
    return created
   })
  } catch(error) {
   if(input.requestId&&error&&typeof error==='object'&&'code'in error&&error.code==='P2002'){
    const retried=await db.booking.findUnique({where:{parentId_requestId:{parentId:user.id,requestId:input.requestId}},include})
    if(retried){if(!matches(retried))return fail('CONFLICT',409,'重复请求标识对应不同预约');return{data:booking(retried)}}
   }
   throw error
  }
  return{data:booking(row)}
 })
 app.get('/api/bookings/mine',async request=>{
  const{user}=await actor(request,db,['parent']),q=parse(bookingListQuery,request.query)
  const where:Prisma.BookingWhereInput={parentId:user.id,...(q.status?{status:q.status}:{})}
  const [total,rows]=await db.$transaction([
   db.booking.count({where}),
   db.booking.findMany({where,include,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return{data:rows.map(booking),meta:{total,page:q.page,pageSize:q.pageSize}}
 })
 app.get('/api/bookings/received',async request=>{
  const{user}=await actor(request,db,['tutor']),q=parse(bookingListQuery,request.query)
  const where:Prisma.BookingWhereInput={tutorProfile:{userId:user.id},...(q.status?{status:q.status}:{})}
  const [total,rows]=await db.$transaction([
   db.booking.count({where}),
   db.booking.findMany({where,include,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return{data:rows.map(booking),meta:{total,page:q.page,pageSize:q.pageSize}}
 })
 app.get('/api/bookings/:id',async request=>{const{user}=await actor(request,db,['parent','tutor']),{id}=parse(idParam,request.params),row=await db.booking.findUnique({where:{id},include});if(!row||!(user.role==='parent'?row.parentId===user.id:row.tutorProfile.userId===user.id))return fail('NOT_FOUND',404,'预约不存在');return{data:booking(row)}})
 app.post('/api/bookings/:id/:action',async request=>{
  const{id,action}=parse(z.object({id:idParam.shape.id,action:z.enum(['accept','reject','cancel','complete'])}),request.params),rule=rules[action]
  const{user}=await actor(request,db,[rule.role]),row=await db.booking.findUnique({where:{id},include})
  if(!row||!(user.role==='parent'?row.parentId===user.id:row.tutorProfile.userId===user.id))return fail('NOT_FOUND',404,'预约不存在')
  if(row.status===rule.to)return{data:booking(row)}
  if(!(rule.from as readonly string[]).includes(row.status))return fail('CONFLICT',409,'当前预约状态不能执行此操作')
  const updated=await db.$transaction(async tx=>{
   const changed=await tx.booking.updateMany({where:{id,status:row.status},data:{status:rule.to}})
   if(changed.count!==1)return null
   await audit(tx,user.id,action,'Booking',id)
   return tx.booking.findUniqueOrThrow({where:{id},include})
  })
  if(!updated){const latest=await db.booking.findUniqueOrThrow({where:{id},include});if(latest.status===rule.to)return{data:booking(latest)};return fail('CONFLICT',409,'预约状态已变化，请刷新后重试')}
  return{data:booking(updated)}
 })
 app.post('/api/reports',async request=>{
  const{user}=await actor(request,db,['parent']),body=parse(reportSchema,request.body)
  const p=await db.tutorProfile.findFirst({where:{id:body.tutorId,published:true}})
  if(!p)return fail('NOT_FOUND',404,'家教不存在')
  const row=await db.$transaction(async tx=>{
   const created=await tx.report.create({data:{reporterId:user.id,tutorProfileId:p.id,reason:body.reason,description:body.description}})
   await audit(tx,user.id,'create','Report',created.id)
   return created
  })
  return{data:report(row)}
 })
 app.get('/api/admin/reports',async request=>{
  await actor(request,db,['admin'])
  const q=parse(reportListQuery,request.query)
  const where:Prisma.ReportWhereInput=q.status?{status:q.status}:{}
  const [total,rows]=await db.$transaction([
   db.report.count({where}),
   db.report.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize})
  ])
  return{data:rows.map(report),meta:{total,page:q.page,pageSize:q.pageSize}}
 })
 app.post('/api/admin/reports/:id/resolve',async request=>{
  const{user}=await actor(request,db,['admin']),{id}=parse(idParam,request.params)
  const row=await db.report.findUnique({where:{id}})
  if(!row)return fail('NOT_FOUND',404,'举报不存在')
  if(row.status==='resolved')return{data:report(row)}
  const updated=await db.$transaction(async tx=>{
   const changed=await tx.report.updateMany({where:{id,status:'open'},data:{status:'resolved',resolvedAt:new Date()}})
   if(!changed.count)return null
   await audit(tx,user.id,'resolve','Report',id)
   return tx.report.findUniqueOrThrow({where:{id}})
  })
  if(!updated)return fail('CONFLICT',409,'举报状态已变化')
  return{data:report(updated)}
 })
 return app
}
