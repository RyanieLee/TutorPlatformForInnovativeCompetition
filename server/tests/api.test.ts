import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'
import { hashPassword, tokenHash } from '../src/core'
const db=new PrismaClient()
const app=buildApp(db)
let parent='',otherParent='',tutor='',otherTutor='',admin=''
let parentId='',tutorId='',otherTutorId='',profileId='',bookingId='',applicationId='',reportId=''
async function createUser(loginId:string,role:string){return db.user.create({data:{loginId,displayName:loginId,role,passwordHash:await hashPassword('local-test-password')}})}
async function login(loginId:string){const r=await app.inject({method:'POST',url:'/api/auth/login',payload:{loginId,password:'local-test-password'}});expect(r.statusCode).toBe(200);return r.json().data.token as string}
const auth=(token:string)=>({authorization:`Bearer ${token}`})
const input={displayName:'虚构老师',university:'示例大学',major:'数学',subjects:['数学'],teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'仅用于自动化测试的虚构资料。',availability:'周末下午'}
beforeAll(async()=>{await app.ready();const p=await createUser('parent','parent'),o=await createUser('other-parent','parent'),t=await createUser('tutor','tutor'),ot=await createUser('other-tutor','tutor');await createUser('admin','admin');parentId=p.id;tutorId=t.id;otherTutorId=ot.id;parent=await login('parent');otherParent=await login('other-parent');tutor=await login('tutor');otherTutor=await login('other-tutor');admin=await login('admin')})
afterAll(async()=>{await app.close()})
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
 it('普通用户不能访问管理接口',async()=>{expect((await app.inject({method:'GET',url:'/api/admin/tutor-applications',headers:auth(parent)})).statusCode).toBe(403)})
})
describe('入驻、审核与公开资料',()=>{
 it('校验申请，禁止重复，审核后公开，编辑后撤回公开',async()=>{
  const bad=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:{...input,pricePerHour:0}})
  expect(bad.statusCode).toBe(400)
  const submit=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:input})
  expect(submit.statusCode).toBe(200);applicationId=submit.json().data.id
  profileId=(await db.tutorProfile.findUniqueOrThrow({where:{userId:tutorId}})).id
  expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutor),payload:input})).statusCode).toBe(409)
  expect((await app.inject({method:'GET',url:'/api/tutors'})).json().data).toEqual([])
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(parent),payload:{decision:'approved'}})).statusCode).toBe(403)
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(admin),payload:{decision:'approved'}})).statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/admin/tutor-applications',headers:auth(admin)})).json().data.some((a:{status:string})=>a.status==='approved')).toBe(true)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=数学'})).json().data).toHaveLength(1)
  expect((await app.inject({method:'GET',url:'/api/tutors?subject=英语'})).json().data).toHaveLength(0)
  expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(admin),payload:{decision:'rejected',reason:'x'}})).statusCode).toBe(409)
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

describe('修改已通过资料',()=>{
 it('修改后下架并回到草稿，需重新审核',async()=>{
  const changed=await app.inject({method:'PATCH',url:'/api/tutors/me',headers:auth(tutor),payload:{area:'新的示例地区'}})
  expect(changed.statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/tutors'})).json().data).toHaveLength(0)
  expect((await app.inject({method:'GET',url:'/api/tutor-applications/mine',headers:auth(tutor)})).json().data.status).toBe('draft')
 })
})
