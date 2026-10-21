import {beforeAll,afterAll,describe,it,expect} from 'vitest'
import {mkdir,readdir,writeFile,readFile,utimes} from 'node:fs/promises'
import {join} from 'node:path'
import {teachingHarness} from './teaching-fixtures'
import {png,upload,officeFixture} from './teaching-file-utils'
let h:Awaited<ReturnType<typeof teachingHarness>>
beforeAll(async()=>{h=await teachingHarness()});afterAll(async()=>{await h.app.close()})
async function fresh(){const r=await h.draft();expect(r.statusCode).toBe(200);return r.json().data}
async function publish(id:string,attachmentIds:string[]=[],version=1){return h.request('POST','/api/lessons/'+id+'/publish',h.tutor,{version,attachmentIds})}
describe('真实教学附件与发布',()=>{
 it('cleanup removes stale orphaned crash files but leaves unrelated files alone',async()=>{
  const {cleanupUploads}=await import('../src/teaching/cleanup'),key='b'.repeat(48)
  await mkdir(h.options.uploadRoot,{recursive:true})
  const path=join(h.options.uploadRoot,key+'.part'),keep=join(h.options.uploadRoot,'unrelated.txt'),old=new Date(h.options.now().getTime()-25*3600000)
  await writeFile(path,'crashed');await utimes(path,old,old);await writeFile(keep,'keep')
  await cleanupUploads(h.db,h.options)
  expect((await readdir(h.options.uploadRoot)).includes(key+'.part')).toBe(false)
  expect(await readFile(keep,'utf8')).toBe('keep')
 })
 it('authorized-byte-roundtrip, private-temp-and-bound-download',async()=>{
  const l=await fresh(),up=await upload(h,l.id,'preview',h.tutor)
  expect(up.statusCode).toBe(200);const id=up.json().data.id
  expect((await h.request('GET','/api/attachments/'+id+'/content',h.parent)).statusCode).toBe(404)
  expect((await publish(l.id,[id])).statusCode).toBe(200)
  const file=await h.request('GET','/api/attachments/'+id+'/content',h.parent)
  expect(file.statusCode).toBe(200);expect(file.rawPayload).toEqual(png);expect(file.headers['x-content-type-options']).toBe('nosniff')
  for(const who of [h.otherParent,h.otherTutor])expect((await h.request('GET','/api/attachments/'+id+'/content',who)).statusCode).toBe(404)
  expect((await h.request('GET','/api/attachments/'+id+'/content',null)).statusCode).toBe(401)
  expect((await h.request('GET','/api/attachments/'+id+'/content',h.admin)).statusCode).toBe(403)
 })
 it('publishing locks content and has exact idempotency',async()=>{
  const l=await fresh();expect((await publish(l.id)).statusCode).toBe(200)
  expect((await publish(l.id)).statusCode).toBe(200)
  expect((await publish(l.id,['not-bound'])).statusCode).toBe(409)
  expect((await h.request('PUT','/api/lessons/'+l.id,h.tutor,{...h.input,version:2})).statusCode).toBe(409)
  expect((await upload(h,l.id,'preview',h.tutor)).statusCode).toBe(409)
  const old=await h.draft({dueAt:'2026-10-20T10:00:00Z'});expect((await publish(old.json().data.id)).statusCode).toBe(400)
 })
 it('size-format-count-limits with valid office documents',async()=>{
  const l=await fresh()
  expect((await upload(h,l.id,'preview',h.tutor,png,'fake.pdf')).statusCode).toBe(400)
  expect((await upload(h,l.id,'preview',h.tutor,Buffer.from('<svg/>'),'fake.svg')).statusCode).toBe(400)
  for(const ext of ['docx','pptx']as const)expect((await upload(h,l.id,'preview',h.tutor,officeFixture(ext),'预习.'+ext)).statusCode).toBe(200)
  const max=Buffer.alloc(20*1024*1024,32);max.write('%PDF-1.4\n')
  expect((await upload(h,l.id,'homework',h.tutor,max,'最大.pdf')).statusCode).toBe(200)
  expect((await upload(h,l.id,'homework',h.tutor,Buffer.concat([max,Buffer.from('x')]),'超限.pdf')).statusCode).toBe(413)
  const ids=[];for(let i=0;i<6;i++){const u=await upload(h,l.id,'preview',h.tutor);expect(u.statusCode).toBe(200);ids.push(u.json().data.id)}
  expect((await publish(l.id,ids)).statusCode).toBe(400)
 })
 it('quota-concurrent-reservations never overspends and frees failures',async()=>{
  const l=await fresh(),day=h.options.now().toISOString().slice(0,10)
  await h.db.uploadQuota.upsert({where:{userId_day:{userId:h.tutor.id,day}},create:{userId:h.tutor.id,day,usedBytes:500*1024*1024-png.length},update:{usedBytes:500*1024*1024-png.length,reservedBytes:0}})
  const responses=await Promise.all([upload(h,l.id,'preview',h.tutor),upload(h,l.id,'preview',h.tutor)])
  expect(responses.map(r=>r.statusCode).sort()).toEqual([200,429])
  const quota=await h.db.uploadQuota.findUniqueOrThrow({where:{userId_day:{userId:h.tutor.id,day}}})
  expect(quota.usedBytes).toBe(500*1024*1024);expect(quota.reservedBytes).toBe(0)
  await h.db.uploadQuota.update({where:{userId_day:{userId:h.tutor.id,day}},data:{usedBytes:0}})
 })
 it('partial-upload-cleanup rejects empty and malformed files without quota leaks',async()=>{
  const l=await fresh();expect((await upload(h,l.id,'preview',h.tutor,Buffer.alloc(0))).statusCode).toBe(400)
  expect((await upload(h,l.id,'preview',h.tutor,Buffer.from('invalid'),'invalid.png')).statusCode).toBe(400)
  const rows=await h.db.teachingAttachment.findMany({where:{lessonId:l.id}});expect(rows).toHaveLength(0)
  expect((await h.db.uploadQuota.findMany({where:{userId:h.tutor.id}})).every(q=>q.reservedBytes===0)).toBe(true)
 })
 it('restart-recovers-reservations and cleanup-expired-preserves-bound',async()=>{
  const {cleanupUploads}=await import('../src/teaching/cleanup')
  const l=await fresh(),u=await upload(h,l.id,'preview',h.tutor);expect(u.statusCode).toBe(200)
  const bound=u.json().data.id;expect((await publish(l.id,[bound])).statusCode).toBe(200)
  const day=h.options.now().toISOString().slice(0,10),key='a'.repeat(48)
  await mkdir(h.options.uploadRoot,{recursive:true});await writeFile(join(h.options.uploadRoot,key+'.part'),'partial')
  await h.db.teachingAttachment.create({data:{lessonId:l.id,ownerId:h.tutor.id,purpose:'preview',originalName:'中断.png',storageKey:key,quotaDate:day,reservedBytes:10,expiresAt:new Date('2026-10-20')}})
  await h.db.uploadQuota.update({where:{userId_day:{userId:h.tutor.id,day}},data:{reservedBytes:{increment:10}}})
  await cleanupUploads(h.db,h.options,{recover:true})
  expect((await readdir(h.options.uploadRoot)).includes(key+'.part')).toBe(false)
  expect((await h.request('GET','/api/attachments/'+bound+'/content',h.parent)).rawPayload).toEqual(png)
  expect((await h.db.uploadQuota.findUniqueOrThrow({where:{userId_day:{userId:h.tutor.id,day}}})).reservedBytes).toBe(0)
 })
 it('post-stream-state-change rechecks the booking before finalizing upload',async()=>{
  const l=await fresh()
  // A real request stream is paused after the headers; cancellation commits before its final bytes.
  const {PassThrough}=await import('node:stream'),stream=new PassThrough(),boundary='paused-upload'
  const response=h.app.inject({method:'POST',url:'/api/lessons/'+l.id+'/attachments?purpose=preview',headers:{authorization:'Bearer '+h.tutor.token,'content-type':'multipart/form-data; boundary='+boundary},payload:stream})
  stream.write('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="file.png"\r\nContent-Type: image/png\r\n\r\n')
  stream.write(png.subarray(0,20))
  await new Promise(resolve=>setTimeout(resolve,30))
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}})
  stream.end(Buffer.concat([png.subarray(20),Buffer.from('\r\n--'+boundary+'--\r\n')]))
  expect((await response).statusCode).toBe(409)
  expect(await h.db.teachingAttachment.count({where:{lessonId:l.id}})).toBe(0)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'accepted'}})
 })
 it('discard is durable, owner-only, unbound-only and preserves published files',async()=>{
  const l=await fresh(),a=(await upload(h,l.id,'preview',h.tutor)).json().data,b=(await upload(h,l.id,'preview',h.tutor)).json().data
  const path='/api/attachments/'+a.id
  for(const who of [h.otherTutor,h.parent,h.otherParent])expect((await h.request('DELETE',path,who)).statusCode).toBe(404)
  expect((await h.request('DELETE',path,null)).statusCode).toBe(401)
  expect((await h.request('DELETE',path,h.admin)).statusCode).toBe(403)
  expect((await h.request('DELETE',path,h.tutor)).statusCode).toBe(200)
  expect((await h.request('GET','/api/lessons/'+l.id,h.tutor)).json().data.pendingAttachments.map((r:any)=>r.id)).toEqual([b.id])
  expect(await h.db.teachingAttachment.findUnique({where:{id:a.id}})).toBeNull()
  expect((await publish(l.id,[b.id])).statusCode).toBe(200)
  expect((await h.request('DELETE','/api/attachments/'+b.id,h.tutor)).statusCode).toBe(409)
  expect((await h.request('GET','/api/attachments/'+b.id+'/content',h.parent)).rawPayload).toEqual(png)
  const submission=(await upload(h,l.id,'submission',h.parent)).json().data
  expect((await h.request('DELETE','/api/attachments/'+submission.id,h.parent)).statusCode).toBe(200)
 })
 it('logout-during-stream refuses finalization and returns reserved bytes',async()=>{
  const l=await fresh(),{PassThrough}=await import('node:stream'),stream=new PassThrough(),boundary='logout-upload'
  const response=h.app.inject({method:'POST',url:'/api/lessons/'+l.id+'/attachments?purpose=preview',headers:{authorization:'Bearer '+h.tutor.token,'content-type':'multipart/form-data; boundary='+boundary},payload:stream})
  stream.write('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="file.png"\r\nContent-Type: image/png\r\n\r\n');stream.write(png.subarray(0,20))
  const until=Date.now()+1500
  while(Date.now()<until&&await h.db.teachingAttachment.count({where:{lessonId:l.id}})===0)await new Promise(r=>setTimeout(r,5))
  expect(await h.db.teachingAttachment.count({where:{lessonId:l.id}})).toBe(1)
  expect((await h.request('POST','/api/auth/logout',h.tutor,{})).statusCode).toBe(200)
  stream.end(Buffer.concat([png.subarray(20),Buffer.from('\r\n--'+boundary+'--\r\n')]))
  expect((await response).statusCode).toBe(401)
  expect(await h.db.teachingAttachment.count({where:{lessonId:l.id}})).toBe(0)
  expect((await h.db.uploadQuota.findMany({where:{userId:h.tutor.id}})).every(q=>q.reservedBytes===0)).toBe(true)
 })
})
