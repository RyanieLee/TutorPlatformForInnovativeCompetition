import {beforeAll,afterAll,describe,it,expect} from 'vitest'
import {randomUUID} from 'node:crypto'
import {teachingHarness} from './teaching-fixtures'
let h:Awaited<ReturnType<typeof teachingHarness>>
beforeAll(async()=>{h=await teachingHarness()});afterAll(async()=>{await h.app.close()})
describe('教学课次及预约隔离',()=>{
 it('owner-can-create-save-list-draft',async()=>{
  const r=await h.draft();expect(r.statusCode).toBe(200)
  const lesson=r.json().data;expect(lesson).toMatchObject({title:h.input.title,status:'draft',bookingId:h.booking.id,version:1})
  const updated=await h.request('PUT','/api/lessons/'+lesson.id,h.tutor,{...h.input,title:'修改后的课次',version:1})
  expect(updated.statusCode).toBe(200);expect(updated.json().data.version).toBe(2)
  const list=await h.request('GET','/api/bookings/'+h.booking.id+'/lessons?page=1&pageSize=1',h.tutor)
  expect(list.json().meta).toMatchObject({page:1,pageSize:1});expect(list.json().data[0].id).toBe(lesson.id)
 })
 it('parent-cannot-read-draft and unrelated roles never gain access',async()=>{
  const r=await h.draft(),id=r.json().data?.id;expect(r.statusCode).toBe(200)
  expect((await h.request('GET','/api/lessons/'+id,h.parent)).statusCode).toBe(404)
  expect((await h.request('GET','/api/lessons/'+id,h.otherTutor)).statusCode).toBe(404)
  expect((await h.request('GET','/api/lessons/'+id,h.admin)).statusCode).toBe(403)
  expect((await h.request('GET','/api/lessons/'+id,null)).statusCode).toBe(401)
  const parentList=await h.request('GET','/api/bookings/'+h.booking.id+'/lessons',h.parent)
  expect(parentList.json()).toMatchObject({data:[],meta:{total:0}})
 })
 it('duplicate-student-name-isolated',async()=>{
  const r=await h.draft();expect(r.statusCode).toBe(200)
  const list=await h.request('GET','/api/bookings/'+h.booking.id+'/lessons',h.otherParent)
  expect(list.statusCode).toBe(404)
  const own=await h.request('GET','/api/bookings/'+h.otherBooking.id+'/lessons',h.otherParent)
  expect(own.statusCode).toBe(200);expect(own.json().meta.total).toBe(0)
 })
 it('status-and-version-conflict',async()=>{
  const r=await h.draft();expect(r.statusCode).toBe(200);const id=r.json().data.id
  await h.request('PUT','/api/lessons/'+id,h.tutor,{...h.input,version:1})
  expect((await h.request('PUT','/api/lessons/'+id,h.tutor,{...h.input,version:1})).statusCode).toBe(409)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'cancelled'}})
  expect((await h.draft()).statusCode).toBe(409)
  await h.db.booking.update({where:{id:h.booking.id},data:{status:'accepted'}})
 })
 it('validates exact title/time/text limits and refuses user ownership fields',async()=>{
  for(const title of ['', 'x'.repeat(81)])expect((await h.draft({title})).statusCode).toBe(400)
  expect((await h.draft({title:'x'.repeat(80)})).statusCode).toBe(200)
  expect((await h.draft({scheduledAt:'2026-10-22T10:00:00'})).statusCode).toBe(400)
  expect((await h.draft({homeworkText:'x'.repeat(10001)})).statusCode).toBe(400)
  expect((await h.draft({parentId:h.otherParent.id})).statusCode).toBe(400)
 })
 it('creation idempotency returns existing and rejects different request payload',async()=>{
  const requestId=randomUUID();const first=await h.draft({requestId});expect(first.statusCode).toBe(200)
  const replay=await h.draft({requestId});expect(replay.json().data.id).toBe(first.json().data.id)
  expect((await h.draft({requestId,title:'不同内容'})).statusCode).toBe(409)
 })
 it('pagination rejects repeated and malformed values',async()=>{
  for(const q of ['page=0','pageSize=101','page=1&page=2','pageSize='])expect((await h.request('GET','/api/bookings/'+h.booking.id+'/lessons?'+q,h.tutor)).statusCode).toBe(400)
 })
 it('existing booking data stays intact',async()=>{
  const row=await h.db.booking.findUniqueOrThrow({where:{id:h.booking.id}})
  expect(row).toMatchObject({studentName:'同名学生',parentId:h.parent.id,status:'accepted'})
 })
 it('accepts the documented maximum Chinese text without widening old JSON routes',async()=>{
  const r=await h.draft({previewText:'中'.repeat(10000),homeworkText:'文'.repeat(10000)})
  expect(r.statusCode).toBe(200)
 })
})

