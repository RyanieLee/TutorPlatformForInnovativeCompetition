import {beforeEach,afterEach,it,expect} from 'vitest'
import Fastify from 'fastify'
import {teachingHarness} from './teaching-fixtures'
import {ApiError} from '../src/core'
import {registerStudentArchives} from '../src/student-archive/routes'
import {SAMPLE_ANALYSIS} from '../../shared/student-archive-engine'
let h:Awaited<ReturnType<typeof teachingHarness>>,app:ReturnType<typeof Fastify>,seq=0
const model={enabled:false,async reply(_messages:unknown){return JSON.stringify(SAMPLE_ANALYSIS)}}
beforeEach(async()=>{h=await teachingHarness();app=Fastify();app.setErrorHandler((e,_q,r)=>{if(e instanceof ApiError)return r.code(e.status).send({error:{code:e.code,message:e.message}});return r.code(500).send({error:{message:e.message}})});registerStudentArchives(app,h.db,model);await app.ready()})
afterEach(async()=>{await app.close();await h.app.close();model.enabled=false})
function req(method:string,url:string,who:any,payload?:unknown){return app.inject({method:method as any,url,headers:who?{authorization:'Bearer '+who.token}:{},...(payload===undefined?{}:{payload})})}
async function create(){const r=await req('POST','/api/student-archives',h.parent,{nickname:'同名学生',grade:'五年级',goals:'分数',requestId:'create-'+(++seq)});expect(r.statusCode).toBe(200);return r.json().data}
async function action(s:any,type:string,payload:any,who=h.parent){return req('POST','/api/student-archives/'+s.id+'/actions',who,{type,payload,requestId:'action-'+(++seq),expectedRevision:s.revision})}
async function ready(){let s=await create();s=(await action(s,'bindBooking',{bookingId:h.booking.id})).json().data;s=(await action(s,'recordTrial',{bookingId:h.booking.id,observation:'核对分母'},h.tutor)).json().data;s=(await action(s,'confirmTrial',{trialId:s.trials[0].id})).json().data;s=(await action(s,'grant',{bookingId:h.booking.id,level:'learning',expiresAt:new Date(Date.now()+30*86400000).toISOString()})).json().data;return s}
const input=()=>({bookingId:h.booking.id,question:'1/2 + 1/3',answer:'2/5',referenceAnswer:'5/6',mode:'sample',consent:true})
it('rejects inherited JavaScript names as actions without letting a basic teacher mutate the archive',async()=>{
 let s=await create();s=(await action(s,'bindBooking',{bookingId:h.booking.id})).json().data
 for(const type of ['toString','constructor','__proto__'])expect((await action(s,type,{},h.tutor)).statusCode).toBe(400)
 await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}})
 for(const type of ['toString','constructor','__proto__'])expect((await action(s,type,{},h.tutor)).statusCode).toBe(400)
 expect((await req('GET','/api/student-archives/'+s.id,h.parent)).json().data.revision).toBe(s.revision)
})
it('keeps guardian revocation available at both the byte and receipt capacity limits',async()=>{
 const s=await ready(),row=await h.db.studentArchive.findUniqueOrThrow({where:{id:s.id}}),state=JSON.parse(row.stateJson)
 state.receipts=Array.from({length:2000},(_,i)=>({requestId:'capacity-'+i,actorId:h.tutor.id,fingerprint:'x'.repeat(850)}))
 const bytes=Buffer.byteLength(JSON.stringify(state),'utf8'),missing=1_999_999-bytes
 expect(missing).toBeGreaterThan(0)
 for(let i=0,left=missing;left>0;i++){const add=Math.min(5000,left);state.receipts[i].fingerprint+='x'.repeat(add);left-=add}
 expect(Buffer.byteLength(JSON.stringify(state),'utf8')).toBe(1_999_999)
 await h.db.studentArchive.update({where:{id:s.id},data:{stateJson:JSON.stringify(state)}})
 const result=await action(s,'revoke',{bookingId:h.booking.id});expect(result.statusCode).toBe(200)
 expect((await req('GET','/api/student-archives/'+s.id,h.tutor)).json().data.access).toBe('basic')
 const stored=JSON.parse((await h.db.studentArchive.findUniqueOrThrow({where:{id:s.id}})).stateJson)
 expect(stored.receipts).toHaveLength(2001)
})
it('returns compact archive cards in lists and loads private records only through an authorized detail read',async()=>{
 let s=await ready();s=(await action(s,'createReview',input())).json().data
 const cards=(await req('GET','/api/student-archives',h.parent)).json().data
 expect(cards.find((a:any)=>a.id===s.id)).not.toHaveProperty('reviews')
 expect((await req('GET','/api/student-archives/'+s.id,h.parent)).json().data.reviews).toHaveLength(1)
})
it('persists separate same-name archives, enforces owner binding and minimal teacher DTO',async()=>{
 const a=await create(),b=await create();expect(a.id).not.toBe(b.id)
 expect((await action(a,'bindBooking',{bookingId:h.otherBooking.id})).statusCode).toBe(404)
 const bound=await action(a,'bindBooking',{bookingId:h.booking.id});expect(bound.statusCode).toBe(200)
 expect((await action(b,'bindBooking',{bookingId:h.booking.id})).statusCode).toBe(409)
 const view=await req('GET','/api/student-archives/'+a.id,h.tutor);expect(view.statusCode).toBe(200);expect(view.json().data.access).toBe('basic');expect(view.json().data).not.toHaveProperty('reviews')
 for(const who of [h.otherParent,h.otherTutor,h.admin])expect((await req('GET','/api/student-archives/'+a.id,who)).statusCode).toBeGreaterThanOrEqual(403)
 const row=await h.db.studentArchive.findUnique({where:{id:a.id}});expect(row?.revision).toBe(1)
})
it('rejects unconsented, forged, foreign-submission and unavailable model reviews',async()=>{
 const s=await ready()
 expect((await action(s,'createReview',{...input(),consent:false})).statusCode).toBe(400)
 expect((await action(s,'createReview',{...input(),source:'model'})).statusCode).toBe(400)
 expect((await action(s,'createReview',{...input(),submissionId:'not-owned'})).statusCode).toBe(404)
 expect((await action(s,'createReview',{...input(),mode:'model'})).statusCode).toBe(503)
 const sample=await action(s,'createReview',input());expect(sample.statusCode).toBe(200);expect(sample.json().data.reviews[0].source).toBe('sample')
})
it('rejects malformed model output without storing a partial analysis',async()=>{
 const s=await ready();model.enabled=true;const old=model.reply;model.reply=async()=>'{"analysis":"unvalidated"}'
 try{const r=await action(s,'createReview',{...input(),mode:'model'});expect(r.statusCode).toBe(502);const read=await req('GET','/api/student-archives/'+s.id,h.parent);expect(read.json().data.reviews).toHaveLength(0)}finally{model.reply=old}
})
it('rechecks guardian session, revision and booking after an awaited model call',async()=>{
 const s=await ready();model.enabled=true;let release!:()=>void,entered!:()=>void;const started=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r),old=model.reply
 model.reply=async()=>{entered();await gate;return JSON.stringify(SAMPLE_ANALYSIS)}
 try{const pending=action(s,'createReview',{...input(),mode:'model'});await started;await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}});release();expect((await pending).statusCode).toBe(409);expect((await req('GET','/api/student-archives/'+s.id,h.parent)).json().data.reviews).toHaveLength(0)}finally{release();model.reply=old}
})
it('does not leak learning data after grant revocation and rejects changed idempotency payload',async()=>{
 let s=await ready();s=(await action(s,'createReview',input())).json().data
 const cmd={type:'revoke',payload:{bookingId:h.booking.id},requestId:'same-revoke-request-'+(++seq),expectedRevision:s.revision}
 const url='/api/student-archives/'+s.id+'/actions';expect((await req('POST',url,h.parent,cmd)).statusCode).toBe(200);expect((await req('POST',url,h.parent,cmd)).statusCode).toBe(200)
 expect((await req('POST',url,h.parent,{...cmd,type:'bindBooking'})).statusCode).toBe(409)
 const teacher=(await req('GET','/api/student-archives/'+s.id,h.tutor)).json().data;expect(teacher.access).toBe('basic');expect(teacher).not.toHaveProperty('reviews')
})

