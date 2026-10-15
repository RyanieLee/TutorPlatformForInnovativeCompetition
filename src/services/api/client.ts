import { apiBaseUrl } from '../../config/runtime'
import { BusinessError } from '../errors'

const TOKEN_KEY = 'tutor-platform:api-token:v1'
let unauthorized: (() => void) | undefined
export function onUnauthorized(callback: () => void) { unauthorized = callback }
export function readToken(): string { try { return String(uni.getStorageSync(TOKEN_KEY) || '') } catch { return '' } }
export function saveToken(token: string) { uni.setStorageSync(TOKEN_KEY, token) }
export function clearToken() { uni.removeStorageSync(TOKEN_KEY) }
interface Envelope<T> { data?: T; error?: { code: string; message: string } }
export async function apiRequest<T>(method: 'GET'|'POST'|'PUT', path: string, data?: unknown, authenticated = true): Promise<T> {
  if (!apiBaseUrl) throw new BusinessError('STORAGE', '请配置 VITE_API_BASE_URL')
  const token = authenticated ? readToken() : ''
  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({ url: apiBaseUrl + path, method, data: (data ?? (method === 'GET' ? undefined : {})) as AnyObject, header: token ? { Authorization: 'Bearer ' + token } : {}, success: resolve, fail: reject })
  }).catch(() => { throw new BusinessError('STORAGE', '无法连接开发 API，请检查服务地址和网络') })
  const body = response.data as Envelope<T>
  if (response.statusCode >= 200 && response.statusCode < 300 && body && 'data' in body) return body.data as T
  if (response.statusCode === 401 && authenticated) { clearToken(); unauthorized?.() }
  const codes = ['UNAUTHORIZED','FORBIDDEN','NOT_FOUND','INVALID','CONFLICT'] as const
  const code = codes.find(c => c === body?.error?.code) || 'STORAGE'
  throw new BusinessError(code, body?.error?.message || `请求失败（${response.statusCode}）`)
}
