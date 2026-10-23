import type {StudentArchiveDTO} from '../../shared/student-archive'
import {BusinessError} from './errors'
/** Only an authorized read of a confirmed report can initialize an editable, unpublished lesson. */
export function reportLessonDraft(archive:StudentArchiveDTO,reportId:string,bookingId:string,teacherId:string){
 const report=archive.reports?.find(r=>r.id===reportId&&r.bookingId===bookingId&&r.teacherId===teacherId&&r.confirmedAt)
 if(archive.access!=='learning'||!report)throw new BusinessError('FORBIDDEN','报告未确认、已撤销授权或不属于当前预约教师')
 return{title:'学情复盘与针对训练',previewText:`备课依据（报告 ${report.id}）：\n${report.text}\n\n下一课建议：\n${report.nextLesson}`,homeworkText:`请教师核对并编辑本课训练要求：\n${report.nextLesson}`}
}
