import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/core'
import { randomBytes } from 'node:crypto'
import demoTutors from './demo-tutors.json'
import {seedDemoLearning} from './seed-learning'
const db=new PrismaClient()
async function main(){
 if(process.env.NODE_ENV==='production')throw new Error('禁止在生产环境生成演示账户')
 const entries=[
  ['demo.parent','演示家长','parent','SEED_PARENT_PASSWORD'],
  ['demo.tutor','演示家教','tutor','SEED_TUTOR_PASSWORD'],
  ['demo.admin','演示管理员','admin','SEED_ADMIN_PASSWORD']
 ] as const
 if(entries.some(e=>!process.env[e[3]]||process.env[e[3]]!.length<12))throw new Error('请在 .env 设置三个长度至少 12 位的 SEED_*_PASSWORD')
 for(const [loginId,displayName,role,key] of entries){
  const passwordHash=await hashPassword(process.env[key]!)
  await db.user.upsert({where:{loginId},create:{loginId,displayName,role,passwordHash},update:{displayName,role,passwordHash,status:'active'}})
 }
 // 新数据只补缺，不覆盖已编辑、撤回或审核过的资料。
 for (const [index, sample] of demoTutors.entries()) {
  const loginId=index===0?'demo.tutor':`demo.catalog.${sample.id}`
  let user=await db.user.findUnique({where:{loginId}})
  if(!user)user=await db.user.create({data:{loginId,displayName:sample.name,role:'tutor',passwordHash:await hashPassword(randomBytes(32).toString('hex'))}})
  const fake={displayName:sample.name,university:sample.university,major:sample.major,subjectsJson:JSON.stringify(sample.subjects),teachingMode:sample.teachingMode,area:sample.area,pricePerHour:sample.pricePerHour,introduction:sample.introduction,availability:sample.availability,experienceMonths:sample.experienceMonths,academicScore:sample.academicScore,teachingSkillLevel:sample.teachingSkillLevel,caseCount:sample.caseCount,caseSummary:sample.caseSummary}
  const profile=await db.tutorProfile.upsert({where:{userId:user.id},create:{userId:user.id,...fake,published:true},update:{}})
  for(const subject of JSON.parse(profile.subjectsJson) as string[]){
   await db.tutorSubject.upsert({where:{tutorProfileId_subject:{tutorProfileId:profile.id,subject}},create:{tutorProfileId:profile.id,subject},update:{}})
  }
  await db.tutorApplication.upsert({where:{userId:user.id},create:{userId:user.id,...fake,status:'approved',reviewedAt:new Date()},update:{}})
 }
 await seedDemoLearning(db)
 console.log('已补齐 24 份西安合成演示家教；目录账户无公开登录密码。')
 console.log('演示账户已生成：demo.parent / demo.tutor / demo.admin。密码由本地环境变量提供。')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect())
