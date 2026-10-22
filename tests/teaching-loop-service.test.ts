import {beforeEach,it,expect,vi} from 'vitest'
vi.mock('../src/config/runtime',()=>({apiMode:false,apiBaseUrl:'http://loop.test'}))
vi.mock('../src/utils/session',()=>({currentSession:{value:null}}))
import {currentSession} from '../src/utils/session'
import {MockLoopService} from '../src/services/mock/teaching-loop'
import {ApiLoopService} from '../src/services/api/teaching-loop'
import {MemoryStorage} from '../src/services/mock/storage'
import {MockBusinessService} from '../src/services/mock/business'
const parent={id:'demo-parent',role:'parent' as const,displayName:'家长'},tutor={id:'demo-tutor',role:'tutor' as const,displayName:'老师'}
let storage:MemoryStorage,business:MockBusinessService,bookingId:string,token='token-a'
beforeEach(async()=>{
 storage=new MemoryStorage();business=new MockBusinessService(storage)
 const booking=await business.createBooking(parent,{tutorId:'t001',tutorName:'小林',studentName:'匿名案例',contact:'13800000000',subject:'数学',expectedTime:'周末',note:''});bookingId=booking.id
 await business.transitionBooking(tutor,bookingId,'accept')
 ;(currentSession as any).value={mode:'mock',user:tutor};token='token-a'
 vi.stubGlobal('uni',{getStorageSync:()=>token,removeStorageSync:()=>{token=''},request:vi.fn()})
})
it('reuses existing booking ownership and persists the mock plan across service instances',async()=>{
 const service=new MockLoopService(storage,business),init=await service.command(bookingId,0,'initialize',{})
 expect(init.revision).toBe(1)
 ;(currentSession as any).value={mode:'mock',user:parent}
 const hidden=await new MockLoopService(storage,business).read(bookingId);expect(hidden).not.toHaveProperty('draft');expect((hidden as any).plan).toBeNull()
 await expect(service.command(bookingId,1,'publish',{})).rejects.toMatchObject({code:'FORBIDDEN'})
 ;(currentSession as any).value={mode:'mock',user:{...parent,id:'another-parent'}}
 await expect(service.read(bookingId)).rejects.toMatchObject({code:'NOT_FOUND'})
})
it('blocks writes after cancellation and does not pretend mock model generation succeeded',async()=>{
 const service=new MockLoopService(storage,business)
 await expect(service.generate(bookingId,0,'course')).rejects.toMatchObject({code:'MODEL_UNAVAILABLE'})
 await business.transitionBooking(parent,bookingId,'cancel')
 await expect(service.command(bookingId,0,'initialize',{})).rejects.toMatchObject({code:'CONFLICT'})
})
it('reuses a lost-response command ID and blocks changing unconfirmed payloads',async()=>{
 const configs:any[]=[];(uni.request as any).mockImplementation((c:any)=>configs.push(c))
 const service=new ApiLoopService(),first=service.command('b',0,'initialize',{});configs[0].fail();await expect(first).rejects.toMatchObject({code:'STORAGE'})
 await expect(service.command('b',0,'publish',{})).rejects.toMatchObject({code:'CONFLICT'})
 const retry=service.command('b',0,'initialize',{});expect(configs[1].data.requestId).toBe(configs[0].data.requestId)
 configs[1].success({statusCode:200,data:{data:{bookingId:'b',revision:1}}});expect((await retry).revision).toBe(1)
})
it('does not apply a stale response or clear a new identity after an old401',async()=>{
 let config:any;(uni.request as any).mockImplementation((c:any)=>{config=c})
 const promise=new ApiLoopService().read('b');token='token-b';(currentSession as any).value={mode:'server',user:parent}
 config.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'旧请求'}}})
 await expect(promise).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(token).toBe('token-b');expect(currentSession.value?.user.id).toBe('demo-parent')
})
