import type {PrismaClient} from '@prisma/client'
import {randomBytes,createHash} from 'node:crypto'
import {hashPassword} from '../src/core'
import {createDemoLearningData} from '../src/demo/learning-data'
import places from '../src/content/xian-places.json'

/** 只补充专属演示ID，不修改已有学生、授权、报告、课程或预约状态。 */
export async function seedDemoLearning(db:PrismaClient){
 if(process.env.NODE_ENV==='production')throw new Error('禁止在生产环境注入虚构教学数据')
 const parent=await db.user.findUniqueOrThrow({where:{loginId:'demo.parent'}})
 const teacher=await db.user.findUniqueOrThrow({where:{loginId:'demo.tutor'}})
 const profile=await db.tutorProfile.findUniqueOrThrow({where:{userId:teacher.id}})
 const data=createDemoLearningData(parent.id,teacher.id)
 for(const [i,s] of data.students.entries()){
  await db.$transaction(async tx=>{
   await tx.booking.upsert({where:{id:s.booking.id},update:{},create:{id:s.booking.id,parentId:parent.id,tutorProfileId:profile.id,studentName:s.archive.nickname,subject:'数学',expectedTime:'周六 14:00–14:45（虚构演示）',note:'虚构教学展示预约，不是实际服务订单。',areaLabel:places[i%places.length].label,status:'accepted',createdAt:new Date(s.archive.createdAt)}})
   // 一并创建档案和绑定，已有绑定或相同ID档案绝不重写。
   const existing=await tx.studentArchive.findUnique({where:{id:s.archive.id}})
   const binding=await tx.archiveBooking.findUnique({where:{bookingId:s.booking.id}})
   if(!existing&&!binding){
    await tx.studentArchive.create({data:{id:s.archive.id,parentId:parent.id,revision:s.archive.revision,requestId:s.archive.id,requestFingerprint:JSON.stringify([s.archive.nickname,s.archive.grade,s.archive.goals]),stateJson:JSON.stringify(s.archive),createdAt:new Date(s.archive.createdAt),bookings:{create:{bookingId:s.booking.id}}}})
   }
   if(s.loop)await tx.teachingLoop.upsert({where:{bookingId:s.booking.id},update:{},create:{bookingId:s.booking.id,revision:s.loop.revision,stateJson:JSON.stringify(s.loop)}})
   for(const message of s.messages)await tx.bookingMessage.upsert({where:{id:message.id},update:{},create:{...message,bookingId:s.booking.id,createdAt:new Date(message.createdAt)}})
   const lessonId='demo-learning-lesson-'+(i+1),submissionId='demo-learning-submission-'+(i+1)
   await tx.lesson.upsert({where:{id:lessonId},update:{},create:{id:lessonId,bookingId:s.booking.id,title:'【虚构演示】通分与分数加法诊断',scheduledAt:new Date(Date.parse(data.now)-3*86400000),previewText:'复习同分母分数加法，画图说明为什么先通分。',homeworkText:'计算1/2+1/3并写出通分过程；补充1/3+1/4和2/5+1/10。所有内容为教学演示样例。',status:'published',publishedAt:new Date(data.now),requestId:lessonId,requestFingerprint:createHash('sha256').update(lessonId).digest('hex')}})
   await tx.homeworkSubmission.upsert({where:{id:submissionId},update:{},create:{id:submissionId,lessonId,parentId:parent.id,revision:1,requestId:submissionId,requestFingerprint:createHash('sha256').update(submissionId).digest('hex'),note:'【虚构作业提交】1/2+1/3=2/5，直接把分子和分母分别相加。请老师指导通分。',submittedAt:new Date(data.now),late:false}})
  })
 }
 for(const [i,status] of ['pending','completed'].entries()){
  const id='demo-learning-booking-'+status
  await db.booking.upsert({where:{id},update:{},create:{id,parentId:parent.id,tutorProfileId:profile.id,studentName:['唐可欣（演示）','宋予墨（演示）'][i],subject:'数学',expectedTime:'周日 10:00（虚构演示）',note:'虚构预约状态展示。',areaLabel:places[i].label,status}})
 }
 // 管理员申请队列及平台治理示例；账户使用随机不可公开登录的密码。
 for(const [i,status] of ['pending','rejected'].entries()){
  const loginId='demo.learning.candidate.'+i
  let user=await db.user.findUnique({where:{loginId}})
  if(!user)user=await db.user.create({data:{loginId,displayName:['顾言老师（演示）','温知老师（演示）'][i],role:'tutor',passwordHash:await hashPassword(randomBytes(32).toString('hex'))}})
  await db.tutorApplication.upsert({where:{userId:user.id},update:{},create:{userId:user.id,displayName:user.displayName,university:'示例大学',major:'数学与应用数学',subjectsJson:'["数学"]',teachingMode:'线上',area:places[1].label,pricePerHour:80,introduction:'【虚构入驻申请】采用分步骤讲解和错题复盘帮助理解知识。',availability:'周末下午',status,...(i?{rejectionReason:'【演示】请补充可核验的教学经历。'}:{})}})
  const id='demo-learning-moderation-'+i
  await db.report.upsert({where:{id},update:{},create:{id,reporterId:parent.id,tutorProfileId:profile.id,reason:'其他',description:'【虚构平台治理样例】请核对授课时间的文字说明，不代表真实投诉或违规。',status:i?'resolved':'open',...(i?{resolvedAt:new Date(data.now)}:{})}})
 }
 console.log('已补齐4份虚构学生档案、6笔预约、作业训练、3份报告、教学反馈、沟通及管理样例；已有记录保持原样。')
}
