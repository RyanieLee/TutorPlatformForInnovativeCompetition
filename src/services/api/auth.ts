import type { AuthLoginRequest, AuthService, AuthSession, User } from '../../types/auth'
import {BusinessError} from '../errors'
import { apiRequest, clearToken, readToken, saveToken } from './client'
export class ApiAuthService implements AuthService {
 private generation=0
 async login(request: AuthLoginRequest): Promise<AuthSession> {
  if (request.kind !== 'password') throw new Error('API 模式请使用开发账户登录')
  const generation=++this.generation
  const data = await apiRequest<{token:string;user:User}>('POST','/api/auth/login',{loginId:request.loginId,password:request.password},false)
  if(generation!==this.generation)throw new BusinessError('UNAUTHORIZED','登录操作已被更新，请使用最新登录结果')
  saveToken(data.token)
  return {user:data.user,mode:'server',issuedAt:new Date().toISOString()}
 }
 async restoreSession(): Promise<AuthSession|null> {
  if (!readToken()) return null
  try { return {user:await apiRequest<User>('GET','/api/auth/me'),mode:'server',issuedAt:new Date().toISOString()} }
  catch(error) { if(!readToken())return null;throw error }
 }
 async logout(): Promise<void> { const token=readToken();this.generation++;try { if(token)await apiRequest('POST','/api/auth/logout') } finally { if(readToken()===token)clearToken() } }
}
