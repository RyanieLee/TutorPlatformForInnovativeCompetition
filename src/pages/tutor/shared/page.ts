import { computed, ref, watch } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import { currentSession, canAccess, restoreSession } from '../../../utils/session'
import type { UserRole, User } from '../../../types/auth'
import { BusinessError, errorMessage } from '../../../services/errors'
import { createRequestScope } from './operations'

export const identityKey = () => currentSession.value ? [currentSession.value.mode, currentSession.value.user.id, currentSession.value.user.role].join(':') : null
export function useRolePage(role: UserRole, clear: () => void) {
  const ready = ref(false), error = ref('')
  const scope = createRequestScope(identityKey)
  let loadVersion = 0
  watch(identityKey, () => { scope.invalidate(); clear(); error.value = ''; ready.value = false }, { flush: 'sync' })
  onUnload(() => { loadVersion++; scope.invalidate() })
  onHide(() => { loadVersion++; scope.invalidate() })
  async function load<T>(fetcher: (user: User) => Promise<T>, apply: (data: T) => void) {
    const version = ++loadVersion
    scope.invalidate(); ready.value = false; error.value = ''
    try {
      await restoreSession()
      if (version !== loadVersion) return
      const user = currentSession.value?.user
      if (!user || !canAccess([role])) return
      const token = scope.begin()
      try { const data = await fetcher(user); if (token.isCurrent()) apply(data) }
      catch (cause) { if (token.isCurrent()) error.value = errorMessage(cause) }
    } catch (cause) { if (version === loadVersion) error.value = errorMessage(cause) }
    finally { if (version === loadVersion) ready.value = true }
  }
  return { ready, error, load, authorized: computed(() => canAccess([role])), scope }
}
export function confirmAction(title: string, content: string): Promise<boolean> {
  return new Promise((resolve, reject) => uni.showModal({ title, content, confirmText: '确认', cancelText: '取消', success: result => resolve(result.confirm), fail: () => reject(new BusinessError('STORAGE', '无法打开确认提示，请重试')) }))
}
export function assertIdentity(key: string | null) {
  if (!key || key !== identityKey()) throw new BusinessError('UNAUTHORIZED', '登录身份已变化，请重新进入页面')
}
export const isConflict = (cause: unknown) => cause instanceof BusinessError && cause.code === 'CONFLICT'
export function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
