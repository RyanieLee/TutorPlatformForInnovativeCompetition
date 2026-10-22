import { afterAll, beforeAll, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { buildApp } from '../src/app'
import { hashPassword } from '../src/core'

const db=new PrismaClient()
const app=buildApp(db)
let tutorToken='',parentToken='',adminToken=''
const auth=(token:string)=>({authorization:`Bearer ${token}`})
const input={displayName:'虚构照片老师',university:'示例大学',major:'数学',subjects:['数学'],teachingMode:'线上',area:'长安区 · 大学城',pricePerHour:80,introduction:'字'.repeat(1000),availability:'周末下午',experienceMonths:24,academicScore:88,teachingSkillLevel:4,caseCount:3,caseSummary:'虚构匿名案例：错题复盘。'}
async function login(loginId:string,role:string){
 await db.user.create({data:{loginId,displayName:loginId,role,passwordHash:await hashPassword('photo-test-password')}})
 const response=await app.inject({method:'POST',url:'/api/auth/login',payload:{loginId,password:'photo-test-password'}})
 expect(response.statusCode).toBe(200)
 return response.json().data.token as string
}
function upload(token:string,bytes:Buffer,filename='portrait.png'){
 const boundary='photo-test-boundary'
 const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)])
 return app.inject({method:'POST',url:'/api/tutor-applications/photo',headers:{...auth(token),'content-type':`multipart/form-data; boundary=${boundary}`},payload:body})
}
beforeAll(async()=>{await app.ready();tutorToken=await login('photo-tutor','tutor');parentToken=await login('photo-parent','parent');adminToken=await login('photo-admin','admin')})
afterAll(async()=>{await app.close()})

it('照片只能由本人上传，审核前不公开；经验字段与照片经审核后公开，修改即撤回',async()=>{
 const image=await sharp({create:{width:12,height:12,channels:3,background:'#3080a0'}}).png().toBuffer()
 expect((await upload('',image)).statusCode).toBe(401)
 expect((await upload(parentToken,image)).statusCode).toBe(403)
 expect((await upload(tutorToken,image)).statusCode).toBe(409)
 expect((await app.inject({method:'PUT',url:'/api/tutor-applications/draft',headers:auth(tutorToken),payload:{...input,displayName:'',introduction:''}})).statusCode).toBe(200)
 expect((await upload(tutorToken,Buffer.from('not an image'))).statusCode).toBe(400)
 const uploaded=await upload(tutorToken,image)
 expect(uploaded.statusCode).toBe(200)
 expect(uploaded.json().data.photoUrl).toMatch(/^data:image\/jpeg;base64,/)
 const mine=await app.inject({method:'GET',url:'/api/tutor-applications/mine',headers:auth(tutorToken)})
 expect(mine.json().data.photoUrl).toMatch(/^data:image\/jpeg;base64,/)
 expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutorToken),payload:{...input,academicScore:101}})).statusCode).toBe(400)
 expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutorToken),payload:{...input,caseSummary:'学生手机号13800138000'}})).statusCode).toBe(400)
 const submitted=await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutorToken),payload:input})
 expect(submitted.statusCode).toBe(200)
 const applicationId=submitted.json().data.id as string
 const profile=await db.tutorProfile.findFirstOrThrow({where:{user:{loginId:'photo-tutor'}}})
 expect((await app.inject({method:'GET',url:`/api/tutors/${profile.id}/photo`})).statusCode).toBe(404)
 expect((await upload(tutorToken,image)).statusCode).toBe(409)
 const adminView=await app.inject({method:'GET',url:`/api/admin/tutor-applications/${applicationId}`,headers:auth(adminToken)})
 expect(adminView.json().data.photoUrl).toMatch(/^data:image\/jpeg;base64,/)
 expect((await app.inject({method:'GET',url:`/api/admin/tutor-applications/${applicationId}`,headers:auth(parentToken)})).statusCode).toBe(403)
 expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(adminToken),payload:{decision:'approved'}})).statusCode).toBe(200)
 const tutor=await app.inject({method:'GET',url:`/api/tutors/${profile.id}`})
 expect(tutor.json().data).toMatchObject({area:'长安区 · 大学城',introduction:'字'.repeat(1000),experienceMonths:24,academicScore:88,teachingSkillLevel:4,caseCount:3,photoUrl:`/api/tutors/${profile.id}/photo`})
 const publicPhoto=await app.inject({method:'GET',url:`/api/tutors/${profile.id}/photo`})
 expect(publicPhoto.statusCode).toBe(200)
 expect(publicPhoto.headers['content-type']).toContain('image/jpeg')
 expect(publicPhoto.rawPayload.subarray(0,3)).toEqual(Buffer.from([255,216,255]))
 expect((await sharp(publicPhoto.rawPayload).metadata()).exif).toBeUndefined()
 const changed=await upload(tutorToken,image)
 expect(changed.statusCode).toBe(200)
 expect(changed.json().data.status).toBe('draft')
 expect((await app.inject({method:'GET',url:`/api/tutors/${profile.id}/photo`})).statusCode).toBe(404)
 expect((await app.inject({method:'POST',url:'/api/tutor-applications',headers:auth(tutorToken),payload:{...input,experienceMonths:null}})).statusCode).toBe(200)
 expect((await app.inject({method:'POST',url:`/api/admin/tutor-applications/${applicationId}/review`,headers:auth(adminToken),payload:{decision:'approved'}})).statusCode).toBe(200)
 const revised=(await app.inject({method:'GET',url:`/api/tutors/${profile.id}`})).json().data
 expect(revised.experienceMonths).toBeUndefined()
 expect((await app.inject({method:'GET',url:`/api/tutors/${profile.id}/photo`})).statusCode).toBe(200)
})
