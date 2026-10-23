import {describe,it,expect} from 'vitest'
import {createArchive,applyArchiveCommand,projectArchive,SAMPLE_ANALYSIS} from '../../shared/student-archive-engine'
import type {ArchiveContext,ArchiveState,ArchiveCommand} from '../../shared/student-archive'
const now='2026-10-23T12:00:00Z'
const booking={id:'booking-1',parentId:'parent',teacherId:'teacher',teacherName:'老师',subject:'数学',status:'accepted'}
const ctx=(id='parent',role='parent'):ArchiveContext=>({actor:{id,role},bookings:[booking],now})
let serial=0
function act(s:ArchiveState,type:string,payload:any,c=ctx()){return applyArchiveCommand(s,{type,payload,requestId:'request-'+(++serial),expectedRevision:s.revision} as ArchiveCommand,c)}
function bound(){return act(createArchive('student-1','parent',{nickname:'同名',grade:'五年级',goals:'分数'},now),'bindBooking',{bookingId:booking.id})}
function granted(){let s=bound();s=act(s,'recordTrial',{bookingId:booking.id,observation:'能列式，需检查分母'},ctx('teacher','tutor'));s=act(s,'confirmTrial',{trialId:s.trials[0].id});return act(s,'grant',{bookingId:booking.id,level:'learning',expiresAt:'2026-12-01T00:00:00Z'})}

