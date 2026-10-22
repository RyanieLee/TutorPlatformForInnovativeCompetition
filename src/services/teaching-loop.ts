import {apiMode} from '../config/runtime'
import {ApiLoopService} from './api/teaching-loop'
import {MockLoopService} from './mock/teaching-loop'
import {UniStorage} from './mock/storage'
import {businessService} from './business'
import type {LoopState,ParentLoopView,Command} from '../../server/src/teaching-loop/types'
export type LoopView=(LoopState|ParentLoopView)&{modelEnabled:boolean}
export type {Course,CourseLesson,Feedback,ClassRecord,Suggestion,RecordInput,Command,LoopState,ParentLoopView} from '../../server/src/teaching-loop/types'
export interface LoopService{
 read(id:string):Promise<LoopView>
 command(id:string,revision:number,type:Command['type'],payload:Record<string,any>):Promise<LoopView>
 generate(id:string,revision:number,kind:'course'|'feedback'|'revision'):Promise<LoopView>
 hasPending(id:string):boolean
 retry(id:string):Promise<LoopView>
}
export const loopService:LoopService=apiMode?new ApiLoopService():new MockLoopService(new UniStorage(),businessService)
export const loopApiMode=apiMode
