const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const out=path.resolve('docs/screenshots/ui-polish');fs.mkdirSync(out,{recursive:true});
 const checks=[];
 try{for(const width of [375,1440])for(const theme of ['green','jenny']){
  const context=await browser.newContext({viewport:{width,height:width===375?844:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/assistant/status',r=>r.fulfill({json:{data:{enabled:false}}}));
  await context.addInitScript(theme=>localStorage.setItem('tutor-platform:appearance:v1',JSON.stringify({type:'string',data:theme})),theme);
  await page.goto('http://127.0.0.1:5173/#/pages/auth/login');
  await page.locator('.credentials input').first().waitFor();
  await page.locator('.credentials input').nth(0).fill('demo.parent');
  await page.locator('.credentials input').nth(1).fill('Example-Only-1234');
  const fields=await page.locator('.credentials input').evaluateAll(nodes=>nodes.map(el=>{
   const r=el.getBoundingClientRect(),h=el.closest('uni-input').getBoundingClientRect(),s=getComputedStyle(el);
   return{height:r.height,hostHeight:h.height,font:parseFloat(s.fontSize),contained:r.top>=h.top&&r.bottom<=h.bottom};
  }));
  for(const f of fields){assert(f.hostHeight>=54,'登录输入框应至少54px高');assert(f.height>=24&&f.contained,'输入文字不能被挤压或裁切');assert(f.font>=16,'输入字号至少16px');}
  assert.equal(await page.locator('.credential-label').count(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`login-${theme}-${width}.jpg`),quality:85});
  await page.goto('http://127.0.0.1:5173/#/pages/index/index');
  await page.getByRole('button',{name:'绿色磨砂风',exact:true}).waitFor();
  await page.getByRole('button',{name:'浅蓝风',exact:true}).waitFor();
  await page.locator('.hero-cta').waitFor();
  const arrow=await page.locator('.ai-arrow').evaluate(el=>{
   const box=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const glyph=range.getBoundingClientRect();
   return {x:glyph.x+glyph.width/2-box.x-box.width/2,y:glyph.y+glyph.height/2-box.y-box.height/2};
  });
  assert(Math.abs(arrow.x)<1&&Math.abs(arrow.y)<1,'智能匹配箭头应在圆形底色中水平、垂直居中');
  await page.locator('.ai-entry').screenshot({path:path.join(out,`match-${theme}-${width}.jpg`),quality:90});
  if(theme==='jenny'){
   const brand=await page.locator('.brand-icon').evaluate(el=>({image:getComputedStyle(el).backgroundImage,size:getComputedStyle(el).backgroundSize}));
   assert(brand.image.includes('linghang-logo.svg')&&brand.size==='contain','浅蓝logo应使用完整素材而非截图裁切');
   await page.locator('.brand').screenshot({path:path.join(out,`brand-${width}.jpg`),quality:90});
  }
  if(theme==='green'){
   const controls=await page.locator('.hero-actions uni-button,.filter-actions uni-button').evaluateAll(nodes=>nodes.map(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();return{height:r.height,line:parseFloat(s.lineHeight),font:parseFloat(s.fontSize),left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight),top:parseFloat(s.paddingTop),bottom:parseFloat(s.paddingBottom)};
   }));
   for(const b of controls){assert(b.height>=36&&b.height<=40,'首页按钮压缩上下留白');assert(b.top<=8&&b.bottom<=8);assert(b.font>=14&&b.line/b.font<=1.6);assert(b.left<=16&&b.right<=16,'横向留白不应过宽');}
  }
  await page.screenshot({path:path.join(out,`home-${theme}-${width}.jpg`),quality:85});
  await page.locator('.companion-launcher').click();
  await page.locator('.companion-source').filter({hasText:'本机演示'}).waitFor();
  for(let i=0;i<4;i++){
   await page.locator('.companion-shortcuts uni-button').nth(2).click();
   await page.waitForFunction(count=>document.querySelectorAll('.companion-message.assistant').length>=count,i+2);
  }
  const scroller=page.locator('.companion-log .uni-scroll-view').nth(1);
  const scroll=await scroller.evaluate(el=>({height:el.clientHeight,total:el.scrollHeight,top:el.scrollTop}));
  assert(scroll.total>scroll.height+100,'问答历史应在受限高度内形成可滚动区域');
  await page.waitForFunction(()=>document.querySelector('.companion-log .uni-scroll-view .uni-scroll-view').scrollTop>0);
  const bottom=await scroller.evaluate(el=>el.scrollTop);
  await page.locator('.companion-log').hover();await page.mouse.wheel(0,-600);
  await page.waitForFunction(old=>document.querySelector('.companion-log .uni-scroll-view .uni-scroll-view').scrollTop<old,bottom);
  assert(await page.locator('.companion-compose').isVisible());
  await page.screenshot({path:path.join(out,`history-${theme}-${width}.jpg`),quality:85});
  await page.getByRole('button',{name:'关闭AI对话',exact:true}).click();
  await page.getByRole('button',{name:theme==='green'?'浅蓝风':'绿色磨砂风',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.campusTheme),theme==='green'?'jenny':'green');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  checks.push({width,theme,fields,scroll,historyWheel:true,themeSwitch:true,overflow:false,errors});await context.close();
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
})().catch(e=>{console.error(e);process.exitCode=1});
