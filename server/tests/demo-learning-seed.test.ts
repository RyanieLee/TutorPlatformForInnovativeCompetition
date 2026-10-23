import {it,expect} from 'vitest'
import {PrismaClient} from '@prisma/client'
import {seedDemoLearning} from '../prisma/seed-learning'

it('补齐数据库展示内容，重复执行不改写用户报告、撤权和预约状态',async()=>{
 const db=new PrismaClient()
 try{
  const parent=await db.user.upsert({where:{loginId:'demo.parent'},update:{},create:{loginId:'demo.parent',displayName:'演示家长',role:'parent',passwordHash:'unused'}})
  const teacher=await db.user.upsert({where:{loginId:'demo.tutor'},update:{},create:{loginId:'demo.tutor',displayName:'演示教师',role:'tutor',passwordHash:'unused'}})
  await db.tutorProfile.upsert({where:{userId:teacher.id},update:{},create:{userId:teacher.id,displayName:'小林老师',university:'示例大学',major:'数学',subjectsJson:'["数学"]',teachingMode:'线上',area:'雁塔区 · 小寨',pricePerHour:80,introduction:'虚构演示',availability:'周末'}})
  await seedDemoLearning(db)
  const rows=await db.studentArchive.findMany({where:{parentId:parent.id}})
  expect(rows).toHaveLength(4)
  expect(await db.archiveBooking.count({where:{archiveId:{in:rows.map(r=>r.id)}}})).toBe(4)
  expect(await db.bookingMessage.count({where:{bookingId:{startsWith:'demo-learning-booking-'}}})).toBe(8)
  expect(await db.homeworkSubmission.count({where:{id:{startsWith:'demo-learning-submission-'}}})).toBe(4)
  const row=rows.find(r=>r.id==='demo-learning-student-1')!,state=JSON.parse(row.stateJson)
  state.grants[0].revokedAt=new Date().toISOString();state.reports[0].text='用户后续编辑'
  await db.studentArchive.update({where:{id:row.id},data:{stateJson:JSON.stringify(state)}})
  await db.booking.update({where:{id:'demo-learning-booking-1'},data:{status:'completed'}})
  await seedDemoLearning(db)
  expect((await db.studentArchive.findUniqueOrThrow({where:{id:row.id}})).stateJson).toBe(JSON.stringify(state))
  expect((await db.booking.findUniqueOrThrow({where:{id:'demo-learning-booking-1'}})).status).toBe('completed')
  expect(await db.bookingMessage.count({where:{bookingId:{startsWith:'demo-learning-booking-'}}})).toBe(8)
 }finally{await db.$disconnect()}
})
