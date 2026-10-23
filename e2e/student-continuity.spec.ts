import {test,expect,type Page} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const go=(p:Page,path:string)=>p.goto('/#/pages/'+path)
const button=(p:Page,text:string)=>p.locator('uni-button').filter({hasText:text})
const confirm=(p:Page)=>p.locator('.uni-modal__btn_primary').click()
const legacyField=(p:Page,text:string)=>p.locator('uni-input,uni-textarea').filter({has:p.getByText(text,{exact:true})}).locator('input,textarea')
const field=(p:Page,text:string)=>p.locator('.ai-field').filter({has:p.getByText(text,{exact:true})}).locator('input,textarea')
async function login(p:Page,role:'parent'|'tutor',api:boolean){
 await go(p,'profile/index');const logout=button(p,api?'退出登录':'退出演示身份');if(await logout.isVisible())await logout.click()
 await button(p,'演示登录').click()
 if(api){await legacyField(p,'账户 ID').fill('demo.'+role);await legacyField(p,'密码').fill(process.env.E2E_PASSWORD!)}
 else await p.locator('.role').filter({hasText:role==='parent'?'学生 / 家长':'大学生家教'}).click()
 await button(p,api?'登录开发账户':'进入演示模式').click()
 await expect(button(p,api?'退出登录':'退出演示身份')).toBeVisible()
}
test('云伴学：独立档案→试课授权→作业训练→备课报告→交接撤权，双主题',async({page},info)=>{
 const api=info.project.name.startsWith('api'),student='连续学习-'+info.project.name,errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await login(page,'parent',api)
 await go(page,'index/index');await legacyField(page,'搜索科目、地区或老师姓名').fill('小林');await page.locator('.card').filter({hasText:'小林'}).first().click()
 await button(page,api?'发起开发预约':'发起演示预约').click();await legacyField(page,'例如：测试同学').fill(student)
 if(!api)await legacyField(page,'11位演示数字').fill('13800000000')
 await legacyField(page,'例如：周六下午2点').fill('周末虚构时间');await button(page,api?'提交开发预约':'保存演示预约').click()
 const order=page.locator('.card').filter({hasText:student});await expect(order).toContainText('待家教确认');await order.locator('uni-button').filter({hasText:'学生档案与授权'}).click()
 await field(page,'学习称呼').fill(student);await field(page,'年级').fill('初一');await field(page,'学习目标').fill('复习分数通分，保留可交接的学习记录')
 await page.getByTestId('create-archive').click();await expect(page.getByRole('status')).toContainText('学生档案已创建')
 await button(page,'试课与授权').click();await page.getByTestId('bind-booking').click();await expect(page.getByRole('status')).toContainText('预约已关联')
 const archiveUrl=page.url()
 await login(page,'tutor',api);await go(page,'tutor/workbench');await page.locator('.b-card').filter({hasText:student}).locator('uni-button').click()
 await button(page,'接受预约').click();await confirm(page);await expect(page.locator('.b-status')).toContainText('家教已接受')
 await button(page,'预约沟通与通勤').click();await page.locator('textarea').fill('已收到预约，我们先安排一次试课。');await button(page,'发送消息').click();await expect(page.locator('.messages').getByText('已收到预约，我们先安排一次试课。',{exact:true})).toBeVisible()
 await page.goto(archiveUrl);await expect(page.getByText('基础需求可见',{exact:true})).toBeVisible();await expect(page.getByTestId('archive-review')).toHaveCount(0)
 await button(page,'试课与授权').click();await field(page,'试课观察（可核对的具体事实）').fill('试课中把分子分母分别相加，需要先复习通分。');await page.getByTestId('record-trial').click();await expect(page.getByRole('status')).toContainText('试课观察已提交')
 await login(page,'parent',api);await page.goto(archiveUrl);await button(page,'试课与授权').click();await page.getByTestId('confirm-trial').click();await expect(page.getByRole('status')).toContainText('试课已确认')
 await button(page,'作业与训练详情').click();await page.getByTestId('grant-access').click();await confirm(page);await expect(page.getByRole('status')).toContainText('授权已保存')
 await button(page,'作业与训练').filter({hasText:/^作业与训练$/}).click();await page.getByTestId('sample-review').click();await expect(page.getByTestId('archive-review')).toContainText('固定示例 · 非实时生成')
 await login(page,'tutor',api);await page.goto(archiveUrl);await button(page,'作业与训练').filter({hasText:/^作业与训练$/}).click();let lost=false
 if(api)await page.route('**/student-archives/*/actions',async route=>{if(!lost&&route.request().postDataJSON()?.type==='confirmReview'){lost=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed')}else await route.continue()})
 await page.getByTestId('confirm-review').click()
 if(api){await button(page,'重试上次提交（同一请求）').click();await page.unroute('**/student-archives/*/actions')}
 await expect(page.getByRole('status')).toContainText('教师确认')
 await login(page,'parent',api);await page.goto(archiveUrl);await button(page,'作业与训练').filter({hasText:/^作业与训练$/}).click();await field(page,'你的训练作答').fill('先通分为3/6和2/6，再相加得到5/6。');await page.getByTestId('submit-training').click();await expect(page.getByRole('status')).toContainText('训练作答已提交')
 await login(page,'tutor',api);await page.goto(archiveUrl);await button(page,'作业与训练').filter({hasText:/^作业与训练$/}).click();await button(page,'整理备课报告草稿').click();await expect(field(page,'学情报告正文')).toHaveValue(/训练提交：1 次/)
 await button(page,'保存备课报告草稿').click();await expect(page.getByRole('status')).toContainText('草稿已保存');await page.getByTestId('confirm-report').click();await expect(page.getByRole('status')).toContainText('报告已确认')
 await button(page,'用于下一课草稿').click();await expect(page.getByText('已导入教师确认的学情报告。',{exact:false})).toBeVisible();await expect(page.getByTestId('preview-text').locator('textarea')).toHaveValue(/通分/)
 await login(page,'parent',api);await page.goto(archiveUrl);await button(page,'换师交接').click();await button(page,'选择报告').click();await button(page,'保存家长确认的交接摘要').click();await confirm(page);await expect(page.getByRole('status')).toContainText('交接摘要已保存')
 mkdirSync('docs/screenshots/student-continuity',{recursive:true})
 for(const theme of ['绿色玻璃','Jenny 浅蓝']){await button(page,theme).click();await expect(page.locator('.archive-identity')).toContainText(student);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.uni-toast')).toHaveCount(0);await page.screenshot({path:`docs/screenshots/student-continuity/${info.project.name}-${theme==='绿色玻璃'?'green':'jenny'}.jpg`,quality:80,fullPage:true,scale:'css'})}
 await button(page,'试课与授权').click();await button(page,'撤销该教师授权').click();await confirm(page);await expect(page.getByRole('status')).toContainText('已撤销')
 await login(page,'tutor',api);await page.goto(archiveUrl);await expect(page.getByText('基础需求可见',{exact:true})).toBeVisible();await button(page,'作业与训练').filter({hasText:/^作业与训练$/}).click();await expect(page.getByTestId('archive-review')).toHaveCount(0)
 expect(errors).toEqual([])
})
