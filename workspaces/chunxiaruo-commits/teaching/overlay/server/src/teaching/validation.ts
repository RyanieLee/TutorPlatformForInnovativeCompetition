import {z} from 'zod'
import {parse} from '../validation'
export const iso=z.string().datetime({offset:true})
export const lessonFields={title:z.string().trim().min(1).max(80),scheduledAt:iso,previewText:z.string().max(10000),homeworkText:z.string().trim().min(1).max(10000),dueAt:iso.nullable()}
export const lessonCreate=z.object({...lessonFields,requestId:z.string().min(8).max(100)}).strict()
export const lessonUpdate=z.object({...lessonFields,version:z.number().int().positive()}).strict()
export const publishSchema=z.object({version:z.number().int().positive(),attachmentIds:z.array(z.string().min(1).max(100)).max(10)}).strict()
export const submissionSchema=z.object({requestId:z.string().min(8).max(100),note:z.string().max(2000),attachmentIds:z.array(z.string().min(1).max(100)).min(1).max(5)}).strict()
export const purposeSchema=z.object({purpose:z.enum(['preview','homework','submission'])}).strict()
export function pageQuery(input:unknown){
 const schema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}).strict()
 return parse(schema,input)
}
export function idParam(input:unknown,key:string):string{return parse(z.object({[key]:z.string().min(1).max(100)}),input)[key]}
export const fingerprint=(value:unknown)=>JSON.stringify(value)

