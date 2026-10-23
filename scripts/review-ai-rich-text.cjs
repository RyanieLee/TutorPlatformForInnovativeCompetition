const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const answer=String.raw`## 二元一次方程组

**两个未知数，两个一次方程。** 例如：

\[
\begin{cases}
2x+y=5\\
x-y=1
\end{cases}
\]

1. 两式相加，得到 $3x=6$，所以 $x=2$。
2. 代入第二式：$y=x-1=1$。

**检查：** $2\times2+1=5$，且 $2-1=1$，均成立。

分式与根号示例：$\frac{1}{2}+\frac{1}{2}=1$，$\sqrt{4}=2$。

| 方法 | 思路 |
| --- | --- |
| 代入消元 | 用一个未知数表示另一个 |
| 加减消元 | 相加或相减消去一个未知数 |


`+'复习时先观察系数，再选择合适的消元方法。'.repeat(35);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out=path.resolve('docs/screenshots/ai-rich-text');fs.mkdirSync(out,{recursive:true});const checks=[];
 try{for(const width of [390,1440])for(const theme of ['green','jenny']){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],sent=[];let fail=false;
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(theme=>{localStorage.setItem('tutor-platform:api-token:v1',JSON.stringify({type:'string',data:'fixture-only'}));localStorage.setItem('tutor-platform:appearance:v1',JSON.stringify({type:'string',data:theme}));},theme);
  await context.route('**/api/**',async route=>{
   const p=new URL(route.request().url()).pathname;let data={};
   if(!p.startsWith('/api/')){await route.continue();return}
   if(p==='/api/auth/me')data={id:'fixture-parent',displayName:'虚构验收家长',role:'parent'};
   else if(p.endsWith('/status'))data={enabled:true};
   else if(p==='/api/assistant/chat'){
    sent.push(route.request().postDataJSON());
    if(fail){await route.fulfill({status:502,json:{error:{code:'MODEL_UPSTREAM',message:'模型回答达到长度上限，尚未完成；请缩小问题范围后重试'}}});return}
    data={reply:answer,source:'model'};
   }else if(p==='/api/assistant/homework-review-text')data={reply:answer,source:'model'};
   else data=[];
   await route.fulfill({json:{data}});
  });
  await page.goto('http://127.0.0.1:5195/#/pages/assistant/index');await page.locator('.companion-source').filter({hasText:'服务端模型对话'}).waitFor();
  const input=page.locator('.companion-compose textarea'),send=page.locator('.companion-compose uni-button');
  await input.fill('给我介绍一下二元一次方程组');await send.click();
  const reply=page.locator('.companion-message.assistant').last();await reply.locator('h2').waitFor();await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);
  assert(await reply.locator('strong').count()>=2);assert(await reply.locator('.katex').count()>=6);assert.equal(await reply.locator('.katex-error').count(),0);
  assert.equal(await reply.locator('table').count(),1);assert.equal(await reply.locator('ol li').count(),2);
  assert.equal(await reply.locator('td').first().evaluate(el=>getComputedStyle(el).borderTopWidth),'1px');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390){await page.setViewportSize({width:375,height:667});assert(await page.locator('.companion-compose').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));await page.setViewportSize({width,height:1000});await page.waitForTimeout(200)}
  await page.screenshot({path:path.join(out,`chat-${theme}-${width}.jpg`)});
  await input.fill('为什么两式可以相加？');await send.click();await page.waitForFunction(()=>document.querySelector('.companion-compose textarea').value==='');
  assert.equal(sent[1].messages[1].content,answer);
  fail=true;await input.fill('继续解释');await send.click();await page.locator('.companion-error').filter({hasText:'模型回答达到长度上限'}).waitFor();assert.equal(await input.inputValue(),'继续解释');
  await page.goto('http://127.0.0.1:5195/#/pages/assistant/homework');await page.getByRole('button',{name:'填入示例'}).click();await page.locator('.ai-check').click();await page.getByRole('button',{name:'开始批改',exact:true}).click();
  await page.locator('.ai-output .katex').first().waitFor();assert.equal(await page.locator('.ai-output .katex-error').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`review-${theme}-${width}.jpg`),fullPage:true});
  assert.deepEqual(errors,[]);checks.push({width,theme,markdown:true,math:true,fullHistory:true,clearError:true,homework:true,overflow:false,errors});await context.close();
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
})().catch(e=>{console.error(e);process.exitCode=1});
