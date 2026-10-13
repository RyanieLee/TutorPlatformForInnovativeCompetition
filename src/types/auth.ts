/** 前端角色契约；服务端接入后必须由服务端校验权限。 */
export type UserRole = 'parent' | 'tutor' | 'admin'

export interface User {
  id: string
  displayName: string
  role: UserRole
}

export interface AuthSession {
  user: User
  mode: 'mock' | 'server'
  issuedAt: string
}

export type AuthLoginRequest =
  | { kind: 'demo'; role: 'parent' | 'tutor' }
  | { kind: 'wechat'; code: string }

export interface AuthService {
  /** 真实实现应向服务端交换凭据，并从服务端响应读取角色。 */
  login(request: AuthLoginRequest): Promise<AuthSession>
  restoreSession(): Promise<AuthSession | null>
  logout(): Promise<void>
}

export const roleLabels: Record<UserRole, string> = {
  parent: '学生/家长',
  tutor: '大学生家教',
  admin: '管理员'
}