it('reserves bounded revocation capacity even after a teacher fills the mutation receipt quota',()=>{
 const s=granted();s.receipts=Array.from({length:2000},(_,i)=>({requestId:'filled-'+i,actorId:'teacher',fingerprint:'fixture'}))
 const command:ArchiveCommand={type:'revoke',payload:{bookingId:booking.id},requestId:'guardian-reserved-revoke',expectedRevision:s.revision}
 const revoked=applyArchiveCommand(s,command,ctx())
 expect(projectArchive(revoked,ctx('teacher','tutor')).access).toBe('basic')
 expect(applyArchiveCommand(revoked,command,ctx())).toBe(revoked)
 expect(()=>act(revoked,'grant',{bookingId:booking.id,level:'learning',expiresAt:'2026-12-01T00:00:00Z'})).toThrow(/上限/)
 const again=act(revoked,'revoke',{bookingId:booking.id});expect(again).toBe(revoked);expect(again.receipts).toHaveLength(2001)
})
describe('archive access and continuity',()=>{
 it('keeps stable identities and refuses unrelated actors including administrators',()=>{
  const s=bound();expect(s.id).toBe('student-1');expect(createArchive('student-2','parent',{nickname:'同名',grade:'五年级',goals:'分数'},now).id).toBe('student-2')
  for(const c of [ctx('other','parent'),ctx('other','tutor'),ctx('admin','admin')])expect(()=>projectArchive(s,c)).toThrow()
  const view=projectArchive(s,ctx('teacher','tutor'));expect(view.access).toBe('basic');expect(view).not.toHaveProperty('reviews');expect(view).not.toHaveProperty('receipts')
 })
 it('requires guardian confirmed trial, expires and revokes teacher access',()=>{
  expect(()=>act(bound(),'grant',{bookingId:booking.id,level:'learning',expiresAt:'2026-12-01T00:00:00Z'})).toThrow()
  const s=granted();expect(projectArchive(s,ctx('teacher','tutor')).access).toBe('learning')
  expect(projectArchive(s,{...ctx('teacher','tutor'),now:'2027-01-01T00:00:00Z'}).access).toBe('basic')
  expect(projectArchive(act(s,'revoke',{bookingId:booking.id}),ctx('teacher','tutor')).access).toBe('basic')
 })
 it('deduplicates identical commands while rejecting changed payload and stale revision',()=>{
  const s=bound(),c:ArchiveCommand={type:'updateProfile',payload:{nickname:'同名',grade:'六年级',goals:'方程'},requestId:'stable-request',expectedRevision:s.revision}
  const next=applyArchiveCommand(s,c,ctx());expect(applyArchiveCommand(next,c,ctx())).toBe(next)
  expect(()=>applyArchiveCommand(next,{...c,payload:{...c.payload,goals:'其他'}},ctx())).toThrow(/请求/)
  expect(()=>applyArchiveCommand(next,{...c,requestId:'new-request'},ctx())).toThrow(/刷新/)
 })
 it('requires consent, own teacher confirmation and real attempts before a confirmed report enters a parent handover',()=>{
  let s=granted();const input={bookingId:booking.id,question:'1/2 + 1/3',answer:'2/5',referenceAnswer:'5/6',consent:false,mode:'sample'}
  expect(()=>act(s,'createReview',input)).toThrow()
  s=act(s,'createReview',{...input,consent:true},{...ctx(),generatedAnalysis:SAMPLE_ANALYSIS});const r=s.reviews[0]
  expect(()=>act(s,'confirmReview',{reviewId:r.id,teacherNote:'核对'},ctx())).toThrow()
  expect(projectArchive(s,ctx('teacher','tutor')).reviews).toHaveLength(1)
  s=act(s,'confirmReview',{reviewId:r.id,teacherNote:'检查通分'},ctx('teacher','tutor'))
  expect(()=>act(s,'saveReport',{reviewId:r.id,text:'事实',nextLesson:'再练习'},ctx('teacher','tutor'))).toThrow()
  s=act(s,'submitAttempt',{reviewId:r.id,answers:[{questionId:r.analysis.questions[0].id,answer:'5/6'}]})
  s=act(s,'saveReport',{reviewId:r.id,text:'完成1题，仍需核对步骤',nextLesson:'复习通分'},ctx('teacher','tutor'))
  expect(()=>act(s,'handover',{reportIds:[s.reports[0].id]})).toThrow()
  s=act(s,'confirmReport',{reportId:s.reports[0].id},ctx('teacher','tutor'))
  s=act(s,'handover',{reportIds:[s.reports[0].id],revokeBookingId:booking.id})
  expect(s.handovers[0].snapshots[0].text).toContain('完成1题');expect(projectArchive(s,ctx('teacher','tutor')).access).toBe('basic')
 })
})
it('keeps summary grants free of raw answers and prevents another granted teacher from reviewing this booking',()=>{
 let s=granted(),c=ctx();const second={...booking,id:'booking-2',teacherId:'teacher-2'};c={...c,bookings:[booking,second]}
 s=act(s,'bindBooking',{bookingId:second.id},c)
 s=act(s,'recordTrial',{bookingId:second.id,observation:'独立试课'},{...c,actor:{id:'teacher-2',role:'tutor'}})
 s=act(s,'confirmTrial',{trialId:s.trials[1].id},c)
 s=act(s,'grant',{bookingId:second.id,level:'summary',expiresAt:'2026-12-01T00:00:00Z'},c)
 s=act(s,'createReview',{bookingId:booking.id,question:'1/2+1/3',answer:'2/5',referenceAnswer:'5/6',consent:true,mode:'sample'},{...c,generatedAnalysis:SAMPLE_ANALYSIS})
 const other={...c,actor:{id:'teacher-2',role:'tutor'}}
 const summary=projectArchive(s,other);expect(summary.access).toBe('summary');expect(summary).not.toHaveProperty('reviews');expect(JSON.stringify(summary)).not.toContain('2/5')
 s=act(s,'grant',{bookingId:second.id,level:'learning',expiresAt:'2026-12-01T00:00:00Z'},c)
 expect(()=>act(s,'confirmReview',{reviewId:s.reviews[0].id,teacherNote:'跨教师修改'},other)).toThrow()
 expect(()=>act(s,'reviseReview',{reviewId:s.reviews[0].id,analysis:SAMPLE_ANALYSIS,teacherNote:'跨教师修改'},other)).toThrow()
})
it('turns cancelled-booking grants into basic views and stops clinical-looking unbounded or malformed evidence',()=>{
 let s=granted();s=act(s,'createReview',{bookingId:booking.id,question:'题目',answer:'答案',referenceAnswer:'参考',consent:true,mode:'sample'},{...ctx(),generatedAnalysis:SAMPLE_ANALYSIS})
 s=act(s,'confirmReview',{reviewId:s.reviews[0].id,teacherNote:'确认'},ctx('teacher','tutor'))
 expect(()=>act(s,'submitAttempt',{reviewId:s.reviews[0].id,answers:[null]})).toThrow()
 const view=projectArchive(s,{...ctx('teacher','tutor'),bookings:[{...booking,status:'cancelled'}]});expect(view.access).toBe('basic');expect(view).not.toHaveProperty('reviews')
 const full={...s,observations:Array.from({length:200},(_,i)=>({id:String(i),bookingId:booking.id,teacherId:'teacher',text:'事实',createdAt:now}))}
 expect(()=>act(full,'observe',{bookingId:booking.id,text:'更多记录'},ctx('teacher','tutor'))).toThrow(/200/)
})
it('lets only the booking teacher correct bounded analysis before confirmation while preserving provenance',()=>{
 let s=granted();s=act(s,'createReview',{bookingId:booking.id,question:'分数题',answer:'2/5',referenceAnswer:'5/6',consent:true,mode:'sample'},{...ctx(),generatedAnalysis:SAMPLE_ANALYSIS});const reviewId=s.reviews[0].id
 const correction={...SAMPLE_ANALYSIS,analysis:'已核对原作答，错误出在未通分。',questions:[{id:'edited-q1',stem:'计算1/4+1/2',answer:'3/4',explanation:'1/4+2/4=3/4'}]}
 expect(()=>act(s,'reviseReview',{reviewId,analysis:correction,teacherNote:'教师已核对'},ctx())).toThrow()
 s=act(s,'reviseReview',{reviewId,analysis:correction,teacherNote:'教师已核对'},ctx('teacher','tutor'))
 expect(s.reviews[0].analysis.questions[0].id).toBe('edited-q1');expect(s.reviews[0].source).toBe('sample');expect(s.reviews[0].revisedAt).toBe(now)
 for(const bad of [null,{...correction,score:99},{...correction,questions:[null]},{...correction,questions:[correction.questions[0],correction.questions[0]]}])expect(()=>act(s,'reviseReview',{reviewId,analysis:bad,teacherNote:'修改'},ctx('teacher','tutor'))).toThrow()
 s=act(s,'confirmReview',{reviewId,teacherNote:'确认'},ctx('teacher','tutor'))
 expect(()=>act(s,'reviseReview',{reviewId,analysis:correction,teacherNote:'再次修改'},ctx('teacher','tutor'))).toThrow()
})
it('allows only the observation author with current booking permission to edit facts and preserves creation time',()=>{
 let s=granted();s=act(s,'observe',{bookingId:booking.id,text:'完成1题'},ctx('teacher','tutor'));const original=s.observations[0],observationId=original.id
 expect(()=>act(s,'updateObservation',{observationId,text:'家长改写'},ctx())).toThrow()
 s=act(s,'updateObservation',{observationId,text:'核对后：完成1题，需补步骤'},{...ctx('teacher','tutor'),now:'2026-10-24T12:00:00Z'})
 expect(s.observations[0].text).toContain('需补步骤');expect(s.observations[0].createdAt).toBe(now);expect(s.observations[0].updatedAt).toBe('2026-10-24T12:00:00Z')
 s=act(s,'revoke',{bookingId:booking.id});expect(()=>act(s,'updateObservation',{observationId,text:'失效后修改'},ctx('teacher','tutor'))).toThrow()
})
