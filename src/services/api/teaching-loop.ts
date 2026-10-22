import {apiBaseUrl} from '../../config/runtime'
import {readToken,clearToken} from './client'
import {currentSession} from '../../utils/session'
import {BusinessError,type BusinessErrorCode} from '../errors'
import type {LoopService,LoopView,Command} from '../teaching-loop'
type Pending={token:string;fingerprint:string;path:string;body:Record<string,any>}
export class ApiLoopService implements LoopService{
 private pending=new Map<string,Pending>()
 private guard(token:string){if(!token||readToken()!==token)throw new BusinessError('UNAUTHORIZED','登录身份已变化，请重新进入教学计划')}
 private async json(method:'GET'|'POST',path:string,body?:Record<string,any>):Promise<LoopView>{
  const token=readToken();this.guard(token)
  return new Promise((resolve,reject)=>uni.request({url:apiBaseUrl+path,method,data:body as any,header:{Authorization:'Bearer '+token},success:r=>{try{
   this.guard(token);const result=r.data as any
   if(r.statusCode===401){clearToken();currentSession.value=null}
   if(r.statusCode<200||r.statusCode>=300||!result||!('data'in result)){const codes:BusinessErrorCode[]=['UNAUTHORIZED','FORBIDDEN','NOT_FOUND','INVALID','CONFLICT','RATE_LIMIT','MODEL_UNAVAILABLE','MODEL_UPSTREAM'];throw new BusinessError(codes.includes(result?.error?.code)?result.error.code:'STORAGE',result?.error?.message||'服务器结果无法确认，请重试')}
   resolve(result.data)
  }catch(e){reject(e)}},fail:()=>reject(new BusinessError('STORAGE','网络中断，操作结果待确认。请重试上次提交或刷新查询，不要改动原内容。'))}))
 }
 private path(id:string){return'/api/bookings/'+encodeURIComponent(id)+'/teaching-loop'}
 private current(id:string){const p=this.pending.get(id);if(p&&p.token!==readToken()){this.pending.delete(id);return undefined}return p}
 hasPending(id:string){return!!this.current(id)}
 async read(id:string){const result=await this.json('GET',this.path(id)),p=this.current(id);if(p&&'receipts'in result&&result.receipts.some(r=>r.id===p.body.requestId))this.pending.delete(id);return result}
 private async write(id:string,path:string,value:Record<string,any>){
  const token=readToken(),fingerprint=JSON.stringify({path,value}),old=this.current(id)
  if(old&&old.fingerprint!==fingerprint)throw new BusinessError('CONFLICT','上次操作尚未确认，请重试上次提交或刷新查询')
  const pending=old??{token,fingerprint,path,body:{...value,requestId:'api-loop-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}};this.pending.set(id,pending)
  return this.perform(id,pending)
 }
 private async perform(id:string,pending:Pending){
  const release=()=>{if(this.pending.get(id)===pending&&pending.token===readToken())this.pending.delete(id)}
  try{const result=await this.json('POST',pending.path,pending.body);release();return result}catch(e){if(e instanceof BusinessError&&e.code!=='STORAGE')release();throw e}
 }
 async retry(id:string){const p=this.current(id);if(!p)return this.read(id);return this.perform(id,p)}
 command(id:string,revision:number,type:Command['type'],payload:Record<string,any>){return this.write(id,this.path(id),{expectedRevision:revision,type,payload})}
 generate(id:string,revision:number,kind:'course'|'feedback'|'revision'){return this.write(id,this.path(id)+'/generate',{expectedRevision:revision,kind})}
}
