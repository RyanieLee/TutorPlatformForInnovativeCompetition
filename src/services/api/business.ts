import type { BusinessService, TutorQuery } from '../contracts'
import type { User } from '../../types/auth'
import type { Tutor, BookingInput, BookingOrder } from '../../types/tutor'
import type { TutorApplication, TutorApplicationInput, ReportReason, TutorReport } from '../../types/business'
import type { BookingAction } from '../rules'
import { BusinessError } from '../errors'
import { apiRequest } from './client'
const enc = encodeURIComponent
export class ApiBusinessService implements BusinessService {
 private pendingBooking: {fingerprint:string; requestId:string}|null = null
 listTutors(query?:TutorQuery) { const q:string[]=[];if(query?.keyword)q.push('keyword='+enc(query.keyword));if(query?.subject && query.subject !== '全部')q.push('subject='+enc(query.subject));if(query?.teachingMode)q.push('teachingMode='+enc(query.teachingMode));if(query?.minPrice!==undefined)q.push('minPrice='+query.minPrice);if(query?.maxPrice!==undefined)q.push('maxPrice='+query.maxPrice);if(query?.page)q.push('page='+query.page);if(query?.pageSize)q.push('pageSize='+query.pageSize);return apiRequest<Tutor[]>('GET','/api/tutors'+(q.length?'?'+q.join('&'):''),undefined,false) }
 async getTutor(id:string) { try{return await apiRequest<Tutor>('GET','/api/tutors/'+enc(id),undefined,false)}catch(error){if((error as {code?:string}).code==='NOT_FOUND')return null;throw error} }
 getMyApplication(_user:User) { return apiRequest<TutorApplication|null>('GET','/api/tutor-applications/mine') }
 saveApplicationDraft(_user:User,input:TutorApplicationInput) { return apiRequest<TutorApplication>('PUT','/api/tutor-applications/draft',input) }
 submitApplication(_user:User,input:TutorApplicationInput) { return apiRequest<TutorApplication>('POST','/api/tutor-applications',input) }
 listApplications(_admin:User) { return apiRequest<TutorApplication[]>('GET','/api/admin/tutor-applications') }
 getApplication(_admin:User,id:string) { return apiRequest<TutorApplication>('GET','/api/admin/tutor-applications/'+enc(id)) }
 reviewApplication(_admin:User,id:string,decision:'approved'|'rejected',reason?:string) { return apiRequest<TutorApplication>('POST','/api/admin/tutor-applications/'+enc(id)+'/review',{decision,reason}) }
 async createBooking(parent:User,input:BookingInput) {
  const {tutorId,studentName,subject,expectedTime,note}=input
  const fingerprint=JSON.stringify([parent.id,tutorId,studentName,subject,expectedTime,note])
  if(this.pendingBooking?.fingerprint!==fingerprint)this.pendingBooking={fingerprint,requestId:Date.now().toString(36)+Math.random().toString(36).slice(2)}
  const requestId=this.pendingBooking.requestId
  try {
   const result=await apiRequest<BookingOrder>('POST','/api/bookings',{tutorId,studentName,subject,expectedTime,note,requestId})
   this.pendingBooking=null
   return result
  } catch(error) {
   // 网络错误无法确认服务端是否已创建预约；下一次相同提交继续使用同一标识。
   if(!(error instanceof BusinessError)||error.code!=='STORAGE')this.pendingBooking=null
   throw error
  }
 }
 listParentBookings(_parent:User) { return apiRequest<BookingOrder[]>('GET','/api/bookings/mine') }
 listTutorBookings(_tutor:User) { return apiRequest<BookingOrder[]>('GET','/api/bookings/received') }
 getTutorBooking(_tutor:User,id:string) { return apiRequest<BookingOrder>('GET','/api/bookings/'+enc(id)) }
 transitionBooking(_user:User,id:string,action:BookingAction) { return apiRequest<BookingOrder>('POST','/api/bookings/'+enc(id)+'/'+action) }
 createReport(_parent:User,tutorId:string,reason:ReportReason,description:string) { return apiRequest<TutorReport>('POST','/api/reports',{tutorId,reason,description}) }
 listReports(_admin:User) { return apiRequest<TutorReport[]>('GET','/api/admin/reports') }
 resolveReport(_admin:User,id:string) { return apiRequest<TutorReport>('POST','/api/admin/reports/'+enc(id)+'/resolve') }
}
