import {expect,type Page,type APIRequestContext} from '@playwright/test'
import {randomUUID} from 'node:crypto'
export const api='http://127.0.0.1:3002'
export async function apiLogin(request:APIRequestContext,role:'parent'|'tutor'){
 const r=await request.post(api+'/api/auth/login',{data:{loginId:'demo.'+role,password:process.env[role==='parent'?'SEED_PARENT_PASSWORD':'SEED_TUTOR_PASSWORD']}})
 expect(r.status()).toBe(200);return(await r.json()).data.token as string
}
export async function makeBooking(request:APIRequestContext,parent:string,tutor:string,studentName='审核演示学生'){
 const profiles=await request.get(api+'/api/tutors'),profile=(await profiles.json()).data[0]
 const r=await request.post(api+'/api/bookings',{headers:{Authorization:'Bearer '+parent},data:{tutorId:profile.id,studentName,subject:'数学',expectedTime:'周末下午',requestId:randomUUID()}})
 expect(r.status()).toBe(200);const booking=(await r.json()).data
 expect((await request.post(api+'/api/bookings/'+booking.id+'/accept',{headers:{Authorization:'Bearer '+tutor}})).status()).toBe(200)
 return booking
}
export async function loginPage(page:Page,role:'parent'|'tutor'){
 await page.goto('/#/pages/auth/login')
 await page.locator('uni-input').filter({has:page.getByText('账户 ID',{exact:true})}).locator('input').fill('demo.'+role)
 await page.locator('uni-input').filter({has:page.getByText('密码',{exact:true})}).locator('input').fill(process.env[role==='parent'?'SEED_PARENT_PASSWORD':'SEED_TUTOR_PASSWORD']!)
 await page.locator('uni-button').filter({hasText:'登录开发账户'}).click()
 await expect(page).not.toHaveURL(/pages\/auth\/login/, {timeout:15000})
}

