import {test,expect} from '@playwright/test'
import {apiLogin,makeBooking,loginPage} from './browser-helpers'
test('老师能从已接受预约进入课次与作业',async({page,request})=>{
 const parent=await apiLogin(request,'parent'),tutor=await apiLogin(request,'tutor'),booking=await makeBooking(request,parent,tutor)
 await loginPage(page,'tutor')
 await page.goto('/#/pages/tutor/booking-detail?id='+booking.id)
 await expect(page.getByRole('button',{name:'课次与作业',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'课次与作业',exact:true}).click()
 await expect(page.getByRole('button',{name:'新建课次',exact:true})).toBeVisible()
 await expect(page.getByText('还没有课次',{exact:true})).toBeVisible()
})

