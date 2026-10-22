import type {PrismaClient} from '@prisma/client'
export interface TeachingOptions {uploadRoot:string;now:()=>Date}
export type Database=PrismaClient
export type AttachmentPurpose='preview'|'homework'|'submission'
export interface LessonInput {title:string;scheduledAt:string;previewText:string;homeworkText:string;dueAt:string|null}

