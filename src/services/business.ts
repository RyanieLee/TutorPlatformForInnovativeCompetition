import { apiMode } from '../config/runtime'
import { ApiBusinessService } from './api/business'
import type { BusinessService } from './contracts'
import { MockBusinessService } from './mock/business'
import { UniStorage } from './mock/storage'
import { seedMockLearningData } from './mock/demo-data'

/** 页面只依赖此契约；真实 API 接入时替换实例。 */
function createMockBusiness(){
 const storage=new UniStorage()
 // 初始化延后至第一次业务访问，避免应用载入时存储异常使整个站点无法启动。
 let seeded=false
 const service=new MockBusinessService(storage)
 return new Proxy(service,{get(target,key){const value=Reflect.get(target,key);if(typeof value!=='function')return value;return(...args:unknown[])=>{if(!seeded){seedMockLearningData(storage);seeded=true}return value.apply(target,args)}}})
}
export const businessService: BusinessService = apiMode ? new ApiBusinessService() : createMockBusiness()
