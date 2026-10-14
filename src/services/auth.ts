import type { AuthLoginRequest, AuthService, AuthSession, UserRole } from '../types/auth'

const STORAGE_KEY = 'tutor-platform:mock-session:v1'
const demoUsers = {
  parent: { id: 'demo-parent', displayName: '演示家长', role: 'parent' },
  tutor: { id: 'demo-tutor', displayName: '演示家教', role: 'tutor' },
  admin: { id: 'demo-admin', displayName: '演示管理员', role: 'admin' }
} as const

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return session.mode === 'mock' &&
    typeof session.issuedAt === 'string' &&
    !!session.user &&
    typeof session.user.displayName === 'string' &&
    (session.user.role === 'parent' || session.user.role === 'tutor' || session.user.role === 'admin') &&
    session.user.id === demoUsers[session.user.role].id
}

/** 本机演示身份，不提供真实鉴权或服务端权限保障。 */
export class MockAuthService implements AuthService {
  async login(request: AuthLoginRequest): Promise<AuthSession> {
    if (request.kind !== 'demo') throw new Error('Mock 服务不支持真实登录')
    const session: AuthSession = {
      user: { ...demoUsers[request.role] },
      mode: 'mock',
      issuedAt: new Date().toISOString()
    }
    uni.setStorageSync(STORAGE_KEY, session)
    return session
  }

  async restoreSession(): Promise<AuthSession | null> {
    try {
      const value: unknown = uni.getStorageSync(STORAGE_KEY)
      if (isSession(value)) return value
      uni.removeStorageSync(STORAGE_KEY)
    } catch {
      // 本机存储不可用时退回访客状态。
    }
    return null
  }

  async logout(): Promise<void> {
    uni.removeStorageSync(STORAGE_KEY)
  }
}

export const authService: AuthService = new MockAuthService()

/** 页面仅用它控制演示流程；真实 API 必须重新校验角色。 */
export function hasRole(role: UserRole | undefined, allowed: readonly UserRole[]): boolean {
  return !!role && allowed.includes(role)
}
