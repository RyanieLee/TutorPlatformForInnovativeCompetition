import {beforeEach,it,expect,vi} from 'vitest'
vi.mock('../src/config/runtime',()=>({apiMode:true,apiBaseUrl:'http://teaching.test'}))
vi.mock('../src/utils/session',()=>({currentSession:{value:{user:{id:'parent-a',role:'parent'}}}}))
import {currentSession} from '../src/utils/session'
import {ApiTeachingService} from '../src/services/api/teaching'
let token='token-a',calls:any[]=[]
beforeEach(()=>{
 token='token-a';calls=[];(currentSession as any).value={user:{id:'parent-a',role:'parent'}}
 vi.stubGlobal('uni',{getStorageSync:()=>token,removeStorageSync:()=>{token=''},request:vi.fn((r:any)=>{calls.push(r);r.success({statusCode:200,data:{data:[],meta:{total:21,page:1,pageSize:20}}})}),uploadFile:vi.fn()})
})
it('preserves paginated metadata and sends the existing session token',async()=>{
 const result=await new ApiTeachingService().listLessons('booking-a',1,20)
 expect(result.meta.total).toBe(21);expect(calls[0].header.Authorization).toBe('Bearer token-a')
 expect(calls[0].url).toContain('/api/bookings/booking-a/lessons?page=1&pageSize=20')
})
it('network-unknown retry keeps requestId and never produces fake success',async()=>{
 let count=0
 ;(uni.request as any).mockImplementation((r:any)=>{calls.push(r);if(count++===0)r.fail({errMsg:'network lost'});else r.success({statusCode:200,data:{data:{id:'submitted'}}})})
 const service=new ApiTeachingService(),input={note:'作业说明',attachmentIds:['file-a']}
 await expect(service.submitHomework('lesson-a',input)).rejects.toMatchObject({code:'STORAGE'})
 const result=await service.submitHomework('lesson-a',input)
 expect(result.id).toBe('submitted');expect(calls[1].data.requestId).toBe(calls[0].data.requestId)
 await service.submitHomework('lesson-a',input)
 expect(calls[2].data.requestId).not.toBe(calls[0].data.requestId)
})
it('401 removes the token and current identity',async()=>{
 ;(uni.request as any).mockImplementation((r:any)=>r.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'请重新登录'}}}))
 await expect(new ApiTeachingService().getLesson('a')).rejects.toMatchObject({code:'UNAUTHORIZED'})
 expect(token).toBe('');expect(currentSession.value).toBe(null)
})
it('upload uses authenticated multipart, exposes abort and reports size/quota errors',async()=>{
 const abort=vi.fn();let config:any
 ;(uni.uploadFile as any).mockImplementation((r:any)=>{config=r;return{abort,onProgressUpdate:vi.fn()}})
 const job=new ApiTeachingService().uploadAttachment('lesson-a','submission',{path:'blob:file',name:'作业.png',size:12})
 expect(config.url).toContain('?purpose=submission');expect(config.header.Authorization).toBe('Bearer token-a')
 config.success({statusCode:413,data:JSON.stringify({error:{code:'INVALID',message:'文件超过20 MiB'}})})
 await expect(job.promise).rejects.toThrow('文件超过20 MiB');job.abort();expect(abort).toHaveBeenCalledTimes(1)
})
it('stale upload completion cannot return data to another identity',async()=>{
 let config:any;(uni.uploadFile as any).mockImplementation((r:any)=>{config=r;return{abort(){},onProgressUpdate(){}}})
 const job=new ApiTeachingService().uploadAttachment('l','submission',{path:'blob:a',name:'a.png',size:1})
 token='different-token';config.success({statusCode:200,data:JSON.stringify({data:{id:'old-upload'}})})
 await expect(job.promise).rejects.toMatchObject({code:'UNAUTHORIZED'})
})
it('a stale 401 cannot log out a newer account',async()=>{
 let config:any;(uni.request as any).mockImplementation((r:any)=>{config=r})
 const promise=new ApiTeachingService().getLesson('old-lesson')
 token='new-token';(currentSession as any).value={user:{id:'parent-b',role:'parent'}}
 config.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'旧会话失效'}}})
 await expect(promise).rejects.toMatchObject({code:'UNAUTHORIZED'})
 expect(token).toBe('new-token');expect(currentSession.value?.user.id).toBe('parent-b')
})
it('an older failed write cannot clear the newer accounts retry identifier',async()=>{
 const configs:any[]=[];(uni.request as any).mockImplementation((r:any)=>{configs.push(r)})
 const service=new ApiTeachingService(),old=service.submitHomework('l',{note:'A',attachmentIds:['a']})
 token='token-b';const next=service.submitHomework('l',{note:'B',attachmentIds:['b']})
 configs[0].success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'旧请求'}}});await expect(old).rejects.toMatchObject({code:'UNAUTHORIZED'})
 configs[1].fail();await expect(next).rejects.toMatchObject({code:'STORAGE'})
 const retry=service.submitHomework('l',{note:'B',attachmentIds:['b']})
 expect(configs[2].data.requestId).toBe(configs[1].data.requestId)
 configs[2].success({statusCode:200,data:{data:{id:'B'}}});await retry
})


it('booking reads cannot let an old 401 erase a newly signed-in account',async()=>{
 let config:any;(uni.request as any).mockImplementation((r:any)=>{config=r})
 const promise=new ApiTeachingService().getBooking('booking-old')
 expect(config.url).toBe('http://teaching.test/api/bookings/booking-old')
 token='new-token';(currentSession as any).value={user:{id:'parent-b',role:'parent'}}
 config.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'旧会话'}}})
 await expect(promise).rejects.toMatchObject({code:'UNAUTHORIZED'})
 expect(token).toBe('new-token');expect(currentSession.value?.user.id).toBe('parent-b')
})

it('discard retries accept an already absent temporary file but preserve binding conflicts',async()=>{
 const service=new ApiTeachingService()
 ;(uni.request as any).mockImplementation((r:any)=>{expect(r.method).toBe('DELETE');expect(r.data).toEqual({});r.success({statusCode:404,data:{error:{code:'NOT_FOUND',message:'附件不存在'}}})})
 await expect(service.discardAttachment('removed')).resolves.toEqual({id:'removed'})
 ;(uni.request as any).mockImplementation((r:any)=>r.success({statusCode:409,data:{error:{code:'CONFLICT',message:'已提交'}}}))
 await expect(service.discardAttachment('bound')).rejects.toMatchObject({code:'CONFLICT'})
})
