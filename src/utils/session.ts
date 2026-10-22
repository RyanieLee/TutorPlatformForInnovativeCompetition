import { onUnauthorized } from '../services/api/client'
import { shallowRef } from 'vue'
import { authService, hasRole } from '../services/auth'
import type { AuthSession, UserRole } from '../types/auth'

export const currentSession = shallowRef<AuthSession | null>(null)
let restored = false
let authEpoch=0
onUnauthorized(() => { authEpoch++;currentSession.value = null; restored = false })
let restoring: Promise<AuthSession | null> | null = null

export async function restoreSession(): Promise<AuthSession | null> {
  if (restored) return currentSession.value
  if (!restoring) {
    const epoch=authEpoch
    restoring = authService.restoreSession().then(session => {
      if(epoch!==authEpoch)return currentSession.value
      currentSession.value = session
      restored = true
      return session
    }).finally(() => { restoring = null })
  }
  return restoring
}

export async function loginPassword(loginId: string, password: string): Promise<AuthSession> {
  const epoch=++authEpoch
  const session = await authService.login({ kind: 'password', loginId, password })
  if(epoch!==authEpoch)throw new Error('登录操作已更新，请重新进入')
  currentSession.value = session
  restored = true
  return session
}

export async function loginDemo(role: UserRole): Promise<AuthSession> {
  const epoch=++authEpoch
  const session = await authService.login({ kind: 'demo', role })
  if(epoch!==authEpoch)throw new Error('登录操作已更新，请重新进入')
  currentSession.value = session
  restored = true
  return session
}

export async function logout(): Promise<void> {
  authEpoch++
  const owner=currentSession.value
  const serverSession = owner?.mode === 'server'
  try {
    await authService.logout()
  } catch (error) {
    // API 退出请求失败时，本机令牌已清除；Mock 存储失败则保留状态供重试。
    if (!serverSession) throw error
    if(currentSession.value===owner){currentSession.value = null;restored = true}
    throw error
  }
  if(currentSession.value===owner){currentSession.value = null;restored = true}
}

export function canAccess(allowed: readonly UserRole[]): boolean {
  return hasRole(currentSession.value?.user.role, allowed)
}
