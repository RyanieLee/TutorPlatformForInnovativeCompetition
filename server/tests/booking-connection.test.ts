import {beforeAll,afterAll,describe,it,expect} from 'vitest'
import Fastify from 'fastify'
import {PrismaClient} from '@prisma/client'
import {randomUUID} from 'node:crypto'
import {ApiError,tokenHash} from '../src/core'
import {registerBookingConnections} from '../src/booking-connection'

const db=new PrismaClient(),app=Fastify()
const accounts:Record<string,{id:string;token:string}>={}
let bookingId='',foreignBooking=''
const url=(id=bookingId)=>'/api/booking-connections/'+id+'/messages'
const req=(method:'GET'|'POST',who?:string,payload?:unknown,path=url())=>app.inject({method,url:path,headers:who?{authorization:'Bearer '+accounts[who].token}:{},...(payload?{payload}:{})})
beforeAll(async()=>{
 app.setErrorHandler((error,_r,reply)=>error instanceof ApiError?reply.status(error.status).send({error:{code:error.code,message:error.message}}):reply.status(500).send({error:{message:error.message}}))
 registerBookingConnections(app,db)
 for(const role of ['parent','other-parent','tutor','other-tutor','admin','revoked','disabled']){
  const u=await db.user.create({data:{loginId:randomUUID(),displayName:'测试账户',role:role==='other-tutor'?'tutor':role.includes('parent')||role==='revoked'||role==='disabled'?'parent':role,passwordHash:'unused',status:role==='disabled'?'disabled':'active'}})
  const token=randomUUID();accounts[role]={id:u.id,token}
  await db.session.create({data:{userId:u.id,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+3600000),revokedAt:role==='revoked'?new Date():null}})
 }
 const profile=await db.tutorProfile.create({data:{userId:accounts.tutor.id,displayName:'教师',university:'大学',major:'数学',subjectsJson:'["数学"]',teachingMode:'线下',area:'西安',pricePerHour:80,introduction:'测试',availability:'周末'}})
 const data={tutorProfileId:profile.id,studentName:'不可泄漏的称呼',subject:'数学',expectedTime:'周末',note:'不可泄漏的备注'}
 bookingId=(await db.booking.create({data:{...data,parentId:accounts.parent.id}})).id
 foreignBooking=(await db.booking.create({data:{...data,parentId:accounts['other-parent'].id}})).id
 await app.ready()
})
afterAll(async()=>{await app.close();await db.$disconnect()})
describe('预约双方消息服务端边界',()=>{
 it('匿名/已撤销/停用拒绝；无关家长教师和管理员不可读取；空GET没有写入',async()=>{
  const count=await db.bookingMessage.count()
  expect((await req('GET')).statusCode).toBe(401)
  for(const who of ['revoked','disabled'])expect((await req('GET',who)).statusCode).toBe(401)
  expect((await req('GET','admin')).statusCode).toBe(403)
  for(const who of ['other-parent','other-tutor'])expect((await req('GET',who)).statusCode).toBe(404)
  const response=await req('GET','parent')
  expect(response.statusCode).toBe(200);expect(response.json().data.messages).toEqual([])
  expect(await db.bookingMessage.count()).toBe(count)
  expect(JSON.stringify(response.json())).not.toContain('不可泄漏')
 })
 it('待确认可发送；服务端决定senderRole；requestId内容不符拒绝',async()=>{
  const body={requestId:'message-first',text:'周末请带课本'}
  const first=await req('POST','parent',body)
  expect(first.statusCode).toBe(200)
  expect(first.json().data.senderRole).toBe('parent')
  expect((await req('POST','parent',body)).json().data).toEqual(first.json().data)
  expect((await req('POST','parent',{...body,text:'别的内容'})).statusCode).toBe(409)
  expect((await req('POST','parent',{...body,senderRole:'tutor'})).statusCode).toBe(400)
  for(const who of ['other-parent','other-tutor'])expect((await req('POST',who,{...body,requestId:'other-request'})).statusCode).toBe(404)
  expect((await req('POST','admin',body)).statusCode).toBe(403)
  expect((await req('POST','tutor',{requestId:'message-second',text:'好的'})).statusCode).toBe(200)
 })
 it('有界稳定分页，跨预约游标拒绝；不泄漏senderId',async()=>{
  const first=(await req('GET','parent',undefined,url()+'?pageSize=1')).json().data
  expect(first.messages).toHaveLength(1);expect(first.nextBeforeId).toBeTruthy()
  expect(first.messages[0]).not.toHaveProperty('senderId')
  const second=(await req('GET','parent',undefined,url()+'?pageSize=1&beforeId='+first.nextBeforeId)).json().data
  expect(second.messages).toHaveLength(1);expect(second.messages[0].id).not.toBe(first.messages[0].id)
  await req('POST','other-parent',{requestId:'foreign-message',text:'其他预约'},url(foreignBooking))
  const foreign=(await req('GET','other-parent',undefined,url(foreignBooking))).json().data.messages[0]
  expect((await req('GET','parent',undefined,url()+'?beforeId='+foreign.id)).statusCode).toBe(400)
  expect((await req('GET','parent',undefined,url()+'?pageSize=51')).statusCode).toBe(400)
 })
 it('进行中可写，所有结束状态只读；会话过期不能写',async()=>{
  await db.booking.update({where:{id:bookingId},data:{status:'accepted'}})
  expect((await req('POST','tutor',{requestId:'accepted-message',text:'继续上课'})).statusCode).toBe(200)
  for(const status of ['completed','cancelled','rejected']){
   await db.booking.update({where:{id:bookingId},data:{status}})
   expect((await req('GET','parent')).json().data.canSend).toBe(false)
   expect((await req('POST','parent',{requestId:'ended-'+status,text:'新消息'})).statusCode).toBe(409)
  }
  await db.session.update({where:{tokenHash:tokenHash(accounts.parent.token)},data:{expiresAt:new Date(0)}})
  expect((await req('POST','parent',{requestId:'expired-message',text:'过期'})).statusCode).toBe(401)
 })
})
