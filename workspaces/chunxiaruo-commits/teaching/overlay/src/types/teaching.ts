import type {BookingOrder} from './tutor'
export interface Page<T>{data:T[];meta:{total:number;page:number;pageSize:number}}
export type AttachmentPurpose='preview'|'homework'|'submission'
export interface AttachmentDto{id:string;originalName:string;mediaType:string;size:number;purpose:AttachmentPurpose;createdAt:string}
export interface LessonInput{title:string;scheduledAt:string;previewText:string;homeworkText:string;dueAt:string|null}
export interface LessonDto extends LessonInput{id:string;bookingId:string;status:'draft'|'published';version:number;publishedAt:string|null;createdAt:string;updatedAt:string;attachments:AttachmentDto[];pendingAttachments?:AttachmentDto[]}
export interface SubmissionDto{id:string;lessonId:string;revision:number;note:string;submittedAt:string;late:boolean;attachments:AttachmentDto[]}
export interface SubmissionInput{requestId?:string;note:string;attachmentIds:string[]}
export interface PublishInput{version:number;attachmentIds:string[]}
export interface SelectedFile{path:string;name:string;size:number}
export interface UploadJob{promise:Promise<AttachmentDto>;abort:()=>void}
export interface DownloadedFile{url:string;name:string;mediaType:string;dispose:()=>void}
export interface TeachingService{
 getBooking(id:string):Promise<BookingOrder>
 discardAttachment(id:string):Promise<{id:string}>
 listLessons(bookingId:string,page?:number,pageSize?:number):Promise<Page<LessonDto>>
 getLesson(id:string):Promise<LessonDto>
 createLesson(bookingId:string,input:LessonInput,requestId?:string):Promise<LessonDto>
 saveLesson(id:string,input:LessonInput,version:number):Promise<LessonDto>
 publishLesson(id:string,input:PublishInput):Promise<LessonDto>
 listSubmissions(id:string,page?:number,pageSize?:number):Promise<Page<SubmissionDto>>
 submitHomework(id:string,input:SubmissionInput):Promise<SubmissionDto>
 uploadAttachment(id:string,purpose:AttachmentPurpose,file:SelectedFile,onProgress?:(progress:number)=>void):UploadJob
 downloadAttachment(attachment:AttachmentDto):Promise<DownloadedFile>
}

