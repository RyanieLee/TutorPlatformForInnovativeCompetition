import {beforeAll,afterAll,describe,it,expect} from 'vitest'
import {randomUUID} from 'node:crypto'
import {teachingHarness} from './teaching-fixtures'
import {upload,png} from './teaching-file-utils'
let h:Awaited<ReturnType<typeof teachingHarness>>
beforeAll(async()=>{h=await teachingHarness()});afterAll(async()=>{await h.app.close()})
async function lesson(){const r=await h.draft(),l=r.json().data;expect(r.statusCode).toBe(200);expect((await h.request('POST','/api/lessons/'+l.id+'/publish',h.tutor,{version:1,attachmentIds:[]})).statusCode).toBe(200);return l}
async function attachment(id:string,who=h.parent){const r=await upload(h,id,'submission',who);expect(r.statusCode).toBe(200);return r.json().data.id as string}
const submit=(id:string,input:unknown,who?:any)=>h.request('POST','/api/lessons/'+id+'/submissions',who??h.parent,input)
describe('作业提交及不可变历史版本',()=>{
 it('cancel-during-submit has a serializable result and never permits later writes',async()=>{
  const l=await lesson(),id=await attachment(l.id)
  const [submitted,cancelled]=await Promise.all([submit(l.id,{requestId:randomUUID(),note:'并发提交',attachmentIds:[id]}),h.request('POST','/api/bookings/'+h.booking.id+'/cancel',h.parent,{})])
  expect(cancelled.statusCode).toBe(200);expect([200,409]).toContain(submitted.statusCode)
  const count=await h.db.homeworkSubmission.count({where:{lessonId:l.id}})
  expect(count).toBe(submitted.statusCode===200?1:0)
  expect((await submit(l.id,{requestId:randomUUID(),note:'取消后的新提交',attachmentIds:[id]})).statusCode).toBe(409)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'accepted'}})
 })
 it('same-request-returns-original and changed-replay-conflicts',async()=>{
  const l=await lesson(),id=await attachment(l.id),input={requestId:randomUUID(),note:'第一版作业',attachmentIds:[id]}
  const first=await submit(l.id,input);expect(first.statusCode).toBe(200);expect(first.json().data.revision).toBe(1)
  const replay=await submit(l.id,input);expect(replay.json().data.id).toBe(first.json().data.id)
  expect((await submit(l.id,{...input,note:'不同说明'})).statusCode).toBe(409)
  const file=await h.request('GET','/api/attachments/'+id+'/content',h.tutor);expect(file.rawPayload).toEqual(png)
 })
 it('concurrent-new-revisions and old attachments stay immutable',async()=>{
  const l=await lesson(),a=await attachment(l.id),b=await attachment(l.id)
  const responses=await Promise.all([submit(l.id,{requestId:randomUUID(),note:'A',attachmentIds:[a]}),submit(l.id,{requestId:randomUUID(),note:'B',attachmentIds:[b]})])
  expect(responses.map(r=>r.statusCode)).toEqual([200,200])
  expect(responses.map(r=>r.json().data.revision).sort()).toEqual([1,2])
  const history=await h.request('GET','/api/lessons/'+l.id+'/submissions?pageSize=1',h.tutor)
  expect(history.json()).toMatchObject({meta:{total:2,pageSize:1}});expect(history.json().data[0].revision).toBe(2)
  expect((await h.request('GET','/api/attachments/'+a+'/content',h.tutor)).rawPayload).toEqual(png)
  expect((await submit(l.id,{requestId:randomUUID(),note:'非法复用',attachmentIds:[a]})).statusCode).toBe(400)
 })
 it('foreign-attachment-rejected and duplicate-student-name-isolated',async()=>{
  const l=await lesson(),other=await lesson(),id=await attachment(other.id)
  expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds:[id]})).statusCode).toBe(400)
  expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds:[id]},h.otherParent)).statusCode).toBe(404)
  expect((await h.request('GET','/api/lessons/'+l.id+'/submissions',h.otherParent)).statusCode).toBe(404)
  expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds:[id]},h.tutor)).statusCode).toBe(403)
 })
 it('completed-accepts-cancelled-readonly and replay-after-completion',async()=>{
  const l=await lesson(),id=await attachment(l.id),body={requestId:randomUUID(),note:'已完成课次补交',attachmentIds:[id]}
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'completed'}})
  const r=await submit(l.id,body);expect(r.statusCode).toBe(200)
  const next=await attachment(l.id)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}})
  expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds:[next]})).statusCode).toBe(409)
  expect((await submit(l.id,body)).json().data.id).toBe(r.json().data.id)
  expect((await h.request('GET','/api/lessons/'+l.id+'/submissions',h.parent)).json().meta.total).toBe(1)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'accepted'}})
 })
 it('clock-boundary-late uses server time and keeps historical versions',async()=>{
  const l=await lesson()
  h.options.now=()=>new Date(h.input.dueAt)
  const a=await attachment(l.id)
  const first=await submit(l.id,{requestId:randomUUID(),note:'准时',attachmentIds:[a]});expect(first.statusCode).toBe(200);expect(first.json().data.late).toBe(false)
  const b=await attachment(l.id)
  h.options.now=()=>new Date(new Date(h.input.dueAt).getTime()+1)
  const late=await submit(l.id,{requestId:randomUUID(),note:'迟交',attachmentIds:[b]});expect(late.statusCode).toBe(200);expect(late.json().data.late).toBe(true)
  const history=await h.request('GET','/api/lessons/'+l.id+'/submissions',h.parent)
  expect(history.json().data.map((s:any)=>s.late)).toEqual([true,false])
  h.options.now=()=>new Date('2026-10-21T12:00:00Z')
 })
 it('rejects empty, excessive, duplicated attachments and extra ownership fields',async()=>{
  const l=await lesson(),id=await attachment(l.id)
  for(const attachmentIds of [[],[id,id],Array(6).fill(id)])expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds})).statusCode).toBe(400)
  expect((await submit(l.id,{requestId:randomUUID(),note:'x'.repeat(2001),attachmentIds:[id]})).statusCode).toBe(400)
  expect((await submit(l.id,{requestId:randomUUID(),note:'',attachmentIds:[id],parentId:h.otherParent.id})).statusCode).toBe(400)
 })
})
