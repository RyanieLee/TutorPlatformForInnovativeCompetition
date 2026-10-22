import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'
import { hashPassword, tokenHash } from '../src/core'
import type { HomeworkImageModel, HomeworkImageMime } from '../src/homework-review'
const db=new PrismaClient()
const modelParse=vi.fn(async()=>({subject:'数学' as const,grade:'初中（演示）' as const,budget:80,mode:'线上' as const,preference:'耐心'}))
const imageReview=vi.fn(async(_image:Buffer,_mimeType:HomeworkImageMime)=>'第1题：需要修改。请检查移项时的符号，并核对计算步骤。')
const homeworkImageModel:HomeworkImageModel={enabled:true,review:imageReview}
const app=buildApp(db,{enabled:true,parse:modelParse},undefined,undefined,undefined,homeworkImageModel)
let parent='',otherParent='',tutor='',otherTutor='',admin=''
let parentId='',tutorId='',otherTutorId='',profileId='',bookingId='',applicationId='',reportId=''
async function createUser(loginId:string,role:string){return db.user.create({data:{loginId,displayName:loginId,role,passwordHash:await hashPassword('local-test-password')}})}
async function login(loginId:string){const r=await app.inject({method:'POST',url:'/api/auth/login',payload:{loginId,password:'local-test-password'}});expect(r.statusCode).toBe(200);return r.json().data.token as string}
const auth=(token:string)=>({authorization:`Bearer ${token}`})
const input={displayName:'虚构老师',university:'示例大学',major:'数学',subjects:['数学'],teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'仅用于自动化测试的虚构资料。',availability:'周末下午'}
beforeAll(async()=>{await app.ready();const p=await createUser('parent','parent'),o=await createUser('other-parent','parent'),t=await createUser('tutor','tutor'),ot=await createUser('other-tutor','tutor');await createUser('admin','admin');parentId=p.id;tutorId=t.id;otherTutorId=ot.id;parent=await login('parent');otherParent=await login('other-parent');tutor=await login('tutor');otherTutor=await login('other-tutor');admin=await login('admin')})
afterAll(async()=>{await app.close()})

function multipartImage(bytes:Buffer,mime='image/png',field='image'){
 const boundary='----linghang-homework-test'
 const header=Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="'+field+'"; filename="homework.png"\r\nContent-Type: '+mime+'\r\n\r\n')
 const footer=Buffer.from('\r\n--'+boundary+'--\r\n')
 return {payload:Buffer.concat([header,bytes,footer]),headers:{'content-type':'multipart/form-data; boundary='+boundary}}
}
describe('小书灵作业图片批改',()=>{
 const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x00])
 it('公开报告模型配置，但上传要求家长或家教登录且图片格式需校验',async()=>{
  expect((await app.inject({method:'GET',url:'/api/assistant/homework-review/status'})).json().data).toMatchObject({enabled:true,maxImageBytes:3145728})
  const image=multipartImage(png)
  expect((await app.inject({method:'POST',url:'/api/assistant/homework-review-image',headers:image.headers,payload:image.payload})).statusCode).toBe(401)
  expect((await app.inject({method:'POST',url:'/api/assistant/homework-review-image',headers:{...auth(admin),...image.headers},payload:image.payload})).statusCode).toBe(403)
  const invalid=multipartImage(Buffer.from('not a real image'),'image/png')
  expect((await app.inject({method:'POST',url:'/api/assistant/homework-review-image',headers:{...auth(parent),...invalid.headers},payload:invalid.payload})).statusCode).toBe(400)
  expect(imageReview).not.toHaveBeenCalled()
 })
 it('成功接收有效PNG并只把内存图片交给模型，不在测试响应中返回图片内容',async()=>{
  const image=multipartImage(png)
  const response=await app.inject({method:'POST',url:'/api/assistant/homework-review-image',headers:{...auth(parent),...image.headers},payload:image.payload})
  expect(response.statusCode).toBe(200)
  expect(response.headers['cache-control']).toBe('no-store')
  expect(response.headers['x-content-type-options']).toBe('nosniff')
  expect(response.json().data).toEqual({reply:'第1题：需要修改。请检查移项时的符号，并核对计算步骤。',source:'model'})
  expect(imageReview).toHaveBeenCalledWith(png,'image/png')
  expect(response.body).not.toContain(png.toString('base64'))
 })
 it('对图片批改按账户每分钟限流',async()=>{
  const image=multipartImage(png)
  const statuses:number[]=[]
  for(let i=0;i<6;i++){
   const response=await app.inject({method:'POST',url:'/api/assistant/homework-review-image',remoteAddress:'10.20.30.40',headers:{...auth(otherParent),...image.headers},payload:image.payload})
   statuses.push(response.statusCode)
  }
  expect(statuses).toEqual([200,200,200,200,200,429])
 })
})

