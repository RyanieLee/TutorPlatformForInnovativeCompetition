/** 演示数据类型，真实服务接入前需要制定正式 API 契约。 */
export type TeachingMode = '线上' | '线下' | '均可'
export interface Tutor { id:string; name:string; university:string; major:string; subjects:string[]; area:string; pricePerHour:number; teachingMode:TeachingMode; introduction:string; tags:string[] }
export type BookingStatus = '待沟通' | '已取消'
export interface BookingInput { tutorId:string; tutorName:string; studentName:string; contact:string; subject:string; expectedTime:string; note:string }
export interface BookingOrder extends BookingInput { id:string; createdAt:string; status:BookingStatus }
