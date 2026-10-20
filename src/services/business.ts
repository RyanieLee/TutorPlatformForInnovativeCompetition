import type { BusinessService } from './contracts'
import { MockBusinessService } from './mock/business'
import { UniStorage } from './mock/storage'

/** 页面只依赖此契约；真实 API 接入时替换实例。 */
export const businessService: BusinessService = new MockBusinessService(new UniStorage())
