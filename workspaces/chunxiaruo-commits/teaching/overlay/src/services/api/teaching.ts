import type {BookingOrder} from '../../types/tutor'
import {apiBaseUrl} from '../../config/runtime'
import {readToken,clearToken} from './client'
import {currentSession} from '../../utils/session'
import {BusinessError,type BusinessErrorCode} from '../errors'
import type {TeachingService,Page,LessonDto,LessonInput,PublishInput,SubmissionDto,SubmissionInput,AttachmentPurpose,AttachmentDto,SelectedFile,UploadJob,DownloadedFile} from '../../types/teaching'
const enc=encodeURIComponent
function identity(token:string){if(!token||token!==readToken())throw new BusinessError('UNAUTHORIZED','登录身份已变化，请重新进入页面')}
function parseResponse<T>(status:number,body:any,token:string):T{
 identity(token)
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{throw new BusinessError('STORAGE','服务器返回了无法识别的结果，请刷新确认')}}
 if(status===401){clearToken();currentSession.value=null}
 if(status<200||status>=300||!body||!('data'in body)){
  const codes:BusinessErrorCode[]=['UNAUTHORIZED','FORBIDDEN','NOT_FOUND','INVALID','CONFLICT','RATE_LIMIT']
  const code=codes.includes(body?.error?.code)?body.error.code:'STORAGE'
  throw new BusinessError(code,body?.error?.message||(status===413?'单个文件不能超过20 MiB':'请求失败，请重试'))
 }
 identity(token)
 return('meta'in body?body:body.data) as T
}
async function json<T>(method:'GET'|'POST'|'PUT'|'DELETE',path:string,data?:unknown):Promise<T>{
 if(!apiBaseUrl)throw new BusinessError('STORAGE','请配置审核 API 地址')
 const token=readToken();identity(token)
 return new Promise<T>((resolve,reject)=>uni.request({url:apiBaseUrl+path,method,data:data as any,header:{Authorization:'Bearer '+token},success:r=>{try{resolve(parseResponse<T>(r.statusCode,r.data,token))}catch(e){reject(e)}},fail:()=>reject(new BusinessError('STORAGE','网络中断，结果尚未确认；请保留内容并重试'))}))
}
export class ApiTeachingService implements TeachingService{
 getBooking(id:string){return json<BookingOrder>('GET','/api/bookings/'+enc(id))}
 async discardAttachment(id:string){try{return await json<{id:string}>('DELETE','/api/attachments/'+enc(id),{})}catch(e){if(e instanceof BusinessError&&e.code==='NOT_FOUND')return{id};throw e}}
 private pending=new Map<string,{fingerprint:string;id:string}>()
 private token=''
 private async write<T>(key:string,value:Record<string,unknown>,call:(requestId:string)=>Promise<T>,provided?:string):Promise<T>{
  const token=readToken();if(token!==this.token){this.pending.clear();this.token=token}
  const fingerprint=JSON.stringify(value),old=this.pending.get(key)
  if(old&&old.fingerprint!==fingerprint)throw new BusinessError('CONFLICT','上次提交结果尚未确认，请先按原内容重试或刷新检查')
  const id=provided??old?.id??('teaching-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))
  this.pending.set(key,{fingerprint,id})
  const release=()=>{if(this.token===token&&this.pending.get(key)?.id===id)this.pending.delete(key)}
  try{const result=await call(id);release();return result}
  catch(e){if(e instanceof BusinessError&&e.code!=='STORAGE')release();throw e}
 }
 listLessons(bookingId:string,page=1,pageSize=20){return json<Page<LessonDto>>('GET','/api/bookings/'+enc(bookingId)+'/lessons?page='+page+'&pageSize='+pageSize)}
 getLesson(id:string){return json<LessonDto>('GET','/api/lessons/'+enc(id))}
 createLesson(bookingId:string,input:LessonInput,requestId?:string){return this.write<LessonDto>('create:'+bookingId,{...input},id=>json('POST','/api/bookings/'+enc(bookingId)+'/lessons',{...input,requestId:id}),requestId)}
 saveLesson(id:string,input:LessonInput,version:number){return json<LessonDto>('PUT','/api/lessons/'+enc(id),{...input,version})}
 publishLesson(id:string,input:PublishInput){return json<LessonDto>('POST','/api/lessons/'+enc(id)+'/publish',input)}
 listSubmissions(id:string,page=1,pageSize=20){return json<Page<SubmissionDto>>('GET','/api/lessons/'+enc(id)+'/submissions?page='+page+'&pageSize='+pageSize)}
 submitHomework(id:string,input:SubmissionInput){const {requestId,...body}=input;return this.write<SubmissionDto>('submit:'+id,{...body},rid=>json('POST','/api/lessons/'+enc(id)+'/submissions',{...body,requestId:rid}),requestId)}
 uploadAttachment(id:string,purpose:AttachmentPurpose,file:SelectedFile,onProgress?:(progress:number)=>void):UploadJob{
  const token=readToken();let task:UniApp.UploadTask|undefined
  const promise=new Promise<AttachmentDto>((resolve,reject)=>{
   try{identity(token)}catch(e){reject(e);return}
   task=uni.uploadFile({url:apiBaseUrl+'/api/lessons/'+enc(id)+'/attachments?purpose='+purpose,filePath:file.path,name:'file',header:{Authorization:'Bearer '+token},success:r=>{try{resolve(parseResponse<AttachmentDto>(r.statusCode,r.data,token))}catch(e){reject(e)}},fail:()=>reject(new BusinessError('STORAGE','上传未完成，请重试；文件尚未提交'))})
   task.onProgressUpdate?.(event=>onProgress?.(event.progress))
  })
  return{promise,abort:()=>task?.abort()}
 }
 async downloadAttachment(attachment:AttachmentDto):Promise<DownloadedFile>{
  const token=readToken();identity(token)
  // #ifdef H5
  try{
   const response=await fetch(apiBaseUrl+'/api/attachments/'+enc(attachment.id)+'/content',{headers:{Authorization:'Bearer '+token}})
   if(!response.ok){const body=await response.json().catch(()=>null);parseResponse(response.status,body,token)}
   const blob=await response.blob();identity(token)
   const url=URL.createObjectURL(blob)
   return{url,name:attachment.originalName,mediaType:attachment.mediaType,dispose:()=>URL.revokeObjectURL(url)}
  }catch(e){if(e instanceof BusinessError)throw e;throw new BusinessError('STORAGE','无法读取文件，请检查网络后重试')}
  // #endif
  // #ifndef H5
  return new Promise((resolve,reject)=>uni.downloadFile({url:apiBaseUrl+'/api/attachments/'+enc(attachment.id)+'/content',header:{Authorization:'Bearer '+token},success:r=>{try{identity(token)}catch(e){reject(e);return}if(r.statusCode!==200){if(r.statusCode===401){clearToken();currentSession.value=null}reject(new BusinessError('STORAGE','文件读取失败，请重新登录后重试'));return}try{identity(token);resolve({url:r.tempFilePath,name:attachment.originalName,mediaType:attachment.mediaType,dispose:()=>{}})}catch(e){reject(e)}},fail:()=>reject(new BusinessError('STORAGE','文件下载失败'))}))
  // #endif
 }
}

