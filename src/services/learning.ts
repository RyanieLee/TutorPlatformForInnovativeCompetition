import { apiMode } from '../config/runtime'
import { apiRequest } from './api/client'
import type { ExamPaper, PaperRequest } from '../../shared/learning'
export async function examModelStatus():Promise<{enabled:boolean}>{return apiMode?apiRequest('GET','/api/learning/status',undefined,false):{enabled:false}}
export function generateExam(input:PaperRequest):Promise<ExamPaper>{return apiRequest('POST','/api/learning/exams',input)}
