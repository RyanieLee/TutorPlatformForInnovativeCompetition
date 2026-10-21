export type BusinessErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID' | 'CONFLICT' | 'RATE_LIMIT' | 'MODEL_UNAVAILABLE' | 'MODEL_UPSTREAM' | 'STORAGE'
export class BusinessError extends Error {
  constructor(public readonly code: BusinessErrorCode, message: string) {
    super(message)
    this.name = 'BusinessError'
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof BusinessError ? error.message : '操作失败，请稍后重试'
}
