import {PrismaClient} from '@prisma/client'
if(!process.env.E2E_PASSWORD||!process.env.DATABASE_URL?.includes('tutor-e2e-'))throw new Error('仅允许临时E2E数据库创建地图验收账户')
const db=new PrismaClient()
try{
 const original=await db.user.findUniqueOrThrow({where:{loginId:'demo.parent'}})
 const parent=await db.user.create({data:{loginId:'e2e.map.parent',displayName:'虚构地图家长',role:'parent',passwordHash:original.passwordHash}})
 const tutor=await db.user.create({data:{loginId:'e2e.map.tutor',displayName:'虚构地图家教',role:'tutor',passwordHash:original.passwordHash}})
 const fake={displayName:'地图验收示例老师',university:'场景大学',major:'数学',subjectsJson:'["数学"]',teachingMode:'线下',area:'高新区 · 科技路',pricePerHour:179,introduction:'只用于临时浏览器订单地图验收。',availability:'周末'}
 await db.tutorProfile.create({data:{userId:tutor.id,...fake,published:true}})
 await db.tutorApplication.create({data:{userId:tutor.id,...fake,status:'approved'}})
}finally{await db.$disconnect()}
