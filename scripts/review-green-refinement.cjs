const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const out=path.resolve('docs/screenshots/green-refinement');fs.mkdirSync(out,{recursive:true});
 const checks=[];
 try{
  for(const width of [390,1440])for(const theme of ['green','jenny']){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(theme=>localStorage.setItem('tutor-platform:appearance:v1',JSON.stringify({type:'string',data:theme})),theme);
   await page.goto('http://127.0.0.1:5173/#/pages/index/index');
   await page.locator('.hero-cta').waitFor();await page.waitForTimeout(650);
   assert.equal(await page.locator('.hero-mascot').count(),theme==='green'?0:1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(out,`home-${theme}-${width}.jpg`)});
   const flip=page.locator('.lesson-flip');
   if(await flip.isVisible()){
    await flip.focus();await page.keyboard.press('Enter');
    await page.waitForTimeout(550);assert(await page.locator('.lesson-card').evaluate(el=>el.classList.contains('flipped')));
    await page.locator('.lesson-stage').screenshot({path:path.join(out,`lesson-back-${theme}-${width}.jpg`)});
    await page.keyboard.press('Space');await page.waitForTimeout(550);
    assert(!(await page.locator('.lesson-card').evaluate(el=>el.classList.contains('flipped'))));
   }
   await page.goto('http://127.0.0.1:5173/#/pages/assistant/index');
   await page.locator('.companion-compose textarea').waitFor();await page.waitForTimeout(400);
   assert.equal(await page.locator('.mascot-img').count(),theme==='green'?0:1);
   await page.screenshot({path:path.join(out,`assistant-${theme}-${width}.jpg`),fullPage:true});
   await page.getByRole('button',{name:theme==='green'?'Jenny 浅蓝':'绿色玻璃',exact:true}).click();
   assert.equal(await page.locator('.mascot-img').count(),theme==='green'?1:0);
   await page.getByRole('button',{name:theme==='green'?'绿色玻璃':'Jenny 浅蓝',exact:true}).click();
   if(width===390){await page.setViewportSize({width:375,height:667});assert(await page.locator('.companion-compose').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));}
   await page.emulateMedia({reducedMotion:'reduce'});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   checks.push({theme,width,noCharacter:theme==='green',themeSwitch:true,keyboardFlip:true,shortPhoneComposer:true,overflow:false,errors});
   await context.close();
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
})().catch(error=>{console.error(error);process.exitCode=1});
