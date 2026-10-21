import {describe,it,expect} from 'vitest'
import {localChat} from '../src/services/assistant'
import {MockBusinessService} from '../src/services/mock/business'
import {MemoryStorage} from '../src/services/mock/storage'
import {xianPlaces} from '../src/services/location'
import {exampleMapOrders,groupedOrders} from '../src/services/order-map'
const parent={id:'demo-parent',displayName:'虚构家长',role:'parent' as const},other={...parent,id:'other-parent'},teacher={id:'demo-tutor',displayName:'虚构家教',role:'tutor' as const},admin={id:'demo-admin',displayName:'虚构管理员',role:'admin' as const}
const input={tutorId:'t001',tutorName:'小林老师',studentName:'不进入地图的学生',contact:'13800000000',subject:'数学',expectedTime:'周末下午',note:'不进入地图的备注',areaLabel:xianPlaces[0].label}
describe('本机订单地图',()=>{
 it('创建片区、角色归属、动态状态、未标注记录与最小投影',async()=>{
  const service=new MockBusinessService(new MemoryStorage())
  const order=await service.createBooking(parent,input)
  await service.createBooking(other,{...input,areaLabel:undefined})
  const list=await service.listMapBookings(parent)
  expect(list.meta.total).toBe(1);expect(list.items[0].areaLabel).toBe(input.areaLabel)
  expect(JSON.stringify(list)).not.toContain(input.studentName);expect(JSON.stringify(list)).not.toContain(input.contact);expect(JSON.stringify(list)).not.toContain(input.note)
  expect((await service.listMapBookings(teacher)).meta.total).toBe(2)
  expect((await service.listMapBookings({...teacher,id:'other-tutor'})).meta.total).toBe(0)
  expect((await service.listMapBookings(admin)).items.some(o=>o.areaLabel===null)).toBe(true)
  await service.transitionBooking(teacher,order.id,'accept')
  expect((await service.listMapBookings(parent,{status:'accepted'})).items[0].status).toBe('accepted')
  await expect(service.createBooking(parent,{...input,areaLabel:'任意住址'})).rejects.toThrow()
  await expect(service.listMapBookings(parent,{pageSize:101})).rejects.toThrow()
 })
 it('示例固定且分组总量一致，不生成假实时订单',()=>{
  const a=exampleMapOrders(),b=exampleMapOrders()
  expect(a).toEqual(b);expect(a).toHaveLength(12)
  expect(groupedOrders(a).reduce((n,g)=>n+g.items.length,0)).toBe(12)
  expect(groupedOrders([{...a[0],areaLabel:null}])).toEqual([])
 })
})
describe('小书灵本机演示',()=>{
 it('明确来源，需求可主动带入匹配，不能伪造查单或自动预约',()=>{
  const parsed=localChat('初中数学，预算100元，线上耐心讲解')
  expect(parsed.source).toBe('local');expect(parsed.matchBrief).toContain('预算100')
  expect(localChat('帮我查看实时订单').reply).toContain('无法在对话中直接查询')
  expect(localChat('一元一次方程怎么学习').reply).toContain('固定笔记检索')
  expect(()=>localChat('电话13800138000请联系')).toThrow('联系方式')
 })
})
