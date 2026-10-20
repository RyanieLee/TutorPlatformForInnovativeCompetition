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
  await new ApiBusinessService().listTutors({keyword:'示例 大学',subject:'数学',page:2,pageSize:20})
  expect(request.mock.calls[0][0].url).toBe('http://127.0.0.1:3001/api/tutors?keyword=%E7%A4%BA%E4%BE%8B%20%E5%A4%A7%E5%AD%A6&subject=%E6%95%B0%E5%AD%A6&page=2&pageSize=20')
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
