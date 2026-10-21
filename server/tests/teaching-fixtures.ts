import {PrismaClient} from '@prisma/client'
import {randomUUID} from 'node:crypto'
import {join} from 'node:path'
import {buildApp} from '../src/app'
import {tokenHash} from '../src/core'
export async function teachingHarness() {
 const db=new PrismaClient(),prefix=randomUUID(),uploadRoot=join(process.env.TEACHING_UPLOAD_ROOT!,prefix)
 const options={uploadRoot,now:()=>new Date('2026-10-21T12:00:00Z')}
 const app=buildApp(db,undefined,options)
 async function user(role:string,label:string){
  const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','')
  const row=await db.user.create({data:{loginId:prefix+label,displayName:label,role,passwordHash:'unused-test-hash'}})
  await db.session.create({data:{userId:row.id,tokenHash:tokenHash(token),expiresAt:new Date('2099-01-01')}})
  return{...row,token}
 }
 const parent=await user('parent','parent'),otherParent=await user('parent','other-parent'),tutor=await user('tutor','tutor'),otherTutor=await user('tutor','other-tutor'),admin=await user('admin','admin')
 const profile=await db.tutorProfile.create({data:{userId:tutor.id,displayName:'测试老师',university:'示例大学',major:'数学',subjectsJson:'["数学"]',teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'测试资料',availability:'周末'}})
 const booking=await db.booking.create({data:{parentId:parent.id,tutorProfileId:profile.id,studentName:'同名学生',subject:'数学',expectedTime:'周末',status:'accepted'}})
 const otherBooking=await db.booking.create({data:{parentId:otherParent.id,tutorProfileId:profile.id,studentName:'同名学生',subject:'数学',expectedTime:'周末',status:'accepted'}})
 await app.ready()
 const input={title:'第一节：一元一次方程',scheduledAt:'2026-10-22T10:00:00Z',previewText:'预习第一章',homeworkText:'完成第1—3题',dueAt:'2026-10-23T12:00:00Z'}
 function request(method:string,url:string,who:any,payload?:unknown){return app.inject({method:method as any,url,headers:who?{authorization:'Bearer '+who.token}:{},...(payload===undefined?{}:{payload})})}
 async function draft(extra:Record<string,unknown>={}){const r=await request('POST','/api/bookings/'+booking.id+'/lessons',tutor,{...input,requestId:randomUUID(),...extra});return r}
 return{db,app,options,parent,otherParent,tutor,otherTutor,admin,booking,otherBooking,input,request,draft}
}
