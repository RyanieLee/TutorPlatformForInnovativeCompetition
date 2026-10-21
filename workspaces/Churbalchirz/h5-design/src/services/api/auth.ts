import type { AuthLoginRequest, AuthService, AuthSession, User } from '../../types/auth'
import { apiRequest, clearToken, readToken, saveToken } from './client'
export class ApiAuthService implements AuthService {
 async login(request: AuthLoginRequest): Promise<AuthSession> {
  if (request.kind !== 'password') throw new Error('API 模式请使用开发账户登录')
  const data = await apiRequest<{token:string;user:User}>('POST','/api/auth/login',{loginId:request.loginId,password:request.password},false)
  saveToken(data.token)
  return {user:data.user,mode:'server',issuedAt:new Date().toISOString()}
 }
 async restoreSession(): Promise<AuthSession|null> {
  if (!readToken()) return null
  try { return {user:await apiRequest<User>('GET','/api/auth/me'),mode:'server',issuedAt:new Date().toISOString()} }
  catch(error) { if(!readToken())return null;throw error }
 }
 async logout(): Promise<void> { try { if(readToken())await apiRequest('POST','/api/auth/logout') } finally { clearToken() } }
}
