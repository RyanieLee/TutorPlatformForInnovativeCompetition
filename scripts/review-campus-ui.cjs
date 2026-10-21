const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const preview=process.env.CAMPUS_PREVIEW_URL||'http://127.0.0.1:5188';
 const browser=await chromium.launch({headless:true,...(process.env.EDGE_PATH?{executablePath:process.env.EDGE_PATH}:{channel:'msedge'})});
 fs.mkdirSync('docs/screenshots/campus-ui',{recursive:true});
 const report=[];
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,route] of [['home','index/index'],['match','match/index']]){
   await page.goto(`${preview}/#/pages/${route}`);await page.waitForTimeout(1000);
   const metrics=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
   await page.screenshot({path:`docs/screenshots/campus-ui/${name}-${width}.png`,fullPage:true});
   await page.screenshot({path:`docs/screenshots/campus-ui/${name}-${width}.jpg`,type:'jpeg',quality:72,fullPage:true});
   if(metrics.body>width){const offenders=await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+0.5).slice(0,8).map(e=>({tag:e.tagName,cls:e.className?.baseVal||e.className,right:e.getBoundingClientRect().right})));throw Error(`${name} overflow at ${width}: ${metrics.body} ${JSON.stringify(offenders)}`)}
   report.push({width,name,metrics});
   if(name==='home'){await page.locator('uni-button').filter({hasText:'AI 家教匹配'}).click();await page.waitForFunction(()=>location.hash.includes('/pages/match/index'))}
  }
  for(const role of ['tutor','admin']){
   await page.goto(`${preview}/#/pages/auth/login?role=${role}`);await page.waitForTimeout(350);
   await page.getByText(role==='tutor'?'大学生家教':'管理员演示',{exact:true}).click();
   await page.locator('.action').click();await page.waitForTimeout(1800);
   await page.goto(`${preview}/#/pages/${role}/${role==='tutor'?'workbench':'index'}`);await page.waitForTimeout(900);
   const name=role+'-workbench',metrics=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
   await page.screenshot({path:`docs/screenshots/campus-ui/${name}-${width}.png`,fullPage:true});
   await page.screenshot({path:`docs/screenshots/campus-ui/${name}-${width}.jpg`,type:'jpeg',quality:72,fullPage:true});
   if(metrics.body>width)throw Error(`${name} overflow at ${width}: ${metrics.body}`);
   report.push({width,name,metrics});
   if(role==='tutor'){
    await page.goto(`${preview}/#/pages/teaching/index?bookingId=review-only`);await page.waitForTimeout(650);
    const teachingMetrics=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
    await page.screenshot({path:`docs/screenshots/campus-ui/teaching-${width}.png`,fullPage:true});
    await page.screenshot({path:`docs/screenshots/campus-ui/teaching-${width}.jpg`,type:'jpeg',quality:72,fullPage:true});
    if(teachingMetrics.body>width)throw Error(`Teaching overflow at ${width}`);
    report.push({width,name:'teaching-shell',metrics:teachingMetrics});
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
  await page.close();
 }
 fs.writeFileSync('docs/screenshots/campus-ui/review.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
