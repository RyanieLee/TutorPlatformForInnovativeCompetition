import {currentSession} from '../../utils/session'
import {BusinessError} from '../errors'
import {createLoop,applyCommand,parentView} from '../../../server/src/teaching-loop/engine'
import {LoopError} from '../../../server/src/teaching-loop/types'
import type {LoopState,Command} from '../../../server/src/teaching-loop/types'
import type {StoragePort} from './storage'
import type {BusinessService} from '../contracts'
import type {LoopService,LoopView} from '../teaching-loop'
export class MockLoopService implements LoopService{
 constructor(private storage:StoragePort,private business:BusinessService){}
 private async access(id:string,write=false){
  const session=currentSession.value,user=session?.user
  if(!user)throw new BusinessError('UNAUTHORIZED','请先登录演示身份')
  if(user.role==='admin'||write&&user.role!=='tutor')throw new BusinessError('FORBIDDEN','当前身份无权操作教学计划')
  const booking=user.role==='tutor'?await this.business.getTutorBooking(user,id):(await this.business.listParentBookings(user)).find(b=>b.id===id)
  if(currentSession.value!==session)throw new BusinessError('UNAUTHORIZED','身份已变化，请重新进入')
  if(!booking)throw new BusinessError('NOT_FOUND','预约不存在')
  if(write&&booking.status!=='accepted')throw new BusinessError('CONFLICT','仅已接受预约可以编辑教学计划')
  return{user,booking}
 }
 private load(id:string):LoopState{const value=this.storage.get('tutor-platform:teaching-loop:v1:'+id)as LoopState|null;if(value&&(!Number.isInteger(value.revision)||value.bookingId!==id||!Array.isArray(value.versions)||!Array.isArray(value.receipts)))throw new BusinessError('STORAGE','本机教学数据格式异常，原数据已保留');return value?JSON.parse(JSON.stringify(value)):createLoop(id)}
 async read(id:string):Promise<LoopView>{const{user}=await this.access(id),s=this.load(id);return{...(user.role==='parent'?parentView(s):s),modelEnabled:false}}
 async command(id:string,revision:number,type:Command['type'],payload:Record<string,any>):Promise<LoopView>{
  await this.access(id,true)
  if(payload.source==='model'||payload.feedback?.source==='model'||payload.suggestion?.source==='model')throw new BusinessError('INVALID','本机模式不能声称调用模型')
  try{const next=applyCommand(this.load(id),{requestId:'mock-loop-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),expectedRevision:revision,type,payload},new Date().toISOString());this.storage.set('tutor-platform:teaching-loop:v1:'+id,next);return{...next,modelEnabled:false}}catch(e){if(e instanceof LoopError)throw new BusinessError(e.code,e.message);throw e}
 }
 async generate(id:string,_revision:number,_kind:'course'|'feedback'|'revision'):Promise<LoopView>{await this.access(id,true);throw new BusinessError('MODEL_UNAVAILABLE','本机模式不调用模型，请选择明确标注的演示样例')}
 hasPending(_id:string){return false}
 async retry(id:string){return this.read(id)}
}
