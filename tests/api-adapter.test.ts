import { afterEach, expect, it, vi } from 'vitest'
import { authService } from '../src/services/auth'
import { currentSession, logout } from '../src/utils/session'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('服务端退出失败也清除前端会话，避免显示已登录的失效状态', async () => {
  currentSession.value = { user: { id: 'test-parent', displayName: '测试家长', role: 'parent' }, mode: 'server', issuedAt: new Date().toISOString() }
  vi.spyOn(authService, 'logout').mockRejectedValueOnce(new Error('network offline'))
  await expect(logout()).rejects.toThrow('network offline')
  expect(currentSession.value).toBeNull()
})

it('Mock 存储退出失败时保留原会话，允许用户重试', async () => {
  currentSession.value = { user: { id: 'demo-parent', displayName: '演示家长', role: 'parent' }, mode: 'mock', issuedAt: new Date().toISOString() }
  vi.spyOn(authService, 'logout').mockRejectedValueOnce(new Error('storage failure'))
  await expect(logout()).rejects.toThrow('storage failure')
  expect(currentSession.value?.mode).toBe('mock')
})

it('API 列表将首页“全部”筛选映射为无科目过滤', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  const request = vi.fn((options: {url:string;success:(value:unknown)=>void}) => options.success({statusCode:200,data:{data:[]}}))
  vi.stubGlobal('uni', {request, getStorageSync:()=>''})
  const { ApiBusinessService } = await import('../src/services/api/business')
  await new ApiBusinessService().listTutors({subject:'全部'})
  expect(request.mock.calls[0][0].url).toBe('http://127.0.0.1:3001/api/tutors')
})

it('API 列表传递关键词、科目和分页参数', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  const request = vi.fn((options: {url:string;success:(value:unknown)=>void}) => options.success({statusCode:200,data:{data:[]}}))
  vi.stubGlobal('uni', {request, getStorageSync:()=>''})
  const { ApiBusinessService } = await import('../src/services/api/business')
  await new ApiBusinessService().listTutors({keyword:'示例 大学',subject:'数学',teachingMode:'线上',minPrice:0,maxPrice:80.5,page:2,pageSize:20})
  expect(request.mock.calls[0][0].url).toBe('http://127.0.0.1:3001/api/tutors?keyword=%E7%A4%BA%E4%BE%8B%20%E5%A4%A7%E5%AD%A6&subject=%E6%95%B0%E5%AD%A6&teachingMode=%E7%BA%BF%E4%B8%8A&minPrice=0&maxPrice=80.5&page=2&pageSize=20')
})

it('预约网络失败后重试复用请求标识，避免生成重复预约', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  const keys: string[] = []
  const payloads: object[] = []
  let calls = 0
  vi.stubGlobal('uni', {
    getStorageSync: () => 'test-token',
    request: (options: {data:{requestId:string};success:(value:unknown)=>void;fail:(error:unknown)=>void}) => {
      keys.push(options.data.requestId)
      payloads.push(options.data)
      calls++
      if (calls === 1) options.fail(new Error('connection lost'))
      else options.success({statusCode:200,data:{data:{id:'booking-1'}}})
    }
  })
  const { ApiBusinessService } = await import('../src/services/api/business')
  const service = new ApiBusinessService()
  const parent = {id:'parent-1',displayName:'测试家长',role:'parent' as const}
  const input = {tutorId:'tutor-1',tutorName:'测试家教',studentName:'虚构同学',contact:'',subject:'数学',expectedTime:'周末',note:''}
  await expect(service.createBooking(parent,input)).rejects.toThrow()
  await service.createBooking(parent,input)
  expect(keys[0]).toBe(keys[1])
  expect(payloads[0]).not.toHaveProperty('contact')
  await service.createBooking(parent,input)
  expect(keys[2]).not.toBe(keys[1])
})

