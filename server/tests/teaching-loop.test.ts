import {beforeEach,afterEach,it,expect} from 'vitest'
import {teachingHarness} from './teaching-fixtures'
import {buildApp} from '../src/app'
import course from '../src/teaching-loop/course.json'
let h:Awaited<ReturnType<typeof teachingHarness>>,serial=0
beforeEach(async()=>{h=await teachingHarness()})
afterEach(async()=>{await h.app.close()})
const path=()=>'/api/bookings/'+h.booking.id+'/teaching-loop'
const command=(revision:number,type:string,payload={})=>({requestId:'loop-api-'+(++serial),expectedRevision:revision,type,payload})
it('requires teacher ownership and gives parents only published plans',async()=>{
 const unauth=await h.request('GET',path(),null);expect(unauth.statusCode).toBe(401)
 for(const [who,status]of [[h.otherTutor,404],[h.otherParent,404],[h.admin,403]]as const)expect((await h.request('GET',path(),who)).statusCode).toBe(status)
 const c=command(0,'initialize'),init=await h.request('POST',path(),h.tutor,c);expect(init.statusCode).toBe(200)
 const parent=await h.request('GET',path(),h.parent);expect(parent.json().data.plan).toBeNull();expect(parent.json().data).not.toHaveProperty('draft')
 expect((await h.request('POST',path(),h.parent,command(1,'publish'))).statusCode).toBe(403)
 expect((await h.request('POST',path(),h.tutor,command(1,'publish'))).statusCode).toBe(200)
 const published=(await h.request('GET',path(),h.parent)).json().data;expect(published.plan.version).toBe(1);expect(published.plan.course.lessons).toHaveLength(4)
})
it('deduplicates identical requests, rejects changed identifiers and stale revisions',async()=>{
 const c=command(0,'initialize');const first=await h.request('POST',path(),h.tutor,c);expect(first.statusCode).toBe(200)
 expect((await h.request('POST',path(),h.tutor,c)).json().data.revision).toBe(1)
 expect((await h.request('POST',path(),h.tutor,{...c,type:'publish'})).statusCode).toBe(409)
 expect((await h.request('POST',path(),h.tutor,command(0,'publish'))).statusCode).toBe(409)
 const result=await Promise.all([h.request('POST',path(),h.tutor,command(1,'publish')),h.request('POST',path(),h.tutor,command(1,'publish'))]);expect(result.map(r=>r.statusCode).sort()).toEqual([200,409])
 expect((await h.request('GET',path(),h.tutor)).json().data.versions).toHaveLength(1)
})
it('rejects invalid fields and forged model provenance',async()=>{
 expect((await h.request('POST',path(),h.tutor,{...command(0,'initialize'),extra:true})).statusCode).toBe(400)
 expect((await h.request('POST',path(),h.tutor,command(0,'saveDraft',{source:'model',course:{}}))).statusCode).toBe(400)
 expect((await h.request('POST',path(),h.tutor,command(0,'unknown'))).statusCode).toBe(400)
})
it('keeps completed or cancelled booking history readable and blocks new writes',async()=>{
 expect((await h.request('POST',path(),h.tutor,command(0,'initialize'))).statusCode).toBe(200)
 await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}})
 expect((await h.request('GET',path(),h.tutor)).statusCode).toBe(200)
 expect((await h.request('POST',path(),h.tutor,command(1,'publish'))).statusCode).toBe(409)
})
it('stores state in SQLite and does not advertise model success when not configured',async()=>{
 const result=await h.request('POST',path(),h.tutor,command(0,'initialize'));expect(result.statusCode).toBe(200)
 const row=await (h.db as any).teachingLoop.findUnique({where:{bookingId:h.booking.id}});expect(JSON.parse(row.stateJson).draft.course.lessons[1].exercises).toHaveLength(5)
 const generated=await h.request('POST',path()+'/generate',h.tutor,{kind:'course',requestId:'generate-request-1',expectedRevision:1});expect(generated.statusCode).toBe(503);expect(generated.json().error.code).toBe('MODEL_UNAVAILABLE')
})
it('does not create a plan if a booking is cancelled while its model request is in flight',async()=>{
 let release!:()=>void,entered!:()=>void
 const gate=new Promise<void>(resolve=>{release=resolve}),started=new Promise<void>(resolve=>{entered=resolve})
 const app=buildApp(h.db,undefined,h.options,{enabled:true,async generate(){entered();await gate;return{requestId:'candidate-only',expectedRevision:0,type:'saveDraft',payload:{course,source:'model'}}}})
 try{
  await app.ready();const pending=app.inject({method:'POST',url:path()+'/generate',headers:{authorization:'Bearer '+h.tutor.token},payload:{kind:'course',requestId:'cancel-during-generation',expectedRevision:0}}).then(r=>r)
  await started;await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}});release()
  expect((await pending).statusCode).toBe(409)
  expect(await h.db.teachingLoop.findUnique({where:{bookingId:h.booking.id}})).toBeNull()
 }finally{release();await app.close()}
})
