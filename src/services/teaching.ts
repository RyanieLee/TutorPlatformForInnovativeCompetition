import {apiMode} from '../config/runtime'
import {ApiTeachingService} from './api/teaching'
import {MockTeachingService} from './mock/teaching'
import type {TeachingService} from '../types/teaching'
export const teachingService:TeachingService=apiMode?new ApiTeachingService():new MockTeachingService()
export const teachingApiMode=apiMode
