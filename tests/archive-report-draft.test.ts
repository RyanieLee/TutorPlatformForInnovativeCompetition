import {it,expect} from 'vitest'
import {reportLessonDraft} from '../src/services/archive-report-draft'
import type {StudentArchiveDTO} from '../shared/student-archive'
const dto={id:'student',access:'learning',reports:[{id:'report',bookingId:'b1',teacherId:'t1',confirmedAt:'2026-10-23',text:'实际作答依据',nextLesson:'复盘通分步骤'}]} as StudentArchiveDTO
it('只有归属教师可以把已确认报告导入相同预约的新课草稿',()=>{
 expect(reportLessonDraft(dto,'report','b1','t1')).toMatchObject({previewText:expect.stringContaining('复盘通分步骤')})
 expect(()=>reportLessonDraft(dto,'report','other','t1')).toThrow()
 expect(()=>reportLessonDraft(dto,'report','b1','other')).toThrow()
 expect(()=>reportLessonDraft({...dto,reports:[{...dto.reports![0]!,confirmedAt:undefined}]},'report','b1','t1')).toThrow()
})
