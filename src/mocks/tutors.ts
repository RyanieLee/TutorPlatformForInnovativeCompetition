import type { Tutor } from '../types/tutor'
import demoTutors from '../../server/prisma/demo-tutors.json'
// 人物、履历、时间及价格均为合成演示；真实地名和高校名仅用来构建西安场景。
// Generated demo portraits illustrate fictional profiles; user uploads still take priority.
export const tutors = (demoTutors as Tutor[]).map((t,index)=>({...t,photoUrl:t.photoUrl || '/static/demo-tutors/tutor-'+(index%6+1)+'.webp'}))
export const findTutor = (id:string):Tutor|undefined => tutors.find(t=>t.id===id)
