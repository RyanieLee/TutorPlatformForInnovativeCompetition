import type { Tutor } from '../types/tutor'
import demoTutors from '../../server/prisma/demo-tutors.json'
// 人物、履历、时间及价格均为合成演示；真实地名和高校名仅用来构建西安场景。
export const tutors = demoTutors as Tutor[]
export const findTutor = (id:string):Tutor|undefined => tutors.find(t=>t.id===id)
