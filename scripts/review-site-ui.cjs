// Read-only visual audit against the local API preview; never prints credentials.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const settings=require('../server/node_modules/dotenv').parse(fs.readFileSync(path.resolve('server/.env')));
(async()=>{
 const api='http://127.0.0.1:3001',tokens={};
 async function read(url,token){const r=await fetch(api+url,{headers:token?{Authorization:'Bearer '+token}:{}});if(!r.ok)throw Error('读取失败 '+url+' '+r.status);return(await r.json()).data}
 for(const role of ['parent','tutor','admin']){
  const r=await fetch(api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loginId:'demo.'+role,password:settings['SEED_'+role.toUpperCase()+'_PASSWORD']})});
  if(!r.ok)throw Error('本机测试账户不可用');tokens[role]=(await r.json()).data.token;
 }
 const tutor=(await read('/api/tutors?page=1&pageSize=1'))[0],application=(await read('/api/admin/tutor-applications',tokens.admin)).find(a=>a.status==='pending');
 const booking='demo-learning-booking-1',lesson='demo-learning-lesson-1';
 const routes=[
  ...['index/index','orders/index','profile/index','auth/login','auth/register','match/index','learning/index','order-map/index','assistant/index','assistant/homework','demo/index','students/index'].map(p=>['parent',p]),
  ['parent','tutors/detail?id='+tutor.id],['parent','orders/create?tutorId='+tutor.id],['parent','reports/create?tutorId='+tutor.id],
  ['parent','teaching/index?bookingId='+booking],['parent','teaching/detail?lessonId='+lesson],['parent','teaching/loop?bookingId='+booking],['parent','connections/index?bookingId='+booking],
  ...['tutor/workbench','tutor/application','students/index'].map(p=>['tutor',p]),['tutor','tutor/booking-detail?id='+booking],['tutor','teaching/edit?bookingId='+booking],['tutor','teaching/loop?bookingId='+booking],
  ['admin','admin/index'],['admin','admin/model-settings'],['admin','admin/application-detail?id='+application.id]
 ];
 const out=path.resolve('.test-temp/site-ui-audit');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
 try{for(const width of [375,1440])for(const theme of ['green','jenny'])for(const role of ['parent','tutor','admin']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({theme,token})=>{localStorage.setItem('tutor-platform:appearance:v1',JSON.stringify({type:'string',data:theme}));localStorage.setItem('tutor-platform:api-token:v1',JSON.stringify({type:'string',data:token}));},{theme,token:tokens[role]});
  const page=await context.newPage();await page.route('https://server.arcgisonline.com/**',r=>r.abort());let errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [,route] of routes.filter(r=>r[0]===role)){
   errors=[];await page.goto('http://127.0.0.1:5173/#/pages/'+route);await page.waitForTimeout(750);
   const findings=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,inputs:[...document.querySelectorAll('uni-input')].flatMap(host=>{
    const native=host.querySelector('input'),r=host.getBoundingClientRect();if(!native||r.width===0||r.height===0)return[];
    const n=native.getBoundingClientRect(),font=parseFloat(getComputedStyle(native).fontSize);return n.height<font*1.1?[{label:host.getAttribute('aria-label')||host.querySelector('.uni-input-placeholder')?.textContent||'输入框',height:n.height,font}]:[];
   }),textLength:document.body.innerText.length}));
   const file=role+'-'+route.split('?')[0].replaceAll('/','-')+'-'+theme+'-'+width+'.jpg';
   await page.screenshot({path:path.join(out,file),quality:70,fullPage:true});results.push({role,route,width,theme,...findings,errors:[...errors],file});
   fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(results,null,2));
  }await context.close();console.log(JSON.stringify({width,theme,role,checked:results.length}));
 }}finally{await browser.close()}
 console.log(JSON.stringify({screens:results.length,routes:new Set(results.map(r=>r.route.split('?')[0])).size,findings:results.filter(r=>r.overflow||r.inputs.length||r.errors.length)}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
