import type { Tutor } from '../types/tutor'
// 以下所有老师、学校、价格均为虚构样例，不代表真实资质或交易报价。
export const tutors:Tutor[] = [
{id:'t001',name:'小林老师',university:'示例大学',major:'数学与应用数学',subjects:['数学','物理'],area:'大学城周边',pricePerHour:80,teachingMode:'均可',introduction:'擅长初高中数学知识梳理、错题复盘和基础巩固。',tags:['数学思维','耐心讲解']},
{id:'t002',name:'小陈老师',university:'示例师范大学',major:'英语教育',subjects:['英语'],area:'市中心',pricePerHour:75,teachingMode:'线上',introduction:'重视词汇积累、阅读理解与口语表达。',tags:['英语阅读','口语练习']},
{id:'t003',name:'小周老师',university:'示例理工大学',major:'应用物理',subjects:['物理','数学'],area:'高新区',pricePerHour:90,teachingMode:'线下',introduction:'注重物理概念、模型理解与例题讲解。',tags:['物理建模','例题精讲']},
{id:'t004',name:'小许老师',university:'示例大学',major:'汉语言文学',subjects:['语文'],area:'大学城周边',pricePerHour:70,teachingMode:'均可',introduction:'关注作文构思、古诗文积累与阅读理解。',tags:['写作指导','阅读理解']},
{id:'t005',name:'小吴老师',university:'示例理工大学',major:'化学',subjects:['化学','数学'],area:'城南片区',pricePerHour:85,teachingMode:'均可',introduction:'结合实验现象讲解化学基础概念。',tags:['化学基础','考点梳理']},
{id:'t006',name:'小何老师',university:'示例师范大学',major:'小学教育',subjects:['语文','数学','英语'],area:'城北片区',pricePerHour:65,teachingMode:'线上',introduction:'注重小学阶段学习兴趣与习惯培养。',tags:['小学全科','习惯培养']}
]
export const findTutor = (id:string):Tutor|undefined => tutors.find(t=>t.id===id)
