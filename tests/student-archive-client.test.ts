import {beforeEach,describe,it,expect,vi} from 'vitest'
import {shallowRef} from 'vue'
vi.mock('../src/utils/session',()=>({currentSession:shallowRef(null)}))
vi.mock('../src/config/runtime',()=>({apiMode:false}))
import {currentSession} from '../src/utils/session'
import {MockArchiveService} from '../src/services/student-archive'
import {MemoryStorage} from '../src/services/mock/storage'
import type {BusinessService} from '../src/services/contracts'
const parent={id:'demo-parent',role:'parent' as const,displayName:'家长'}
const teacher={id:'demo-tutor',role:'tutor' as const,displayName:'教师'}
const booking={id:'b1',parentId:parent.id,tutorId:'t001',tutorName:'教师',studentName:'同名',subject:'数学',status:'accepted',expectedTime:'周末',note:'',contact:'',createdAt:'2026-10-23',updatedAt:'2026-10-23'}
const business={listParentBookings:async()=>[booking],listTutorBookings:async()=>[booking]} as unknown as BusinessService
function login(user:typeof parent|typeof teacher){currentSession.value={user,mode:'mock',issuedAt:new Date().toISOString()}}
describe('本机档案适配',()=>{
 beforeEach(()=>login(parent))
 it('区分同名学生，试课前教师只获得基本视图',async()=>{
  const service=new MockArchiveService(new MemoryStorage(),business)
  const one=await service.create({nickname:'同名',grade:'初一',goals:'方程',requestId:'create-one'})
  const two=await service.create({nickname:'同名',grade:'初一',goals:'几何',requestId:'create-two'})
  expect(one.id).not.toBe(two.id)
  await service.command(one.id,one.revision,{type:'bindBooking',payload:{bookingId:'b1'}})
  login(teacher)
  const result=await service.read(one.id)
  expect(result.access).toBe('basic');expect(result.reviews).toBeUndefined()
  expect((await service.list()).map(s=>s.id)).toEqual([one.id])
 })
 it('不让迟到的读取结果进入新登录身份',async()=>{
  let release!:()=>void
  const delayed={...business,listParentBookings:async()=>{await new Promise<void>(r=>{release=r});return[booking]}}
  const service=new MockArchiveService(new MemoryStorage(),delayed)
  const read=service.bookings();login(teacher);release()
  await expect(read).rejects.toMatchObject({code:'UNAUTHORIZED'})
 })
})
