import {BusinessError} from '../errors'
import type {TeachingService,AttachmentDto,AttachmentPurpose,SelectedFile,LessonInput,PublishInput,SubmissionInput} from '../../types/teaching'
export class MockTeachingService implements TeachingService{
 async getBooking(_id:string):Promise<any>{return this.unavailable()}
 async discardAttachment(_id:string):Promise<any>{return this.unavailable()}
 private unavailable():never{throw new BusinessError('STORAGE','课件与作业收交需要 API 审核模式；本机模拟不能跨账号、跨设备保存文件')}
 async listLessons(_bookingId:string,_page?:number,_pageSize?:number):Promise<any>{return this.unavailable()}
 async getLesson(_id:string):Promise<any>{return this.unavailable()}
 async createLesson(_id:string,_input:LessonInput,_requestId?:string):Promise<any>{return this.unavailable()}
 async saveLesson(_id:string,_input:LessonInput,_version:number):Promise<any>{return this.unavailable()}
 async publishLesson(_id:string,_input:PublishInput):Promise<any>{return this.unavailable()}
 async listSubmissions(_id:string,_page?:number,_pageSize?:number):Promise<any>{return this.unavailable()}
 async submitHomework(_id:string,_input:SubmissionInput):Promise<any>{return this.unavailable()}
 uploadAttachment(_id:string,_purpose:AttachmentPurpose,_file:SelectedFile){return{promise:Promise.reject(new BusinessError('STORAGE','模拟模式不能真实上传作业，请使用 API 审核版')),abort(){}}}
 async downloadAttachment(_attachment:AttachmentDto):Promise<any>{return this.unavailable()}
}

