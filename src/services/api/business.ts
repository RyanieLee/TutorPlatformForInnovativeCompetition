import type { BusinessService } from '../contracts'
import type { User } from '../../types/auth'
import type { Tutor, BookingInput, BookingOrder } from '../../types/tutor'
import type { TutorApplication, TutorApplicationInput, ReportReason, TutorReport } from '../../types/business'
import type { BookingAction } from '../rules'
import { apiRequest } from './client'
const enc = encodeURIComponent
export class ApiBusinessService implements BusinessService {
 listTutors(query?:{keyword?:string;subject?:string}) { const q:string[]=[];if(query?.keyword)q.push('keyword='+enc(query.keyword));if(query?.subject && query.subject !== '全部')q.push('subject='+enc(query.subject));return apiRequest<Tutor[]>('GET','/api/tutors'+(q.length?'?'+q.join('&'):''),undefined,false) }
 async getTutor(id:string) { try{return await apiRequest<Tutor>('GET','/api/tutors/'+enc(id),undefined,false)}catch(error){if((error as {code?:string}).code==='NOT_FOUND')return null;throw error} }
 getMyApplication(_user:User) { return apiRequest<TutorApplication|null>('GET','/api/tutor-applications/mine') }
 saveApplicationDraft(_user:User,input:TutorApplicationInput) { return apiRequest<TutorApplication>('PUT','/api/tutor-applications/draft',input) }
 submitApplication(_user:User,input:TutorApplicationInput) { return apiRequest<TutorApplication>('POST','/api/tutor-applications',input) }
 listApplications(_admin:User) { return apiRequest<TutorApplication[]>('GET','/api/admin/tutor-applications') }
 getApplication(_admin:User,id:string) { return apiRequest<TutorApplication>('GET','/api/admin/tutor-applications/'+enc(id)) }
 reviewApplication(_admin:User,id:string,decision:'approved'|'rejected',reason?:string) { return apiRequest<TutorApplication>('POST','/api/admin/tutor-applications/'+enc(id)+'/review',{decision,reason}) }
 createBooking(_parent:User,input:BookingInput) { const {tutorId,studentName,subject,expectedTime,note}=input;return apiRequest<BookingOrder>('POST','/api/bookings',{tutorId,studentName,subject,expectedTime,note,requestId:Date.now().toString(36)+Math.random().toString(36).slice(2)}) }
 listParentBookings(_parent:User) { return apiRequest<BookingOrder[]>('GET','/api/bookings/mine') }
 listTutorBookings(_tutor:User) { return apiRequest<BookingOrder[]>('GET','/api/bookings/received') }
 getTutorBooking(_tutor:User,id:string) { return apiRequest<BookingOrder>('GET','/api/bookings/'+enc(id)) }
 transitionBooking(_user:User,id:string,action:BookingAction) { return apiRequest<BookingOrder>('POST','/api/bookings/'+enc(id)+'/'+action) }
 createReport(_parent:User,tutorId:string,reason:ReportReason,description:string) { return apiRequest<TutorReport>('POST','/api/reports',{tutorId,reason,description}) }
 listReports(_admin:User) { return apiRequest<TutorReport[]>('GET','/api/admin/reports') }
 resolveReport(_admin:User,id:string) { return apiRequest<TutorReport>('POST','/api/admin/reports/'+enc(id)+'/resolve') }
}
