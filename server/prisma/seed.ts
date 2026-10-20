import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/core'
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
 const user=await db.user.findUniqueOrThrow({where:{loginId:'demo.tutor'}})
 const fake={displayName:'演示家教小林',university:'示例大学',major:'数学专业',subjectsJson:JSON.stringify(['数学','物理']),teachingMode:'线上',area:'示例大学城',pricePerHour:80,introduction:'虚构演示资料，用于开发环境预约流程验证。',availability:'周末下午'}
 const profile=await db.tutorProfile.upsert({where:{userId:user.id},create:{userId:user.id,...fake,published:true},update:{}})
 for(const subject of JSON.parse(profile.subjectsJson) as string[]){
  await db.tutorSubject.upsert({where:{tutorProfileId_subject:{tutorProfileId:profile.id,subject}},create:{tutorProfileId:profile.id,subject},update:{}})
 }
 await db.tutorApplication.upsert({where:{userId:user.id},create:{userId:user.id,...fake,status:'approved',reviewedAt:new Date()},update:{}})
 console.log('演示账户已生成：demo.parent / demo.tutor / demo.admin。密码由本地环境变量提供。')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect())
