const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const assert=require('assert');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const out=path.resolve('docs/screenshots/ai-assistant');fs.mkdirSync(out,{recursive:true});const checks=[];
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:960}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5192/#/pages/auth/login');await page.getByText('管理员演示',{exact:true}).click();await page.locator('uni-button').filter({hasText:'进入演示模式'}).click();await page.waitForTimeout(500);
 await page.goto('http://127.0.0.1:5192/#/pages/admin/model-settings');await page.getByText('先连接，再开始对话。').waitFor();await page.screenshot({path:path.join(out,`settings-mock-${width}.jpg`),fullPage:true});
 await page.goto('http://127.0.0.1:5192/#/pages/index/index');const launcher=page.locator('[aria-label="打开小书灵 AI 对话"]');await launcher.click();await page.getByRole('dialog').waitFor();await page.screenshot({path:path.join(out,`floating-${width}.jpg`)});
 await page.locator('[aria-label="关闭AI对话"]').click();assert(await launcher.isVisible());
 await page.goto('http://127.0.0.1:5192/#/pages/assistant/homework');await page.getByRole('button',{name:'填入示例'}).click();await page.waitForTimeout(150);assert((await page.locator('[aria-label="题目"] textarea').inputValue()).includes('2x'));
 await page.screenshot({path:path.join(out,`homework-${width}.jpg`),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(errors.length,0,JSON.stringify(errors));checks.push({width,errors,overflow:false});await context.close();
}
await browser.close();fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({mode:'mock',checks},null,2));console.log(JSON.stringify(checks));})().catch(e=>{console.error(e);process.exit(1)});
