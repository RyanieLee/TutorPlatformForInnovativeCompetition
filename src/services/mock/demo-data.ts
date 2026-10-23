import type {StoragePort} from './storage'
import {createDemoLearningData} from '../../../server/src/demo/learning-data'
import {tutors} from '../../mocks/tutors'
import {xianPlaces} from '../location'
import {LEGACY_BOOKINGS_KEY} from '../../utils/bookings'

const MARKER='tutor-platform:learning-demo-seed:v1'
/** 仅由 Mock 单例调用；按固定ID补缺，不覆盖用户创建或编辑的记录。 */
export function seedMockLearningData(storage:StoragePort){
 if(storage.get(MARKER))return
 const data=createDemoLearningData('demo-parent','demo-tutor')
 const merge=(key:string,rows:any[])=>{
  const current=storage.get(key)
  if(current!==null&&!Array.isArray(current))throw new Error('演示数据格式异常，未覆盖原记录：'+key)
  const existing=(current??[]) as any[]
  storage.set(key,[...existing,...rows.filter(row=>!existing.some(x=>x.id===row.id))])
 }
 // 若旧版只有预约存储，先保留迁移内容，避免初始化隐藏用户原来的预约。
 if(storage.get('tutor-platform:demo-bookings:v2')===null){
  const legacy=storage.get(LEGACY_BOOKINGS_KEY)
  if(legacy!==null&&!Array.isArray(legacy))throw new Error('旧预约格式异常，原数据已保留')
  if(Array.isArray(legacy))storage.set('tutor-platform:demo-bookings:v2',legacy.map(b=>({...b,parentId:'demo-parent',updatedAt:b.createdAt,status:b.status==='已取消'?'cancelled':'pending'})))
 }
 merge('tutor-platform:demo-bookings:v2',data.students.map((s,i)=>({id:s.booking.id,parentId:'demo-parent',tutorId:'t001',tutorName:tutors[0].name,studentName:s.archive.nickname,contact:'13800000000',subject:'数学',expectedTime:'周六 14:00–14:45（演示，具体时间待确认）',note:'虚构教学展示预约，不是实际服务订单。',areaLabel:xianPlaces[i%xianPlaces.length].label,status:'accepted',createdAt:s.archive.createdAt,updatedAt:data.now})).concat([
  {id:'demo-learning-booking-pending',parentId:'demo-parent',tutorId:'t001',tutorName:tutors[0].name,studentName:'唐可欣（演示）',contact:'13800000000',subject:'数学',expectedTime:'周日 10:00（待沟通）',note:'虚构待接受预约，供教师体验处理。',areaLabel:xianPlaces[1].label,status:'pending',createdAt:data.now,updatedAt:data.now},
  {id:'demo-learning-booking-completed',parentId:'demo-parent',tutorId:'t001',tutorName:tutors[0].name,studentName:'宋予墨（演示）',contact:'13800000000',subject:'数学',expectedTime:'历史演示课',note:'虚构已完成预约，沟通记录只读。',areaLabel:xianPlaces[2].label,status:'completed',createdAt:data.now,updatedAt:data.now}
 ]))
 const key='tutor-platform:student-archives:v1',old=storage.get(key) as any
 if(old&&(!Array.isArray(old.states)||!Array.isArray(old.creates)))throw new Error('档案格式异常，原记录已保留')
 const states=old?.states??[],creates=old?.creates??[]
 for(const s of data.students){
  // 已有用户手动绑定的预约优先，不创建重复绑定。
  if(!states.some((a:any)=>a.id===s.archive.id||a.bookingIds?.includes(s.booking.id)))states.push(s.archive)
  const loopKey='tutor-platform:teaching-loop:v1:'+s.booking.id
  if(s.loop&&storage.get(loopKey)===null)storage.set(loopKey,s.loop)
  const messageKey='tutor-platform:booking-messages:v1:'+s.booking.id
  merge(messageKey,s.messages)
 }
 storage.set(key,{states,creates})
 merge('tutor-platform:demo-applications:v1',[
  ...['pending','rejected'].map((status,i)=>({id:'demo-learning-application-'+i,userId:'demo-candidate-'+i,displayName:['顾言老师（演示）','温知老师（演示）'][i],university:'示例大学',major:'数学与应用数学',subjects:['数学'],teachingMode:'线上',area:'雁塔区 · 小寨',pricePerHour:80,introduction:'【虚构入驻申请】采用分步骤讲解和错题复盘帮助学生理解知识。',availability:'周末下午',status,createdAt:data.now,updatedAt:data.now,...(i?{rejectionReason:'【演示】请补充可核验的教学经历后重新提交。'}:{})}))
 ])
 merge('tutor-platform:demo-reports:v1',['open','resolved'].map((status,i)=>({id:'demo-learning-moderation-'+i,reporterId:'demo-parent',tutorId:tutors[2+i].id,reason:'其他',description:'【虚构平台治理样例】请核对页面中授课时间的文字说明；本例不代表真实投诉或实际违规。',status,createdAt:data.now,updatedAt:data.now})))
 storage.set(MARKER,true)
}