it('API 返回 401 时移除失效令牌并清除页面会话', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  let token = 'expired-token'
  vi.stubGlobal('uni', {
    getStorageSync: () => token,
    removeStorageSync: () => { token = '' },
    request: (options: {success:(value:unknown)=>void}) => options.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'登录状态无效或已过期'}}})
  })
  const { currentSession: session } = await import('../src/utils/session')
  const { apiRequest } = await import('../src/services/api/client')
  session.value = { user: { id: 'test-parent', displayName: '测试家长', role: 'parent' }, mode: 'server', issuedAt: new Date().toISOString() }
  await expect(apiRequest('GET','/api/bookings/mine')).rejects.toMatchObject({code:'UNAUTHORIZED'})
  expect(token).toBe('')
  expect(session.value).toBeNull()
})

it('模型状态公开可查；解析调用由后端鉴权且保留明确错误', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  const requests: {url:string;header:Record<string,string>;data?:{brief:string}}[] = []
  vi.stubGlobal('uni', {
    getStorageSync: () => 'test-token',
    request: (options: {url:string;header:Record<string,string>;data?:{brief:string};success:(value:unknown)=>void}) => {
      requests.push({url:options.url,header:options.header,data:options.data})
      if(options.url.endsWith('/status'))options.success({statusCode:200,data:{data:{enabled:true}}})
      else options.success({statusCode:503,data:{error:{code:'MODEL_UNAVAILABLE',message:'模型解析尚未配置'}}})
    }
  })
  const { matchAssistantStatus, parseMatchBrief } = await import('../src/services/api/match-assistant')
  expect(await matchAssistantStatus()).toEqual({enabled:true})
  await expect(parseMatchBrief('初中数学预算80元')).rejects.toMatchObject({code:'MODEL_UNAVAILABLE'})
  expect(requests[0].header).toEqual({})
  expect(requests[1]).toMatchObject({header:{Authorization:'Bearer test-token'},data:{brief:'初中数学预算80元'}})
  expect(JSON.stringify(requests)).not.toContain('MATCH_MODEL_API_KEY')
})

it('照片与作业图片共用上传器并保留各自的字段名', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001')
  vi.resetModules()
  const uploads: {name:string;url:string}[] = []
  vi.stubGlobal('uni', {
    getStorageSync: () => 'test-token',
    uploadFile: (options: {name:string;url:string;success:(value:unknown)=>void}) => {
      uploads.push({name:options.name,url:options.url})
      options.success({statusCode:200,data:JSON.stringify({data:{ok:true}})})
    }
  })
  const { apiUploadFile } = await import('../src/services/api/client')
  await apiUploadFile('/api/tutor/photo','/local/photo.jpg')
  await apiUploadFile('/api/assistant/homework-review-image','/local/homework.jpg','image')
  expect(uploads.map(x=>x.name)).toEqual(['file','image'])
})

it.each([200,401])('切换账号后忽略旧请求的 %s 响应，不清空新会话',async(statusCode)=>{
 vi.stubEnv('VITE_API_BASE_URL','http://127.0.0.1:3001');vi.resetModules()
 let token='old-token';let respond:(value:unknown)=>void=()=>{}
 const remove=vi.fn(()=>{token=''}),expired=vi.fn()
 vi.stubGlobal('uni',{getStorageSync:()=>token,removeStorageSync:remove,request:(o:{success:(v:unknown)=>void})=>{respond=o.success}})
 const {apiRequest,onUnauthorized}=await import('../src/services/api/client');onUnauthorized(expired)
 const request=apiRequest('GET','/api/bookings/mine');token='new-token'
 respond({statusCode,data:statusCode===200?{data:[{id:'old-private-order'}]}:{error:{code:'UNAUTHORIZED'}}})
 await expect(request).rejects.toMatchObject({code:'UNAUTHORIZED'})
 expect(token).toBe('new-token');expect(remove).not.toHaveBeenCalled();expect(expired).not.toHaveBeenCalled()
})
it('旧上传请求返回401不登出新账户',async()=>{
 vi.stubEnv('VITE_API_BASE_URL','http://127.0.0.1:3001');vi.resetModules()
 let token='old-token';let respond:(value:unknown)=>void=()=>{}
 const expired=vi.fn()
 vi.stubGlobal('uni',{getStorageSync:()=>token,removeStorageSync:()=>{token=''},uploadFile:(o:{success:(v:unknown)=>void})=>{respond=o.success}})
 const {apiUploadFile,onUnauthorized}=await import('../src/services/api/client');onUnauthorized(expired)
 const request=apiUploadFile('/api/tutor-applications/photo','old-photo.png');token='new-token'
 respond({statusCode:401,data:JSON.stringify({error:{code:'UNAUTHORIZED'}})})
 await expect(request).rejects.toMatchObject({code:'UNAUTHORIZED'})
 expect(token).toBe('new-token');expect(expired).not.toHaveBeenCalled()
})

