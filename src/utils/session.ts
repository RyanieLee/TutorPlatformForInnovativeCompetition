import { shallowRef } from 'vue'
import { authService, hasRole } from '../services/auth'
import type { AuthSession, UserRole } from '../types/auth'

export const currentSession = shallowRef<AuthSession | null>(null)
let restored = false
let restoring: Promise<AuthSession | null> | null = null

export async function restoreSession(): Promise<AuthSession | null> {
  if (restored) return currentSession.value
  if (!restoring) {
    restoring = authService.restoreSession().then(session => {
      currentSession.value = session
      restored = true
      return session
    }).finally(() => { restoring = null })
  }
  return restoring
}

export async function loginDemo(role: 'parent' | 'tutor'): Promise<AuthSession> {
  const session = await authService.login({ kind: 'demo', role })
  currentSession.value = session
  restored = true
  return session
}

export async function logout(): Promise<void> {
  await authService.logout()
  currentSession.value = null
  restored = true
}

export function canAccess(allowed: readonly UserRole[]): boolean {
  return hasRole(currentSession.value?.user.role, allowed)
}