describe('认证和服务端权限',()=>{
 it('无登录与错误密码被拒绝，登出撤销会话',async()=>{
  expect((await app.inject({method:'GET',url:'/api/auth/me'})).statusCode).toBe(401)
  expect((await app.inject({method:'POST',url:'/api/auth/login',payload:{loginId:'parent',password:'wrong'}})).statusCode).toBe(401)
  const token=await login('parent');expect((await app.inject({method:'POST',url:'/api/auth/logout',headers:auth(token)})).statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/auth/me',headers:auth(token)})).statusCode).toBe(401)
 })
 it('到期会话不能继续访问',async()=>{
  const token=await login('parent')
  await db.session.update({where:{tokenHash:tokenHash(token)},data:{expiresAt:new Date(Date.now()-1000)}})
  expect((await app.inject({method:'GET',url:'/api/auth/me',headers:auth(token)})).statusCode).toBe(401)
 })
 it('同一来源和账户的频繁登录被限流',async()=>{
  const statuses=[]
  for(let i=0;i<6;i++){const r=await app.inject({method:'POST',url:'/api/auth/login',remoteAddress:'10.11.12.13',payload:{loginId:'unknown',password:'wrong'}});statuses.push(r.statusCode)}
  expect(statuses).toEqual([401,401,401,401,401,429])
 })
 it('更换账户名也不能无限绕过来源限流',async()=>{
  let lastStatus=0
  for(let i=0;i<31;i++){
   const response=await app.inject({method:'POST',url:'/api/auth/login',remoteAddress:'10.11.12.14',payload:{loginId:`unknown-${i}`,password:'wrong'}})
   lastStatus=response.statusCode
  }
  expect(lastStatus).toBe(429)
 })
 it('普通用户不能访问管理接口',async()=>{expect((await app.inject({method:'GET',url:'/api/admin/tutor-applications',headers:auth(parent)})).statusCode).toBe(403)})
})
describe('可选模型需求解析',()=>{
 it('状态公开，但解析只允许家长身份且拒绝私人信息',async()=>{
  expect((await app.inject({method:'GET',url:'/api/match-assistant/status'})).json().data).toEqual({enabled:true})
  const payload={brief:'初中数学，预算80元，线上'}
  expect((await app.inject({method:'POST',url:'/api/match-assistant/parse',payload})).statusCode).toBe(401)
  expect((await app.inject({method:'POST',url:'/api/match-assistant/parse',headers:auth(tutor),payload})).statusCode).toBe(403)
  expect((await app.inject({method:'POST',url:'/api/match-assistant/parse',headers:auth(parent),payload:{brief:'初中数学，电话13800138000'}})).statusCode).toBe(400)
  expect((await app.inject({method:'POST',url:'/api/match-assistant/parse',headers:auth(parent),payload:{brief:'太短'}})).statusCode).toBe(400)
  expect(modelParse).not.toHaveBeenCalled()
  const parsed=await app.inject({method:'POST',url:'/api/match-assistant/parse',headers:auth(parent),payload})
  expect(parsed.statusCode).toBe(200)
  expect(parsed.json().data).toMatchObject({subject:'数学',budget:80})
  expect(modelParse).toHaveBeenCalledWith(payload.brief)
 })
 it('对每个账户限制模型请求次数',async()=>{
  const account=await createUser('model-rate-parent','parent'),token=await login(account.loginId)
  const statuses=[]
  for(let i=0;i<11;i++)statuses.push((await app.inject({method:'POST',url:'/api/match-assistant/parse',headers:auth(token),payload:{brief:'初中数学，预算80元，线上'}})).statusCode)
  expect(statuses).toEqual([...Array(10).fill(200),429])
 })
})
describe('入驻、审核与公开资料',()=>{
 it('校验申请，禁止重复，审核后公开，编辑后撤回公开',async()=>{
  const bad=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:{...input,pricePerHour:0}})
  expect(bad.statusCode).toBe(400)
  expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:{...input,subjects:['数学','数学']}})).statusCode).toBe(400)
  const submit=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:input})
  expect(submit.statusCode).toBe(200);applicationId=submit.json().data.id
  profileId=(await db.tutorProfile.findUniqueOrThrow({where:{userId:tutorId}})).id
  expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:input})).statusCode).toBe(409)
  expect((await app.inject({method:'GET',url:'/api/tutors'})).json().data).toEqual([])
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(parent),payload:{decision:'approved'}})).statusCode).toBe(403)
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(admin),payload:{decision:'approved'}})).statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/admin/tutor-applications',headers:auth(admin)})).json().data.some((a:{status:string})=>a.status==='approved')).toBe(true)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数学'})).json().data).toHaveLength(1)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数'})).json().data).toHaveLength(0)
  expect((await app.inject({method:'GET',url:'/api/tutors?keyword=数学'})).json().data).toHaveLength(1)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=英语'})).json().data).toHaveLength(0)
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(admin),payload:{decision:'rejected',reason:'x'}})).statusCode).toBe(409)
 })
 it('并发重复提交只生成一次申请和审计，待审期间不可改草稿或资料',async()=>{
  const account=await createUser('concurrent-tutor','tutor')
  const token=await login('concurrent-tutor')
  const responses=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(token),payload:input})))
  expect(responses.map(r=>r.statusCode).sort()).toEqual([200,409])
  const row=await db.tutorApplication.findUniqueOrThrow({where:{userId:account.id}})
  expect(row.status).toBe('pending')
  expect(await db.auditLog.count({where:{entityType:'TutorApplication',entityId:row.id,action:'submit'}})).toBe(1)
  expect((await app.inject({method:'PUT',url:'/api/tutor-applications/draft',headers:auth(token),payload:input})).statusCode).toBe(409)
  expect((await app.inject({method:'PATCH',url:'/api/tutors/me',headers:auth(token),payload:{area:'新地区'}})).statusCode).toBe(409)
 })
})
describe('草稿与驳回',()=>{
 it('允许不完整草稿，驳回理由可由家教查看，仍不公开',async()=>{
  const draft={displayName:'',university:'',major:'',subjects:[],teachingMode:'线上',area:'',pricePerHour:0,introduction:'',availability:''}
  const saved=await app.inject({method:'PUT',url:'/api/tutor-applications/draft',headers:auth(otherTutor),payload:draft})
  expect(saved.statusCode).toBe(200);expect(saved.json().data.status).toBe('draft')
  const submitted=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(otherTutor),payload:{...input,displayName:'候选家教'}})
  expect(submitted.statusCode).toBe(200)
  const id=submitted.json().data.id
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${id}/review`,headers:auth(admin),payload:{decision:'rejected'}})).statusCode).toBe(400)
  const rejected=await app.inject({method:'POST',url:`/api/admin/tutor-applications/${id}/review`,headers:auth(admin),payload:{decision:'rejected',reason:'资料待补充'}})
  expect(rejected.json().data.status).toBe('rejected')
  expect((await app.inject({method:'GET',url:'/api/tutor-applications/mine',headers:auth(otherTutor)})).json().data.rejectionReason).toBe('资料待补充')
  expect((await app.inject({method:'GET',url:'/api/tutors'})).json().data).toHaveLength(1)
 })
})
describe('预约与举报',()=>{
 it('拒绝无效参数和不存在资源；按角色隔离并完成状态流转',async()=>{
  expect((await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{tutorId:profileId,studentName:'测试',subject:'英语',expectedTime:'周末',note:''}})).statusCode).toBe(400)
  expect((await app.inject({method:'GET',url:'/api/bookings/unknown',headers:auth(parent)})).statusCode).toBe(404)
  const created=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{tutorId:profileId,studentName:'虚构同学',subject:'数学',expectedTime:'周末',note:''}})
  expect(created.statusCode).toBe(200);bookingId=created.json().data.id
  expect((await app.inject({method:'GET',url:'/api/bookings/mine',headers:auth(otherParent)})).json().data).toHaveLength(0)
  expect((await app.inject({method:'GET',url:'/api/bookings/received',headers:auth(otherTutor)})).json().data).toHaveLength(0)
  expect((await app.inject({method:'GET',url:`/api/bookings/${bookingId}`,headers:auth(otherParent)})).statusCode).toBe(404)
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/accept`,headers:auth(otherTutor)})).statusCode).toBe(404)
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/accept`,headers:auth(parent)})).statusCode).toBe(403)
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/accept`,headers:auth(tutor)})).json().data.status).toBe('accepted')
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/accept`,headers:auth(tutor)})).json().data.status).toBe('accepted')
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/reject`,headers:auth(tutor)})).statusCode).toBe(409)
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/complete`,headers:auth(tutor)})).json().data.status).toBe('completed')
  expect((await app.inject({method:'POST',url:`/api/bookings/${bookingId}/cancel`,headers:auth(parent)})).statusCode).toBe(409)
 })
 it('创建预约重试使用同一请求标识，冲突操作仅一个成功',async()=>{
  const payload={requestId:'integration-retry-001',tutorId:profileId,studentName:'虚构同学',subject:'数学',expectedTime:'周日',note:''}
  const first=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload})
  const second=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload})
  expect(first.json().data.id).toBe(second.json().data.id)
  expect((await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{...payload,expectedTime:'周六'}})).statusCode).toBe(409)
  const id=first.json().data.id
  const results=await Promise.all(['accept','reject'].map(action=>app.inject({method:'POST',url:`/api/bookings/${id}/${action}`,headers:auth(tutor)})))
  expect(results.map(r=>r.statusCode).sort()).toEqual([200,409])
 })
 it('举报仅管理员可读且写入审计日志',async()=>{
  const created=await app.inject({method:'POST',url:'/api/reports',headers:auth(parent),payload:{tutorId:profileId,reason:'资料不实',description:'虚构测试'}})
  expect(created.statusCode).toBe(200);reportId=created.json().data.id
  expect((await app.inject({method:'GET',url:'/api/admin/reports',headers:auth(parent)})).statusCode).toBe(403)
  expect((await app.inject({method:'POST',url:`/api/admin/reports/${reportId}/resolve`,headers:auth(admin)})).json().data.status).toBe('resolved')
  expect(await db.auditLog.count()).toBeGreaterThanOrEqual(4)
 })
})

describe('审计失败回滚预约',()=>{
 it('创建预约时审计失败不留下预约记录',async()=>{
  const before=await db.booking.count()
  await db.$executeRawUnsafe(`CREATE TRIGGER fail_create_audit BEFORE INSERT ON AuditLog WHEN NEW.action = 'create' AND NEW.entityType = 'Booking' BEGIN SELECT RAISE(ABORT, 'audit failed'); END`)
  try {
   const response=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{tutorId:profileId,studentName:'虚构审计测试',subject:'数学',expectedTime:'周二',note:'',requestId:'audit-create-test-1'}})
   expect(response.statusCode).toBe(500)
   expect(await db.booking.count()).toBe(before)
  } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_create_audit') }
 })
 it('状态与审计同事务，审计写入失败时预约仍待确认',async()=>{
  const created=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{tutorId:profileId,studentName:'虚构审计测试',subject:'数学',expectedTime:'周一',note:''}})
  const id=created.json().data.id
  await db.$executeRawUnsafe(`CREATE TRIGGER fail_accept_audit BEFORE INSERT ON AuditLog WHEN NEW.action = 'accept' BEGIN SELECT RAISE(ABORT, 'audit failed'); END`)
  try {
   expect((await app.inject({method:'POST',url:`/api/bookings/${id}/accept`,headers:auth(tutor)})).statusCode).toBe(500)
   expect((await db.booking.findUniqueOrThrow({where:{id}})).status).toBe('pending')
  } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_accept_audit') }
 })
 it('举报处理的状态与审计写入同事务',async()=>{
  const created=await app.inject({method:'POST',url:'/api/reports',headers:auth(parent),payload:{tutorId:profileId,reason:'其他',description:'虚构审计测试'}})
  const id=created.json().data.id
  await db.$executeRawUnsafe(`CREATE TRIGGER fail_report_audit BEFORE INSERT ON AuditLog WHEN NEW.action = 'resolve' BEGIN SELECT RAISE(ABORT, 'audit failed'); END`)
  try {
   expect((await app.inject({method:'POST',url:`/api/admin/reports/${id}/resolve`,headers:auth(admin)})).statusCode).toBe(500)
   expect((await db.report.findUniqueOrThrow({where:{id}})).status).toBe('open')
  } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_report_audit') }
 })
})
describe('修改已通过资料',()=>{
 it('修改后下架并回到草稿，需重新审核',async()=>{
  const changed=await app.inject({method:'PATCH',url:'/api/tutors/me',headers:auth(tutor),payload:{area:'新的示例地区',subjects:['物理']}})
  expect(changed.statusCode).toBe(200)
  expect((await db.tutorSubject.findMany({where:{tutorProfileId:profileId}})).map(row=>row.subject)).toEqual(['物理'])
  expect((await app.inject({method:'GET',url:'/api/tutors'})).json().data).toHaveLength(0)
  expect((await app.inject({method:'GET',url:'/api/tutor-applications/mine',headers:auth(tutor)})).json().data.status).toBe('draft')
  const retry=await app.inject({method:'POST',url:'/api/bookings',headers:auth(parent),payload:{requestId:'integration-retry-001',tutorId:profileId,studentName:'虚构同学',subject:'数学',expectedTime:'周日',note:''}})
  expect(retry.statusCode).toBe(200)
  const resubmitted=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:{...input,subjects:['物理']}})
  expect(resubmitted.statusCode).toBe(200)
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(admin),payload:{decision:'approved'}})).statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=物理'})).json().data).toHaveLength(1)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数学'})).json().data).toHaveLength(0)
 })
})

describe('公开家教数据库分页',()=>{
 it('按科目精确筛选，分页稳定且不超过每页限制',async()=>{
  const passwordHash=await hashPassword('local-test-password')
  const numbers=Array.from({length:23},(_,i)=>i)
  await db.user.createMany({data:numbers.map(i=>({id:`bulk-user-${i}`,loginId:`bulk-${i}`,displayName:`批量家教 ${i}`,role:'tutor',passwordHash}))})
  await db.tutorProfile.createMany({data:numbers.map(i=>({id:`bulk-profile-${i}`,userId:`bulk-user-${i}`,displayName:`批量家教 ${i}`,university:'示例大学',major:'示例专业',subjectsJson:JSON.stringify([i<21?'数学':'高等数学']),teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'虚构分页测试资料',availability:'周末',published:true}))})
  await db.tutorSubject.createMany({data:numbers.map(i=>({tutorProfileId:`bulk-profile-${i}`,subject:i<21?'数学':'高等数学'}))})
  await db.tutorApplication.createMany({data:numbers.map(i=>({userId:`bulk-user-${i}`,displayName:`批量家教 ${i}`,university:'示例大学',major:'示例专业',subjectsJson:JSON.stringify([i<21?'数学':'高等数学']),teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'虚构分页测试资料',availability:'周末',status:'approved'}))})
  const pages=await Promise.all([1,2,3].map(page=>app.inject({method:'GET',url:`/api/tutors?keyword=批量&page=${page}&pageSize=10`})))
  expect(pages.map(r=>r.json().data.length)).toEqual([10,10,3])
  expect(pages.map(r=>r.json().meta.total)).toEqual([23,23,23])
  expect(new Set(pages.flatMap(r=>r.json().data.map((t:{id:string})=>t.id))).size).toBe(23)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数学'})).json().meta.total).toBe(21)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=高等数学'})).json().meta.total).toBe(2)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数学&keyword=高等数学'})).json().meta.total).toBe(0)
  expect((await app.inject({method:'GET',url:'/api/tutors?pageSize=51'})).statusCode).toBe(400)
 })
})


it('方式过滤在数据库分页前执行，均可同时兼容线上和线下',async()=>{
  await db.tutorProfile.update({where:{id:'bulk-profile-0'},data:{teachingMode:'均可'}})
  await db.tutorProfile.update({where:{id:'bulk-profile-1'},data:{teachingMode:'线下'}})
  const online=await app.inject({method:'GET',url:'/api/tutors?keyword=批量&subject=数学&teachingMode=线上&pageSize=50'})
  expect(online.json().meta.total).toBe(20)
  expect(online.json().data.every((t:{teachingMode:string})=>['线上','均可'].includes(t.teachingMode))).toBe(true)
  const pages=await Promise.all([1,2].map(page=>app.inject({method:'GET',url:`/api/tutors?keyword=批量&subject=数学&teachingMode=线下&pageSize=1&page=${page}`})))
  expect(pages.map(r=>r.json().meta.total)).toEqual([2,2])
  expect(new Set(pages.flatMap(r=>r.json().data.map((t:{id:string})=>t.id)))).toEqual(new Set(['bulk-profile-0','bulk-profile-1']))
  expect((await app.inject({method:'GET',url:'/api/tutors?teachingMode=其他'})).statusCode).toBe(400)
})

it('价格区间与科目组合过滤后再分页，包含边界并拒绝非法区间',async()=>{
 await db.tutorProfile.update({where:{id:'bulk-profile-0'},data:{pricePerHour:70}})
 await db.tutorProfile.update({where:{id:'bulk-profile-1'},data:{pricePerHour:100}})
 const pages=await Promise.all([1,2,3].map(page=>app.inject({method:'GET',url:`/api/tutors?keyword=批量&minPrice=80&maxPrice=80&pageSize=10&page=${page}`})))
 expect(pages.map(r=>r.json().meta.total)).toEqual([21,21,21])
 expect(pages.map(r=>r.json().data.length)).toEqual([10,10,1])
 expect((await app.inject({method:'GET',url:'/api/tutors?keyword=批量&subject=数学&minPrice=80&maxPrice=80'})).json().meta.total).toBe(19)
 expect((await app.inject({method:'GET',url:'/api/tutors?keyword=批量&minPrice=80.01'})).json().meta.total).toBe(1)
 expect((await app.inject({method:'GET',url:'/api/tutors?keyword=批量&maxPrice=70'})).json().data.map((t:{id:string})=>t.id)).toEqual(['bulk-profile-0'])
 for(const query of ['minPrice=90&maxPrice=80','minPrice=-1','maxPrice=2001','maxPrice=1.123','minPrice=abc'])expect((await app.inject({method:'GET',url:'/api/tutors?'+query})).statusCode).toBe(400)
})
