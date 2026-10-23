import {apiMode} from '../config/runtime'
import {apiRequest} from './api/client'
import {currentSession} from '../utils/session'
import {BusinessError} from './errors'
import {UniStorage,type StoragePort} from './mock/storage'
import {businessService} from './business'
import type {BusinessService} from './contracts'
import type {ArchiveAction,ArchiveBooking,ArchiveCommand,ArchiveState,CreateStudentArchive,StudentArchiveDTO} from '../../shared/student-archive'
import {createArchive,applyArchiveCommand,projectArchive,SAMPLE_ANALYSIS} from '../../shared/student-archive-engine'
export type {ArchiveAction,ArchiveBooking,StudentArchiveDTO} from '../../shared/student-archive'
export const archiveRequestId=()=>`archive-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
export interface ArchiveService {
 list():Promise<StudentArchiveDTO[]>
 read(id:string):Promise<StudentArchiveDTO>
 bookings():Promise<ArchiveBooking[]>
 create(input:CreateStudentArchive):Promise<StudentArchiveDTO>
 command(id:string,revision:number,action:ArchiveAction,requestId?:string):Promise<StudentArchiveDTO>
}
class ApiArchiveService implements ArchiveService {
 list(){return apiRequest<StudentArchiveDTO[]>('GET','/api/student-archives')}
 read(id:string){return apiRequest<StudentArchiveDTO>('GET','/api/student-archives/'+encodeURIComponent(id))}
 bookings(){return apiRequest<ArchiveBooking[]>('GET','/api/student-archives/bookings')}
 create(input:CreateStudentArchive){return apiRequest<StudentArchiveDTO>('POST','/api/student-archives',input)}
 command(id:string,revision:number,action:ArchiveAction,requestId=archiveRequestId()){
  return apiRequest<StudentArchiveDTO>('POST',`/api/student-archives/${encodeURIComponent(id)}/actions`,{...action,expectedRevision:revision,requestId})
 }
}
const KEY='tutor-platform:student-archives:v1'
interface LocalArchives {states:ArchiveState[];creates:{parentId:string;requestId:string;fingerprint:string;id:string}[]}
/** 本机演示无服务端安全保障；与 API 共用业务约束，不能代替真实鉴权。 */
export class MockArchiveService implements ArchiveService {
 constructor(private storage:StoragePort,private business:BusinessService){}
 private owner(){const s=currentSession.value;if(!s||!['parent','tutor'].includes(s.user.role))throw new BusinessError('FORBIDDEN','请登录学生/家长或教师账户');return s}
 private load():LocalArchives {
  const data=this.storage.get(KEY) as LocalArchives|null
  if(data&&(!Array.isArray(data.states)||!Array.isArray(data.creates)))throw new BusinessError('STORAGE','本机档案格式异常，原记录已保留')
  return data?JSON.parse(JSON.stringify(data)):{states:[],creates:[]}
 }
 private async context(){
  const session=this.owner(),user=session.user
  const rows=user.role==='parent'?await this.business.listParentBookings(user):await this.business.listTutorBookings(user)
  if(currentSession.value!==session)throw new BusinessError('UNAUTHORIZED','身份已变化，请重新进入')
  const data=this.load()
  const bookings:ArchiveBooking[]=rows.map(b=>({id:b.id,parentId:b.parentId,teacherId:b.tutorId==='t001'?'demo-tutor':'catalog:'+b.tutorId,teacherName:b.tutorName,subject:b.subject,status:b.status,archiveId:data.states.find(s=>s.bookingIds.includes(b.id))?.id}))
  return{actor:user,bookings,now:new Date().toISOString()}
 }
 private project(state:ArchiveState,context:Awaited<ReturnType<MockArchiveService['context']>>){
  try{return{...projectArchive(state,context),modelEnabled:false}}
  catch(e){this.rethrow(e)}
 }
 private rethrow(e:unknown):never {if(e&&typeof e==='object'&&'code'in e&&'message'in e)throw new BusinessError((e as BusinessError).code,String(e.message));throw e}
 async bookings(){const c=await this.context();return c.bookings}
 async list(){const c=await this.context();return this.load().states.filter(s=>s.parentId===c.actor.id||c.bookings.some(b=>s.bookingIds.includes(b.id))).map(s=>this.project(s,c))}
 async read(id:string){const c=await this.context(),state=this.load().states.find(s=>s.id===id);if(!state)throw new BusinessError('NOT_FOUND','档案不存在');return this.project(state,c)}
 async create(input:CreateStudentArchive){
  const c=await this.context();if(c.actor.role!=='parent')throw new BusinessError('FORBIDDEN','仅家长可以建档')
  const data=this.load(),fingerprint=JSON.stringify([input.nickname,input.grade,input.goals]),old=data.creates.find(r=>r.parentId===c.actor.id&&r.requestId===input.requestId)
  if(old){if(old.fingerprint!==fingerprint)throw new BusinessError('CONFLICT','重复请求对应不同档案');return this.project(data.states.find(s=>s.id===old.id)!,c)}
  if(data.states.filter(s=>s.parentId===c.actor.id).length>=30)throw new BusinessError('CONFLICT','每位家长最多创建30个学生档案')
  try{
   const state=createArchive(archiveRequestId(),c.actor.id,{nickname:input.nickname,grade:input.grade,goals:input.goals},c.now)
   data.states.push(state);data.creates.push({parentId:c.actor.id,requestId:input.requestId,fingerprint,id:state.id});this.storage.set(KEY,data);return this.project(state,c)
  }catch(e){this.rethrow(e)}
 }
 async command(id:string,revision:number,action:ArchiveAction,requestId=archiveRequestId()){
  const c=await this.context(),data=this.load(),index=data.states.findIndex(s=>s.id===id)
  if(index<0)throw new BusinessError('NOT_FOUND','档案不存在')
  if(action.type==='createReview'){
   if(action.payload.mode==='model')throw new BusinessError('MODEL_UNAVAILABLE','本机模式不调用模型，请选择明确标注的示例')
   if(action.payload.submissionId)throw new BusinessError('INVALID','关联真实作业提交需要 API 模式；本机示例请清空提交编号')
  }
  if(action.type==='bindBooking'&&data.states.some(s=>s.id!==id&&s.bookingIds.includes(action.payload.bookingId)))throw new BusinessError('CONFLICT','该预约已关联其他档案')
  try{
   const command={...action,expectedRevision:revision,requestId} as ArchiveCommand
   const state=applyArchiveCommand(data.states[index]!,command,{...c,...(action.type==='createReview'?{generatedAnalysis:SAMPLE_ANALYSIS}:{})})
   data.states[index]=state;this.storage.set(KEY,data);return this.project(state,c)
  }catch(e){this.rethrow(e)}
 }
}
export const archiveService:ArchiveService=apiMode?new ApiArchiveService():new MockArchiveService(new UniStorage(),businessService)
