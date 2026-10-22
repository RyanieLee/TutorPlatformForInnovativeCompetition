import { apiBaseUrl } from '../../config/runtime'
import { BusinessError } from '../errors'

const TOKEN_KEY = 'tutor-platform:api-token:v1'
let unauthorized: (() => void) | undefined
export function onUnauthorized(callback: () => void) { unauthorized = callback }
export function readToken(): string { try { return String(uni.getStorageSync(TOKEN_KEY) || '') } catch { return '' } }
export function saveToken(token: string) { uni.setStorageSync(TOKEN_KEY, token) }
export function clearToken() { uni.removeStorageSync(TOKEN_KEY) }
interface Envelope<T> { data?: T; error?: { code: string; message: string } }
function unpack<T>(statusCode: number, body: Envelope<T>, authenticated: boolean, requestToken: string): T {
  if (authenticated && readToken() !== requestToken) throw new BusinessError('UNAUTHORIZED', '登录身份已变化，请重新操作')
  if (statusCode >= 200 && statusCode < 300 && body && 'data' in body) return body.data as T
  if (statusCode === 401 && authenticated) { clearToken(); unauthorized?.() }
  const codes = ['UNAUTHORIZED','FORBIDDEN','NOT_FOUND','INVALID','CONFLICT','RATE_LIMIT','MODEL_UNAVAILABLE','MODEL_UPSTREAM'] as const
  const code = codes.find(c => c === body?.error?.code) || 'STORAGE'
  throw new BusinessError(code, body?.error?.message || `请求失败（${statusCode}）`)
}
export async function apiRequest<T>(method: 'GET'|'POST'|'PUT', path: string, data?: unknown, authenticated = true): Promise<T> {
  if (!apiBaseUrl) throw new BusinessError('STORAGE', '请配置 VITE_API_BASE_URL')
  const token = authenticated ? readToken() : ''
  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({ url: apiBaseUrl + path, method, data: (data ?? (method === 'GET' ? undefined : {})) as AnyObject, header: token ? { Authorization: 'Bearer ' + token } : {}, success: resolve, fail: reject })
  }).catch(() => { throw new BusinessError('STORAGE', '无法连接开发 API，请检查服务地址和网络') })
  return unpack(response.statusCode, response.data as Envelope<T>, authenticated, token)
}
export async function apiUploadFile<T>(path: string, filePath: string, name = 'file'): Promise<T> {
  if (!apiBaseUrl) throw new BusinessError('STORAGE', '请配置 VITE_API_BASE_URL')
  const token = readToken()
  if (!token) throw new BusinessError('UNAUTHORIZED', '请先登录开发账户')
  const response = await new Promise<UniApp.UploadFileSuccessCallbackResult>((resolve, reject) => {
    uni.uploadFile({url:apiBaseUrl+path,filePath,name,header:{Authorization:'Bearer '+token},success:resolve,fail:reject})
  }).catch(() => { throw new BusinessError('STORAGE', '文件上传失败，请检查网络') })
  let body: Envelope<T>
  try { body = JSON.parse(response.data) as Envelope<T> }
  catch { throw new BusinessError('STORAGE', '上传服务响应无效') }
  return unpack(response.statusCode, body, true, token)
}
