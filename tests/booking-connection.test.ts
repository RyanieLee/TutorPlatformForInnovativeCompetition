import {describe,it,expect} from 'vitest'
import {MockBookingConnectionService,commuteReference} from '../src/services/booking-connection'
import {MockBusinessService} from '../src/services/mock/business'
import {MemoryStorage} from '../src/services/mock/storage'
import {xianPlaces} from '../src/services/location'
import type {User} from '../src/types/auth'

const parent:User={id:'demo-parent',role:'parent',displayName:'家长'}, tutor:User={id:'demo-tutor',role:'tutor',displayName:'教师'}
const input={tutorId:'t001',tutorName:'演示教师',studentName:'演示同学',contact:'13800000000',subject:'数学',expectedTime:'周末',note:'',areaLabel:xianPlaces[0].label}
describe('预约沟通本机演示',()=>{
 it('只使用真实本机预约归属，不制造对方消息；幂等、分页和结束只读',async()=>{
  const storage=new MemoryStorage(),business=new MockBusinessService(storage)
  let user:User=parent
  const service=new MockBookingConnectionService(business,storage,()=>user)
  const booking=await business.createBooking(parent,input)
  expect((await service.list(booking.id)).messages).toEqual([])
  const first=await service.send(booking.id,{requestId:'request-first',text:'周末见'})
  expect(await service.send(booking.id,{requestId:'request-first',text:'周末见'})).toEqual(first)
  await expect(service.send(booking.id,{requestId:'request-first',text:'改变内容'})).rejects.toMatchObject({code:'CONFLICT'})
  user={...parent,id:'unrelated'}
  await expect(service.list(booking.id)).rejects.toMatchObject({code:'NOT_FOUND'})
  user={id:'demo-admin',displayName:'管理员',role:'admin'}
  await expect(service.list(booking.id)).rejects.toMatchObject({code:'FORBIDDEN'})
  user=tutor
  await service.send(booking.id,{requestId:'request-second',text:'收到，请带课本'})
  const newest=await service.list(booking.id,{pageSize:1})
  expect(newest.messages).toHaveLength(1)
  expect(newest.messages[0].senderRole).toBe('tutor')
  expect((await service.list(booking.id,{pageSize:1,beforeId:newest.nextBeforeId!})).messages).toEqual([first])
  await expect(service.list(booking.id,{pageSize:51})).rejects.toMatchObject({code:'INVALID'})
  await business.transitionBooking(tutor,booking.id,'accept')
  await business.transitionBooking(tutor,booking.id,'complete')
  expect((await service.list(booking.id)).canSend).toBe(false)
  await expect(service.send(booking.id,{requestId:'request-third',text:'结束后新消息'})).rejects.toMatchObject({code:'CONFLICT'})
 })
 it('异步读取预约期间切换身份，丢弃旧身份消息，且不写存储',async()=>{
  const storage=new MemoryStorage(),business=new MockBusinessService(storage)
  const booking=await business.createBooking(parent,input)
  let user=parent
  const pending=business.listParentBookings.bind(business)
  business.listParentBookings=async p=>{const rows=await pending(p);user={...parent,id:'switched'};return rows}
  const service=new MockBookingConnectionService(business,storage,()=>user)
  await expect(service.send(booking.id,{requestId:'request-stale',text:'不应保存'})).rejects.toMatchObject({code:'UNAUTHORIZED'})
  expect(storage.get('tutor-platform:booking-messages:v1:'+booking.id)).toBeNull()
 })
})
describe('公共片区通勤参考',()=>{
 it('只接受已公布参考点，明确直线距离并使用中文地图入口',()=>{
  const result=commuteReference(xianPlaces[0].label,xianPlaces[1].label)
  expect(result!.distanceKm).toBeGreaterThan(0)
  expect(result!.mapUrl).toContain('https://api.map.baidu.com/direction?')
  expect(result!.mapUrl).toContain('coord_type=wgs84')
  expect(new URL(result!.mapUrl).searchParams.get('src')).toBe('webapp.linghang.tutorplatform')
  expect(decodeURIComponent(result!.mapUrl)).toContain(xianPlaces[0].label)
  expect(result).not.toHaveProperty('duration')
  expect(commuteReference('任意私人住址',xianPlaces[0].label)).toBeNull()
 })
})
