import {test,expect,type Page} from '@playwright/test'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {resolve,join} from 'node:path'
import {api,apiLogin,makeBooking,loginPage} from './browser-helpers'
import {png,officeFixture} from '../overlay/server/tests/teaching-file-utils'
const personal=resolve(__dirname,'..')
async function fresh(page:Page,path:string){await page.goto(path);await page.reload()}
async function choose(page:Page,purpose:string,label:string,files:{name:string;mimeType:string;buffer:Buffer}[]){
 const picker=page.locator('[data-purpose="'+purpose+'"]')
 const event=page.waitForEvent('filechooser')
 await picker.getByRole('button',{name:'选择'+label,exact:true}).click()
 await(await event).setFiles(files)
 await expect(picker.getByText(/已上传，等待发布或提交/)).toHaveCount(files.length)
}
async function download(page:Page,name:string){
 const event=page.waitForEvent('download')
 await page.getByRole('button',{name:'下载 '+name,exact:true}).first().click()
 const file=await event
 return readFile((await file.path())!)
}
test('双账号真实课件作业闭环、重新提交、三种宽度及重启持久化',async({browser,request})=>{
 test.setTimeout(180000)
 const parentToken=await apiLogin(request,'parent'),tutorToken=await apiLogin(request,'tutor')
 const teacherContext=await browser.newContext({timezoneId:'Asia/Shanghai'}),studentContext=await browser.newContext({timezoneId:'Asia/Shanghai'})
 const teacher=await teacherContext.newPage(),student=await studentContext.newPage(),errors:string[]=[]
 const suffix=Date.now().toString(36)
 teacher.on('pageerror',e=>errors.push(e.message));student.on('pageerror',e=>errors.push(e.message))
 let restarted:any,logFd:number|undefined,lastFileId='',lastLessonId=''
 try{
  await loginPage(teacher,'tutor');await loginPage(student,'parent')
  const screenshotDir=join(personal,'docs/screenshots');await mkdir(screenshotDir,{recursive:true})
  const docx=officeFixture(),pdf=Buffer.from('%PDF-1.4\n% 虚构预习资料\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')
  for(const width of [1440,390,320]){
   await teacher.setViewportSize({width,height:960});await student.setViewportSize({width,height:960})
   const studentName='审核演示学生-'+width+'-'+suffix,booking=await makeBooking(request,parentToken,tutorToken,studentName)
   await fresh(teacher,'/#/pages/tutor/booking-detail?id='+booking.id)
   await teacher.getByRole('button',{name:'课次与作业',exact:true}).click()
   await teacher.getByRole('button',{name:'新建课次',exact:true}).click()
   const title='第1节 · 一元一次方程（'+width+'）'
   await teacher.getByTestId('lesson-title').locator('input').fill(title)
   if(width===390)await teacher.getByTestId('lesson-title').locator('input').evaluate((input:any)=>{const value=input.value;input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.dispatchEvent(new InputEvent('input',{data:value,isComposing:true,bubbles:true}));input.dispatchEvent(new CompositionEvent('compositionend',{data:value,bubbles:true}));input.dispatchEvent(new Event('input',{bubbles:true}))})
   await teacher.getByTestId('lesson-time').locator('input').fill('2099-01-01 18:00')
   await teacher.getByTestId('preview-text').locator('textarea').fill('课前阅读方程概念，带着问题来上课。')
   await teacher.getByTestId('homework-text').locator('textarea').fill('完成练习册第1—3题，拍照或上传文档。')
   await teacher.getByTestId('homework-due').locator('input').fill('2099-01-03 20:00')
   await teacher.getByRole('button',{name:'保存草稿',exact:true}).click()
   await expect(teacher).toHaveURL(/lessonId=/)
   await expect(teacher.getByRole('button',{name:'选择预习课件',exact:true})).toBeVisible()
   await fresh(student,'/#/pages/teaching/index?bookingId='+booking.id)
   await expect(student.getByText('还没有课次',{exact:true})).toBeVisible()
   await expect(student.getByText(title,{exact:true})).toHaveCount(0)
   const previewName='预习课件-'+width+'.pdf'
   if(width===1440){
    const removedName='不再发布的旧课件.pdf'
    await choose(teacher,'preview','预习课件',[{name:removedName,mimeType:'application/pdf',buffer:pdf},{name:previewName,mimeType:'application/pdf',buffer:pdf}])
    await teacher.locator('.t-upload-row').filter({hasText:removedName}).getByRole('button',{name:'移除',exact:true}).click()
    await expect(teacher.getByText(removedName,{exact:true})).toHaveCount(0)
    const editUrl=teacher.url()
    await teacher.getByRole('button',{name:'保存草稿',exact:true}).click()
    await expect(teacher.getByText('草稿已保存，课件可在下方上传。',{exact:true})).toBeVisible()
    await fresh(teacher,'/#/pages/teaching/index?bookingId='+booking.id)
    await fresh(teacher,editUrl)
    await expect(teacher.getByText(previewName,{exact:true})).toBeVisible()
    await expect(teacher.getByText(removedName,{exact:true})).toHaveCount(0)
   }else await choose(teacher,'preview','预习课件',[{name:previewName,mimeType:'application/pdf',buffer:pdf}])
   await teacher.getByRole('button',{name:'发布课次',exact:true}).click()
   await teacher.locator('.uni-modal__btn_primary').click()
   await expect(teacher).toHaveURL(/pages\/teaching\/detail/)
   await expect(teacher.getByText(title,{exact:true})).toBeVisible()
   lastLessonId=new URLSearchParams(teacher.url().split('?')[1]).get('lessonId')!
   const published=await request.get(api+'/api/lessons/'+lastLessonId,{headers:{Authorization:'Bearer '+tutorToken}})
   const publishedLesson=(await published.json()).data
   expect(publishedLesson.scheduledAt).toBe('2099-01-01T10:00:00.000Z')
   expect(publishedLesson.attachments.map((a:any)=>a.originalName)).toEqual([previewName])
   await fresh(student,'/#/pages/orders/index')
   const card=student.locator('.card').filter({hasText:studentName})
   await expect(card).toHaveCount(1);await card.getByRole('button',{name:'课次与作业',exact:true}).click()
   await student.getByRole('button',{name:'查看课次与作业',exact:true}).click()
   expect(await download(student,previewName)).toEqual(pdf)
   const imageName='手写作业-'+width+'.png'
   const docName=(width===320?'中文作业文件名用于检查窄屏显示与自动换行'.repeat(5):'解题过程-'+width)+'.docx'
   await choose(student,'submission','作业文件',[{name:imageName,mimeType:'image/png',buffer:png},{name:docName,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docx}])
   await student.getByTestId('submission-note').locator('textarea').fill('第1—3题已完成，请老师查看。')
   if(width===1440){let drop=true;await student.route('**/api/lessons/*/submissions',async route=>{if(route.request().method()==='POST'&&drop){drop=false;expect((await route.fetch()).status()).toBe(200);await route.abort('failed')}else await route.continue()})}
   await student.getByRole('button',{name:'提交作业',exact:true}).click()
   if(width===1440){await expect(student.getByText(/网络中断，结果尚未确认/)).toBeVisible();await expect(student.getByTestId('submission-note').locator('textarea')).toHaveValue('第1—3题已完成，请老师查看。');await student.getByRole('button',{name:'提交作业',exact:true}).click()}
   await expect(student.getByText('作业已提交，老师可以查看本次文件。',{exact:true})).toBeVisible()
   await teacher.getByRole('button',{name:'刷新提交记录',exact:true}).click()
   await expect(teacher.getByText('第 1 版',{exact:true})).toBeVisible()
   expect(await download(teacher,docName)).toEqual(docx)
   await teacher.getByRole('button',{name:'查看 '+imageName,exact:true}).click()
   await expect(teacher.getByRole('dialog',{name:'作业图片预览'})).toBeVisible()
   await teacher.getByRole('button',{name:'关闭预览',exact:true}).click()
   const secondName='补充解题-'+width+'.docx'
   await choose(student,'submission','作业文件',[{name:secondName,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docx}])
   await student.getByRole('button',{name:'提交新版本',exact:true}).click()
   await expect(student.getByText('第 2 版',{exact:true})).toBeVisible()
   await teacher.getByRole('button',{name:'刷新提交记录',exact:true}).click()
   await expect(teacher.getByText('第 2 版',{exact:true})).toBeVisible()
   await expect(teacher.getByText('第 1 版',{exact:true})).toBeVisible()
   expect(await download(teacher,docName)).toEqual(docx)
   for(const page of [teacher,student])expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   for(const page of [teacher,student])await page.evaluate(()=>window.scrollTo(0,0))
   await teacher.screenshot({path:join(screenshotDir,'teacher-'+width+'.png'),fullPage:true})
   await student.screenshot({path:join(screenshotDir,'student-'+width+'.png'),fullPage:true})
   const history=await request.get(api+'/api/lessons/'+lastLessonId+'/submissions',{headers:{Authorization:'Bearer '+tutorToken}})
   const rows=(await history.json()).data;expect(rows.map((r:any)=>r.revision)).toEqual([2,1])
   lastFileId=rows[0].attachments[0].id
  }
  // Restart the same private API without recreating its database or uploads.
  process.kill(Number(process.env.BROWSER_API_PID),'SIGTERM')
  const until=Date.now()+5000
  while(Date.now()<until){try{await fetch(api+'/health')}catch{break}await new Promise(r=>setTimeout(r,50))}
  const server=process.env.TEACHING_REVIEW_SERVER!,req=createRequire(join(server,'package.json'))
  logFd=openSync(join(personal,'.local/restart-api.log'),'w')
  restarted=spawn(process.execPath,['--import',req.resolve('tsx'),'src/main.ts'],{cwd:server,env:process.env,stdio:['ignore',logFd,logFd],detached:true})
  await expect.poll(async()=>{try{return(await fetch(api+'/health')).status}catch{return 0}}).toBe(200)
  await teacher.reload();await expect(teacher.getByText('第 2 版',{exact:true})).toBeVisible()
  const result=await request.get(api+'/api/attachments/'+lastFileId+'/content',{headers:{Authorization:'Bearer '+tutorToken}})
  expect(result.status()).toBe(200);expect(await result.body()).toEqual(docx)
  await writeFile(join(personal,'.local/persistence-evidence.json'),JSON.stringify({lessonId:lastLessonId,fileId:lastFileId,revision:2,sha256:createHash('sha256').update(docx).digest('hex')}))
  expect(errors).toEqual([])
 }finally{
  await teacherContext.close();await studentContext.close()
  if(restarted){try{process.kill(-restarted.pid,'SIGTERM')}catch{}}
  if(logFd!==undefined)closeSync(logFd)
 }
})