it('revalidates real submission ownership and records the server-verified source',async()=>{
 const s=await ready(),lesson=await h.db.lesson.create({data:{bookingId:h.booking.id,title:'作业',scheduledAt:new Date(),homeworkText:'分数',requestId:'source-lesson-'+(++seq),requestFingerprint:'fixture'}})
 const row=await h.db.homeworkSubmission.create({data:{lessonId:lesson.id,parentId:h.parent.id,revision:1,requestId:'source-submission-'+(++seq),requestFingerprint:'fixture',note:'文字作答',submittedAt:new Date(),late:false}})
 const saved=await action(s,'createReview',{...input(),submissionId:row.id});expect(saved.statusCode).toBe(200);expect(saved.json().data.reviews[0].submissionId).toBe(row.id)
})
it.each(['revision','session','model'])('rejects an awaited model result when %s changes',async kind=>{
 const s=await ready();model.enabled=true;let release!:()=>void,entered!:()=>void;const started=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r),old=model.reply
 model.reply=async()=>{entered();await gate;return JSON.stringify(SAMPLE_ANALYSIS)}
 try{const pending=action(s,'createReview',{...input(),mode:'model'});await started
  if(kind==='revision')expect((await action(s,'revoke',{bookingId:h.booking.id})).statusCode).toBe(200)
  if(kind==='session')await h.db.session.updateMany({where:{userId:h.parent.id},data:{revokedAt:new Date()}})
  if(kind==='model')model.enabled=false
  release();expect((await pending).statusCode).toBe(kind==='session'?401:kind==='model'?503:409)
  const row=await h.db.studentArchive.findUnique({where:{id:s.id}});expect(JSON.parse(row!.stateJson).reviews).toHaveLength(0)
 }finally{release();model.reply=old}
})
it('gives a teacher only own draft reports and supports the confirmed training-report-handover flow',async()=>{
 let s=await ready();s=(await action(s,'createReview',input())).json().data;const reviewId=s.reviews[0].id
 s=(await action(s,'confirmReview',{reviewId,teacherNote:'请说明通分'},h.tutor)).json().data
 s=(await action(s,'submitAttempt',{reviewId,answers:[{questionId:'q1',answer:'5/6'}]})).json().data
 s=(await action(s,'saveReport',{reviewId,text:'实际完成1题，步骤仍待复核',nextLesson:'复习通分'},h.tutor)).json().data
 expect(s.reports).toHaveLength(1);const reportId=s.reports[0].id
 s=(await action(s,'confirmReport',{reportId},h.tutor)).json().data
 s=(await action(s,'handover',{reportIds:[reportId],revokeBookingId:h.booking.id})).json().data
 expect(s.handovers[0].snapshots[0].text).toContain('实际完成1题');expect(s.grants[0].revokedAt).toBeTruthy()
})
it('returns a validation error for malformed nested practice answers',async()=>{
 let s=await ready();s=(await action(s,'createReview',input())).json().data;s=(await action(s,'confirmReview',{reviewId:s.reviews[0].id,teacherNote:'核对'},h.tutor)).json().data
 const result=await action(s,'submitAttempt',{reviewId:s.reviews[0].id,answers:[null]});expect(result.statusCode).toBe(400)
})
it('makes concurrent edits conflict instead of overwriting and rejects grants longer than 90 days',async()=>{
 const s=await ready();const results=await Promise.all([action(s,'updateProfile',{nickname:'学生',grade:'六年级',goals:'方程'}),action(s,'updateProfile',{nickname:'学生',grade:'六年级',goals:'几何'})]);expect(results.map(r=>r.statusCode).sort()).toEqual([200,409])
 const current=(await req('GET','/api/student-archives/'+s.id,h.parent)).json().data
 expect((await action(current,'grant',{bookingId:h.booking.id,level:'learning',expiresAt:new Date(Date.now()+91*86400000).toISOString()})).statusCode).toBe(400)
})
it('persists teacher analysis corrections and observation edits while refusing malformed or confirmed rewrites',async()=>{
 let s=await ready();s=(await action(s,'createReview',input())).json().data;const reviewId=s.reviews[0].id,analysis={...SAMPLE_ANALYSIS,analysis:'教师核对：先通分再计算'}
 expect((await action(s,'reviseReview',{reviewId,analysis:null,teacherNote:'检查'},h.tutor)).statusCode).toBe(400)
 s=(await action(s,'reviseReview',{reviewId,analysis,teacherNote:'已修订训练草稿'},h.tutor)).json().data
 expect(s.reviews[0].analysis.analysis).toContain('教师核对');expect(s.reviews[0].source).toBe('sample')
 s=(await action(s,'confirmReview',{reviewId,teacherNote:'确认'},h.tutor)).json().data
 expect((await action(s,'reviseReview',{reviewId,analysis,teacherNote:'确认后修改'},h.tutor)).statusCode).toBe(409)
 s=(await action(s,'observe',{bookingId:h.booking.id,text:'完成1题'},h.tutor)).json().data;const original=s.observations[0]
 s=(await action(s,'updateObservation',{observationId:original.id,text:'核对后补充：需要说明步骤'},h.tutor)).json().data
 expect(s.observations[0].createdAt).toBe(original.createdAt);expect(s.observations[0].updatedAt).toBeTruthy();expect(s.observations[0].text).toContain('需要说明步骤')
})
