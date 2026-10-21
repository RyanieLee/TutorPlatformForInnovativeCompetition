import { BusinessError } from '../errors'

export interface StoragePort {
  get(key: string): unknown | null
  set(key: string, value: unknown): void
}

/** uni-app 跨端同步存储；任何存储异常都向页面显式报告。 */
export class UniStorage implements StoragePort {
  get(key: string): unknown | null {
    try {
      const value: unknown = uni.getStorageSync(key)
      return value === '' || value == null ? null : value
    } catch { throw new BusinessError('STORAGE', '本机数据读取失败，请稍后重试') }
  }
  set(key: string, value: unknown): void {
    try { uni.setStorageSync(key, value) }
    catch { throw new BusinessError('STORAGE', '本机数据保存失败，请检查设备存储') }
  }
}

/** 测试与未来适配层可注入独立存储。 */
export class MemoryStorage implements StoragePort {
  private values = new Map<string, unknown>()
  get(key: string): unknown | null { return this.values.has(key) ? this.values.get(key) ?? null : null }
  set(key: string, value: unknown): void { this.values.set(key, value) }
}
