const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const origin='http://127.0.0.1:5192';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const out=path.resolve('docs/screenshots/ai-assistant');fs.mkdirSync(out,{recursive:true});const checks=[];
for(const width of [390,1440])for(const theme of ['green','jenny']){
 const context=await browser.newContext({viewport:{width,height:960}}),page=await context.newPage(),errors=[];
 let role='admin',settings={baseUrl:'https://api.deepseek.com',model:'deepseek-flash',enabled:false,vision:false,hasKey:false,storageError:false,configured:false,allowedHosts:['api.deepseek.com']};
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({theme})=>{localStorage.setItem('tutor-platform:api-token:v1',JSON.stringify({type:'string',data:'fixture-token'}));localStorage.setItem('tutor-platform:appearance:v1',JSON.stringify({type:'string',data:theme}));},{theme});
 await context.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname;let data={};
  if(p==='/api/auth/me')data={id:'fixture-'+role,displayName:'虚构验收账户',role};
  else if(p==='/api/admin/model-settings'){
   if(req.method()==='PUT'){const v=req.postDataJSON();settings={...settings,...v,apiKey:undefined,hasKey:settings.hasKey||!!v.apiKey,configured:true}}
   data=settings;
  }else if(p==='/api/admin/model-settings/test')data={ok:true,latencyMs:128,model:settings.model,testedAt:new Date().toISOString(),scope:'text'};
  else if(p.endsWith('/status'))data={enabled:settings.enabled,maxImageBytes:3145728,acceptedTypes:['image/png']};
  else if(p==='/api/assistant/chat'||p==='/api/assistant/homework-review-text')data={source:'model',reply:'需要修改\n移项时应减去 6，而不是加上 6。\n2x = 14 − 6 = 8，因此 x = 4。\n建议：代回原方程检查等式是否成立。\n复习知识点：等式性质与移项。'};
  else if(p==='/api/tutors') {await route.fulfill({json:{data:[],meta:{total:0,page:1,pageSize:20}}});return}
  else data=[];
  await route.fulfill({json:{data}});
 });
 await page.goto(origin+'/#/pages/admin/model-settings');await page.getByText('服务配置',{exact:true}).waitFor();await page.waitForTimeout(450);
 const key=page.locator('[aria-label="API 密钥"] input');await key.fill('fixture-secret-not-real');await page.getByRole('button',{name:'保存配置',exact:true}).click();await page.getByText('配置已保存，即时生效。现在可以测试连接。').waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="API 密钥"] input')?.value==='');assert.equal(await key.inputValue(),'');
 await page.getByRole('button',{name:'测试连接',exact:true}).click();await page.getByText(/连接成功 · deepseek-flash/).waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(350);await page.screenshot({path:path.join(out,`settings-${theme}-${width}.jpg`),fullPage:true});
 await page.getByRole('button',{name:theme==='green'?'Jenny 浅蓝':'绿色玻璃',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.campusTheme),theme==='green'?'jenny':'green');
 await page.getByRole('button',{name:theme==='green'?'绿色玻璃':'Jenny 浅蓝',exact:true}).click();await page.reload();await page.getByText('服务配置',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.dataset.campusTheme),theme);
 role='parent';settings.enabled=true;
 await page.goto(origin+'/#/pages/assistant/homework');await page.reload();await page.getByRole('button',{name:'填入示例'}).click();await page.waitForTimeout(200);const q=page.locator('[aria-label="题目"] textarea');assert((await q.inputValue()).includes('2x'));
 await page.locator('.ai-check').click();await page.getByRole('button',{name:'开始批改',exact:true}).click();await page.locator('.ai-output').waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(350);await page.screenshot({path:path.join(out,`review-${theme}-${width}.jpg`),fullPage:true});
 await page.locator('[aria-label="打开小书灵 AI 对话"]').click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(450);await page.screenshot({path:path.join(out,`chat-${theme}-${width}.jpg`)});
 await page.locator('.companion-compose textarea').fill('请介绍如何学习方程');await page.waitForTimeout(150);await page.getByRole('button',{name:'发送',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('.companion-message.assistant').filter({hasText:'需要修改'}).waitFor();
 await page.screenshot({path:path.join(out,`chat-${theme}-${width}.jpg`)});await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.getByRole('dialog').count(),0);assert(await page.locator('[aria-label="打开小书灵 AI 对话"]').evaluate(el=>el===document.activeElement));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(errors.length,0,JSON.stringify(errors));
 await page.emulateMedia({reducedMotion:'reduce'});const animation=await page.locator('.ai-glass').first().evaluate(el=>getComputedStyle(el).animationName);assert.equal(animation,'none');
 checks.push({width,theme,configSave:true,keyCleared:true,connectionTest:true,themeRestored:true,homework:true,chat:true,overflow:false,errors});await context.close();
}
await browser.close();fs.writeFileSync(path.join(out,'api-browser-review.json'),JSON.stringify({mode:'API browser responses intercepted; real HTTP protocol tested separately by server tests; no vendor API used',checks},null,2));console.log(JSON.stringify(checks));})().catch(e=>{console.error(e);process.exit(1)});
