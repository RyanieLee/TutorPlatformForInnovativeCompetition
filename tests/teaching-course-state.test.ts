import {it,expect} from 'vitest'
import {reconcileCourse} from '../src/pages/teaching/shared/course-state'
import preset from '../server/src/teaching-loop/course.json'
it('preserves all unsaved course fields when an unrelated command returns server state',()=>{
 const local=structuredClone(preset);local.goal='尚未保存的教学目标';local.lessons[1].homework='尚未保存的课堂练习'
 const next=reconcileCourse(local,true,preset,false)
 expect(next.course?.goal).toBe('尚未保存的教学目标');expect(next.course?.lessons[1].homework).toBe('尚未保存的课堂练习');expect(next.dirty).toBe(true)
})
it('replaces local edits only on an explicit course operation or confirmed saved content',()=>{
 const local=structuredClone(preset);local.goal='教师草稿'
 expect(reconcileCourse(local,true,preset,true).dirty).toBe(false)
 expect(reconcileCourse(local,true,preset,true).course?.goal).toBe(preset.goal)
 expect(reconcileCourse(local,true,structuredClone(local),false).dirty).toBe(false)
})