it('旧退出请求完成后保留新令牌和新会话',async()=>{
 vi.stubEnv('VITE_API_BASE_URL','http://127.0.0.1:3001');vi.resetModules()
 let token='old-token';let respond:(v:unknown)=>void=()=>{}
 vi.stubGlobal('uni',{getStorageSync:()=>token,removeStorageSync:()=>{token=''},request:(o:{success:(v:unknown)=>void})=>{respond=o.success}})
 const {ApiAuthService}=await import('../src/services/api/auth')
 const operation=new ApiAuthService().logout();token='new-token'
 respond({statusCode:200,data:{data:{ok:true}}})
 await expect(operation).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(token).toBe('new-token')
 const {currentSession:session,logout:leave}=await import('../src/utils/session')
 const {authService:auth}=await import('../src/services/auth')
 let finish:()=>void=()=>{};vi.spyOn(auth,'logout').mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 session.value={user:{id:'old',displayName:'旧账户',role:'parent'},mode:'server',issuedAt:'old'}
 const leaving=leave();session.value={user:{id:'new',displayName:'新账户',role:'tutor'},mode:'server',issuedAt:'new'}
 finish();await leaving;expect(session.value?.user.id).toBe('new')
})
it('较早登录的迟到响应不能覆盖较新的令牌',async()=>{
 vi.stubEnv('VITE_API_BASE_URL','http://127.0.0.1:3001');vi.resetModules()
 let token='';const responses:((v:unknown)=>void)[]=[]
 vi.stubGlobal('uni',{getStorageSync:()=>token,setStorageSync:(_:string,value:string)=>{token=value},request:(o:{success:(v:unknown)=>void})=>responses.push(o.success)})
 const {ApiAuthService}=await import('../src/services/api/auth');const auth=new ApiAuthService()
 const old=auth.login({kind:'password',loginId:'old',password:'test'}),latest=auth.login({kind:'password',loginId:'new',password:'test'})
 responses[1]({statusCode:200,data:{data:{token:'new-token',user:{id:'new',role:'parent'}}}});await latest
 responses[0]({statusCode:200,data:{data:{token:'old-token',user:{id:'old',role:'parent'}}}})
 await expect(old).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(token).toBe('new-token')
})

it('恢复旧会话的迟到结果不覆盖刚登录的身份',async()=>{
 vi.resetModules()
 const {authService:auth}=await import('../src/services/auth')
 const session={user:{id:'new',displayName:'新家教',role:'tutor' as const},mode:'mock' as const,issuedAt:'new'}
 let finish:(v:any)=>void=()=>{}
 vi.spyOn(auth,'restoreSession').mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 vi.spyOn(auth,'login').mockResolvedValue(session)
 const {restoreSession:restore,loginDemo:login,currentSession:current}=await import('../src/utils/session')
 const restoring=restore();await login('tutor')
 finish({user:{id:'old',displayName:'旧家长',role:'parent'},mode:'mock',issuedAt:'old'})
 expect((await restoring)?.user.id).toBe('new');expect(current.value?.user.id).toBe('new')
})
