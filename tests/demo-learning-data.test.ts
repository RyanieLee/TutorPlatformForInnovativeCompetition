import {describe,it,expect} from 'vitest'
import {createDemoLearningData} from '../server/src/demo/learning-data'
import {seedMockLearningData} from '../src/services/mock/demo-data'
import {MemoryStorage} from '../src/services/mock/storage'
import {projectArchive} from '../shared/student-archive-engine'

describe('完整演示数据',()=>{
 it('覆盖档案各板块并维持授权隔离、报告训练和预约关联',()=>{
  const data=createDemoLearningData('parent','teacher','2026-10-23T08:00:00.000Z')
  expect(data.students).toHaveLength(4)
  for(const s of data.students){
   expect(s.archive.bookingIds).toContain(s.booking.id)
   expect(s.archive.nickname).toContain('演示')
   const view=projectArchive(s.archive,{actor:{id:'teacher',role:'tutor'},bookings:[s.booking],now:data.now})
   if(s.stage==='trial'){expect(view.access).toBe('basic');expect(view.reviews).toBeUndefined()}
   else{expect(view.access).toBe('learning');expect(view.reviews?.length).toBeGreaterThan(0)}
   for(const r of s.archive.reports){expect(s.archive.attempts.some(a=>a.reviewId===r.reviewId)).toBe(true)}
   expect(s.messages.map(m=>m.senderRole)).toEqual(['parent','tutor'])
  }
  expect(data.students.some(s=>s.archive.handovers.length)).toBe(true)
  expect(data.students.some(s=>s.archive.reports.some(r=>!r.confirmedAt))).toBe(true)
  expect(data.students[0].loop?.feedbacks[0].status).toBe('published')
  expect(data.students[0].loop?.suggestions.length).toBeGreaterThan(0)
 })
 it('重复初始化不覆盖修改，不把旧预约合并成演示档案',()=>{
  const storage=new MemoryStorage()
  storage.set('tutor-platform:demo-bookings:v2',[{id:'my-booking',note:'保留'}])
  seedMockLearningData(storage)
  const rows=storage.get('tutor-platform:demo-bookings:v2') as any[]
  expect(rows.some(b=>b.id==='my-booking')).toBe(true)
  expect(rows.length).toBeGreaterThan(4)
  const archives=storage.get('tutor-platform:student-archives:v1') as any
  archives.states[0].goals='用户后续编辑';storage.set('tutor-platform:student-archives:v1',archives)
  seedMockLearningData(storage)
  expect((storage.get('tutor-platform:student-archives:v1') as any).states[0].goals).toBe('用户后续编辑')
  expect((storage.get('tutor-platform:demo-bookings:v2') as any[]).length).toBe(rows.length)
 })
})
