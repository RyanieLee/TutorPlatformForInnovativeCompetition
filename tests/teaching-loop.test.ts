import {describe,it,expect} from 'vitest'
import {createLoop,applyCommand,parentView,validateCourse,makePresetFeedback,makePresetRevision} from '../server/src/teaching-loop/engine'
import course from '../server/src/teaching-loop/course.json'
const time='2026-10-22T10:00:00.000Z'
let serial=0
function send(state:any,type:string,payload:any={}){return applyCommand(state,{requestId:'test-command-'+(++serial),expectedRevision:state.revision,type,payload},time)}
function setup(){return send(createLoop('booking-1'),'initialize')}
function record(state:any){return send(state,'record',{lessonId:'L2',date:'2026-10-22',completed:'完成合并同类项及移项练习',goalMet:'部分达成',results:[1,2,3,4,5].map(n=>({questionId:'L2-Q'+n,correct:n<=3})),errorTypes:['移项符号'],observation:'Q4和Q5中负号与移项出现符号错误；简单合并同类项正确。',questions:'负系数移项后符号如何变化？',consolidation:'带负号移项'})}
function feedback(state:any){const r=state.records.at(-1);state=send(state,'feedback',{recordId:r.id,feedback:makePresetFeedback(state,r.id,time)});return send(state,'publishFeedback',{feedbackId:state.feedbacks.at(-1).id})}
describe('预约教学闭环',()=>{
 it('contains four teachable lessons, exactly45 minutes each and independently checked algebra answers',()=>{
  expect(()=>validateCourse(course)).not.toThrow();expect(course.lessons).toHaveLength(4)
  const expected=[[8,6,17],[4,3,3,2,2],[7,7,4]]
  for(let i=0;i<3;i++)for(let j=0;j<expected[i].length;j++)expect(course.lessons[i].exercises[j].answer).toBe('x = '+expected[i][j])
  expect(course.lessons[3].exercises.map(q=>q.answer)).toEqual(['女生18人，男生24人','80元','A类票7张，B类票10张'])
  for(const lesson of course.lessons){expect(lesson.blocks.reduce((n,b)=>n+b.minutes,0)).toBe(45);expect(lesson.exercises.length).toBeGreaterThanOrEqual(3);expect(lesson.homework.length).toBeGreaterThan(10)}
  const wrong=structuredClone(course);wrong.lessons[0].blocks[0].minutes=6;expect(()=>validateCourse(wrong)).toThrow()
 })
 it('hides drafts and private classroom observations from the parent',()=>{
  let s=setup();expect(parentView(s).plan).toBeNull();s=send(s,'publish')
  s=record(s);expect(parentView(s).plan?.version).toBe(1);expect(parentView(s)).not.toHaveProperty('records');expect(parentView(s).feedbacks).toHaveLength(0)
  s=send(s,'saveDraft',{course:{...s.versions[0].course,goal:'教师尚未发布的新目标'}})
  expect(parentView(s).plan?.course.goal).not.toContain('尚未发布')
 })
 it('computes3/5 from question facts and ties consolidation to Q4/Q5',()=>{
  let s=record(send(setup(),'publish'));const f=makePresetFeedback(s,s.records[0].id,time)
  expect(f.correct).toBe(3);expect(f.total).toBe(5);expect(f.percent).toBe(60)
  expect(f.consolidation[0].evidenceRefs).toEqual(['L2-Q4','L2-Q5','teacher-observation']);expect(f.source).toBe('preset')
  expect(parentView(feedback(s)).feedbacks[0].report).toContain('3/5')
 })
 it('rejects invented evidence and incomplete question records',()=>{
  let s=record(send(setup(),'publish'));const f=makePresetFeedback(s,s.records[0].id,time);f.consolidation[0].evidenceRefs=['invented']
  expect(()=>send(s,'feedback',{recordId:s.records[0].id,feedback:f})).toThrow()
  expect(()=>send(s,'record',{...s.records[0],results:[{questionId:'L2-Q1',correct:true}]})).toThrow()
 })
 it('requires confirmed feedback before suggesting changes and preserves v1 when v2 is published',()=>{
  let s=record(send(setup(),'publish'));expect(()=>makePresetRevision(s,time)).toThrow()
  s=feedback(s);const proposal=makePresetRevision(s,time);expect(proposal.evidenceRefs).toContain('L2-Q4');expect(proposal.course.lessons[2].blocks.reduce((n:any,b:any)=>n+b.minutes,0)).toBe(45)
  s=send(s,'suggest',{suggestion:proposal});expect(parentView(s)).not.toHaveProperty('suggestions')
  s=send(s,'applyRevision',{suggestionId:s.suggestions[0].id});expect(s.versions).toHaveLength(1);expect(parentView(s).plan?.version).toBe(1)
  s=send(s,'publish');expect(s.versions).toHaveLength(2);expect(parentView(s).plan?.version).toBe(2)
  expect(s.versions[0].course.lessons[2].blocks.find((b:any)=>b.id==='denominator')?.minutes).toBe(12)
  expect(s.versions[1].course.lessons[2].blocks.some((b:any)=>b.teacher.includes('符号专项'))).toBe(true)
 })
 it('does not duplicate a command, rejects stale edits and reused identifiers with changed payload',()=>{
  const s=setup(),cmd:any={requestId:'request-once',expectedRevision:s.revision,type:'publish',payload:{}}
  const after=applyCommand(s,cmd,time);expect(applyCommand(after,cmd,time)).toEqual(after)
  expect(()=>applyCommand(after,{...cmd,payload:{different:true}},time)).toThrow()
  expect(()=>applyCommand(after,{...cmd,requestId:'stale-request',type:'saveDraft',payload:{course}},time)).toThrow()
 })
 it('invalidates old feedback and suggestions when new facts are recorded',()=>{
  let s=feedback(record(send(setup(),'publish')));s=send(s,'suggest',{suggestion:makePresetRevision(s,time)});const old=s.suggestions[0].id
  s=record(s);expect(()=>send(s,'applyRevision',{suggestionId:old})).toThrow()
  expect(()=>makePresetRevision(s,time)).toThrow()
 })
 it('can reject suggestions and discard an unpublished draft without overwriting history',()=>{
  let s=feedback(record(send(setup(),'publish')));s=send(s,'suggest',{suggestion:makePresetRevision(s,time)})
  s=send(s,'rejectRevision',{suggestionId:s.suggestions[0].id});expect(()=>send(s,'applyRevision',{suggestionId:s.suggestions[0].id})).toThrow()
  s=send(s,'saveDraft',{course:{...course,goal:'临时修改目标'}});s=send(s,'discardDraft');expect(s.draft).toBeNull();expect(s.versions).toHaveLength(1)
 })
 it('does not apply the same classroom feedback repeatedly to later published versions',()=>{
  let s=feedback(record(send(setup(),'publish')));s=send(s,'suggest',{suggestion:makePresetRevision(s,time)});s=send(s,'applyRevision',{suggestionId:s.suggestions[0].id});s=send(s,'publish')
  expect(()=>makePresetRevision(s,time)).toThrowError(/已用于修订/)
 })
 it('returns a validation error for impossible classroom dates',()=>{
  const s=send(setup(),'publish'),valid=record(s).records[0]
  const {id,createdAt,planVersion,...input}=valid
  expect(()=>send(s,'record',{...input,date:'2026-99-99'})).toThrowError(expect.objectContaining({code:'INVALID'}))
 })
 it('rejects diff descriptions that do not match the proposed course',()=>{
  const s=feedback(record(send(setup(),'publish'))),p=makePresetRevision(s,time)
  p.changes[0].proposedBlock='凭空添加的变化，没有对应课表环节'
  expect(()=>send(s,'suggest',{suggestion:p})).toThrow()
 })
})
