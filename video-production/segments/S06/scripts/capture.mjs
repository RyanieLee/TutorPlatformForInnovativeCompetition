import {spawn,execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {readFileSync,writeFileSync,mkdirSync,existsSync,createWriteStream} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import net from 'node:net'
import {auditPacing} from './pacing.mjs'
import {performance} from 'node:perf_hooks'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(root,'../../..')
const require=createRequire(resolve(repo,'package.json')),{chromium,expect}=require('@playwright/test'),{PNG}=require('pngjs')
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')),id=manifest.id,duration=manifest.durationSec
const runId=new Date().toISOString().replace(/[:.]/g,'-'),rawDir=resolve(root,'raw',runId)
for(const path of [rawDir,resolve(root,'evidence')])mkdirSync(path,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),events=[],errors=[],modelRequests=[]
let browser,page,recorder,server,xvfb,t0=0,rawOrigin=0,progress={},display='',serverUrl=''
const run={id:runId,status:'running',gitSha:manifest.gitSha,captureHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),browserViewport:[1280,720],deviceScaleFactor:1.5,nativeCaptureResolution:[1920,1080],freshContext:true,events,errors,modelRequests,nativePreparation:[],rawVideo:`raw/${runId}/input.mkv`}
function log(kind,details={}){const e={timeSec:t0?Number(((performance.now()-t0)/1000).toFixed(3)):null,kind,...details};events.push(e);console.log(JSON.stringify(e))}
function stop(proc){if(!proc||proc.exitCode!==null)return;try{process.kill(-proc.pid,'SIGTERM')}catch{try{proc.kill('SIGTERM')}catch{}}}
function launch(command,args,logPath,options={}){writeFileSync(logPath,'');const stream=createWriteStream(logPath);const proc=spawn(command,args,{cwd:repo,detached:true,stdio:['ignore','pipe','pipe'],...options});proc.stdout?.pipe(stream,{end:false});proc.stderr?.pipe(stream,{end:false});proc.on('error',e=>{errors.push(e.message)});return proc}
async function until(test,timeout=15000){const start=performance.now();while(performance.now()-start<timeout){const result=await test();if(result)return result;await sleep(80)}throw new Error('Timed out waiting for actual state')}
async function at(seconds){const wait=t0+seconds*1000-performance.now();if(wait>0)await sleep(wait);if(performance.now()-t0>seconds*1000+2500)throw new Error(`Shot missed its timing budget: ${seconds}s`)}
function screenPng(path){execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','x11grab','-draw_mouse','0','-video_size','1920x1320','-i',display,'-frames:v','1',path])}
function mae(a,b,dx,dy,rect,stride=4){let sum=0,n=0;for(let y=rect[1];y<rect[3];y+=stride)for(let x=rect[0];x<rect[2];x+=stride){const i=(y*a.width+x)*4,j=((y+dy)*b.width+x+dx)*4;for(let k=0;k<3;k++){sum+=Math.abs(a.data[i+k]-b.data[j+k]);n++}}return sum/n}
async function alignViewport(){
 const native=await page.context().newCDPSession(page),win=await native.send('Browser.getWindowForTarget');run.nativeWindowBefore=win.bounds;await native.send('Browser.setWindowBounds',{windowId:win.windowId,bounds:{width:win.bounds.width+8,height:win.bounds.height+8}});await sleep(300);
 const expectedPath=resolve(rawDir,'viewport.png'),screenPath=resolve(rawDir,'screen.png')
 await page.screenshot({path:expectedPath});screenPng(screenPath)
 const expected=PNG.sync.read(readFileSync(expectedPath)),screen=PNG.sync.read(readFileSync(screenPath))
 let best={x:0,y:0,error:Infinity}
 for(let y=0;y<=180;y++){const error=mae(expected,screen,0,y,[170,180,850,430]);if(error<best.error)best={x:0,y,error}}
 if(best.error>.5)throw new Error(`X11/page viewport alignment failed: ${best.error}`)
 const bubbleError=mae(expected,screen,best.x,best.y,[1490,0,1880,40],2)
 if(bubbleError>2){
  // Native Chrome preparation only, before recording. Never covers or edits the webpage.
  execFileSync('python3',[resolve(root,'scripts/native-escape.py'),display])
  run.nativePreparation.push({action:'dismiss native translation bubble',beforeMae:bubbleError});await sleep(400)
 }
 await page.screenshot({path:expectedPath});screenPng(screenPath)
 const finalExpected=PNG.sync.read(readFileSync(expectedPath)),finalScreen=PNG.sync.read(readFileSync(screenPath)),after=mae(finalExpected,finalScreen,best.x,best.y,[1490,0,1880,40],2),businessMae=mae(finalExpected,finalScreen,best.x,best.y,[100,100,1800,1030],8);console.log('NATIVE ALIGN',JSON.stringify({best,after,businessMae,bounds:win.bounds}));if(businessMae>.7)throw new Error('Full native business viewport mismatch: '+businessMae)
 if(after>1)throw new Error(`Browser chrome still obscures the actual page: ${after}`)
 run.viewportAlignment={...best,topRightMaeAfter:after,businessMae,method:'PNG pixel comparison between actual viewport screenshot and X11 grab; no business UI modification'}
 return best
}
async function overlay(){await page.evaluate(()=>{
 const style=document.createElement('style');style.dataset.v567='cursor-only';style.textContent=`#v567-cursor{position:fixed;left:180px;top:460px;width:32px;height:40px;pointer-events:none;z-index:2147483647;filter:drop-shadow(0 3px 3px #163e3540)}.v567-ripple{position:fixed;width:66px;height:66px;border:3px solid #2c735c;border-radius:50%;background:#85c9a22b;pointer-events:none;z-index:2147483646;animation:v567-wave .8s ease-out forwards}@keyframes v567-wave{from{transform:translate(-50%,-50%) scale(.15);opacity:.9}to{transform:translate(-50%,-50%) scale(1.5);opacity:0}}`
 const focus=document.createElement('div');focus.id='v567-focus';focus.style.cssText='position:fixed;border:2px solid #2e7259;border-radius:7px;background:#98cba513;box-shadow:0 0 0 5px #a3c9ae22;pointer-events:none;z-index:2147483645;opacity:0;transition:left .45s ease,top .45s ease,width .45s ease,height .45s ease,opacity .25s ease';document.body.append(focus);document.head.append(style);const cursor=document.createElement('div');cursor.id='v567-cursor';cursor.innerHTML='<svg width="32" height="40" viewBox="0 0 32 40"><path d="M2 2 L2 31 L10 24 L17 38 L24 34 L17 21 L29 20 Z" fill="#fffdf7" stroke="#214d3a" stroke-width="2.3" stroke-linejoin="round"/></svg>';document.body.append(cursor)
 document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'})
 document.addEventListener('mousedown',e=>{const ring=document.createElement('div');ring.className='v567-ripple';ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';document.body.append(ring);setTimeout(()=>ring.remove(),900)})
})}
let cursor={x:180,y:460}
async function move(point,ms=1500){const start={...cursor},begin=performance.now(),steps=Math.ceil(ms/33.3333);for(let i=1;i<=steps;i++){const t=i/steps,e=t*t*(3-2*t);await page.mouse.move(start.x+(point.x-start.x)*e,start.y+(point.y-start.y)*e);const remaining=begin+ms*t-performance.now();if(remaining>0)await sleep(remaining)}cursor=point}
async function click(locator,name){
 const box=await locator.boundingBox();if(!box||box.y<0||box.y+box.height>1080)throw new Error(`Actual button not fully visible: ${name}`)
 const point={x:box.x+box.width/2,y:box.y+box.height/2}
 const hit=await locator.evaluate((el,p)=>{const node=document.elementFromPoint(p.x,p.y);return node===el||el.contains(node)},point)
 if(!hit)throw new Error(`Real hit test failed: ${name}`);if(t0&&((performance.now()-t0)/1000)>=0&&(point.x<0||point.x>1280||point.y<44||point.y>720))throw new Error(`Actual target outside fixed camera: ${name}`)
 await page.mouse.click(point.x,point.y,{delay:90});log('real-mouse-click',{name,box,point,hitTest:hit})
}
async function save(name){const shots=resolve(rawDir,'screenshots');mkdirSync(shots,{recursive:true});await page.screenshot({path:resolve(shots,`browser_${name}.png`)})}
async function startRecorder(origin){
 const ffLog=createWriteStream(resolve(rawDir,'ffmpeg-capture.log'))
 recorder=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-draw_mouse','0','-video_size','1920x1080','-i',`${display}+${origin.x},${origin.y}`,'-an','-c:v','libx264','-threads','2','-preset','ultrafast','-tune','zerolatency','-crf','18','-bf','0','-g','30','-r','30','-fps_mode','cfr','-pix_fmt','yuv420p','-t',String(duration+3),'-progress','pipe:1','-stats_period','0.1',resolve(rawDir,'input.mkv')],{stdio:['ignore','pipe','pipe']})
 recorder.stderr.pipe(ffLog)
 let buffer='',readyResolve,readyReject
 const ready=new Promise((r,j)=>{readyResolve=r;readyReject=j})
 recorder.stdout.on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);const at=line.indexOf('=');if(at<0)continue;progress[line.slice(0,at)]=line.slice(at+1);if(line==='progress=continue'&&Number(progress.frame)>=1&&!rawOrigin){rawOrigin=performance.now()-Number(progress.out_time_us??0)/1000;readyResolve()}}})
 recorder.on('error',readyReject);recorder.on('exit',code=>{if(code!==0)readyReject(new Error(`X11 recording exited ${code}`))})
 await Promise.race([ready,sleep(10000).then(()=>{throw new Error('No first X11 frame')})]);t0=performance.now()+1000
 run.rawTrimStartSec=(t0-rawOrigin)/1000;run.recorder='FFmpeg native X11 screen grab at 30fps; not a sequence of website screenshots'
}
try{
 const changed=execFileSync('git',['diff',manifest.gitSha,'--','src','server/src','package.json','package-lock.json','scripts/start-demo.mjs'],{cwd:repo,encoding:'utf8'})
 if(changed.trim())throw new Error('Business source differs from the recorded stable main SHA; use a worktree at manifest.gitSha')
 const port=await new Promise((r,j)=>{const s=net.createServer();s.on('error',j);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>r(port))})})
 server=launch('npm',['run','demo','--','--port',String(port),'--strictPort'],resolve(rawDir,'demo-server.log'))
 serverUrl=await until(()=>{const log=readFileSync(resolve(rawDir,'demo-server.log'),'utf8');return log.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/)?.[1]},30000)
 run.baseUrl=serverUrl;run.startCommand=`npm run demo -- --port ${port} --strictPort`
 let number=100;while(existsSync(`/tmp/.X11-unix/X${number}`)||existsSync(`/tmp/.X${number}-lock`))number++
 display=':'+number
 xvfb=launch(process.env.XVFB_BIN||'Xvfb',[display,'-screen','0','1920x1320x24','-nolisten','tcp'],resolve(rawDir,'xvfb.log'))
 await until(()=>existsSync(`/tmp/.X11-unix/X${number}`),5000)
 browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:display},args:['--window-size=1280,880','--window-position=0,0','--force-device-scale-factor=1.5','--disable-translate','--disable-features=Translate,TranslateUI,TranslateBubble','--lang=zh-CN']})
 run.browserVersion=browser.version()
 const options={viewport:{width:1280,height:720},deviceScaleFactor:1.5,locale:'zh-CN',reducedMotion:'reduce',storageState:{cookies:[],origins:[]}}
 // Compile routes only in a disposable context; reuse no browser state.
 const warm=await browser.newContext(options),w=await warm.newPage()
 await w.goto(serverUrl+'#/pages/match/index?demoScenario=math');await w.locator('.form .submit').click();const warmLin=w.locator('.match-card').filter({hasText:'小林老师'});await warmLin.locator('uni-button').click();await expect(w).toHaveURL(/id=t001/);await w.locator('uni-button').filter({hasText:'发起演示预约'}).click();await w.goto(serverUrl+'#/pages/orders/index');await warm.close()
 const context=await browser.newContext(options);run.initialStorage=await context.storageState();if(run.initialStorage.origins.length||run.initialStorage.cookies.length)throw new Error('Context is not isolated')
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/(assistant\/chat|match-assistant\/parse|exams)|\/teaching-loop\/generate/.test(r.url()))modelRequests.push(r.url())})
 const button=text=>page.locator('uni-button').filter({hasText:text})
 const field=label=>page.locator('.linghang-booking .field').filter({has:page.getByText(label,{exact:true})}).locator('input,textarea')
 const rect=async locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,text:el.innerText??el.textContent}})
 async function aim(locator,ms=350){const r=await rect(locator);await move({x:r.x+r.width/2,y:r.y+r.height/2},ms);return r}
 async function focus(locator,label){const r=locator?await rect(locator):null;if(r&&(r.y<44||r.y+r.height>720))throw new Error('Highlighted actual text not fully visible: '+label);await page.evaluate(r=>{const n=document.getElementById('v567-focus');if(!r){n.style.opacity='0';return}n.style.left=(r.x-6)+'px';n.style.top=(r.y-4)+'px';n.style.width=(r.width+12)+'px';n.style.height=(r.height+8)+'px';n.style.opacity='1'},r);log('actual-region-highlight',{label,region:r});if(r)await move({x:Math.max(20,r.x-24),y:r.y+r.height/2},300)}
 async function loginParent(){await page.goto(serverUrl+'#/pages/profile/index');await button('演示登录').click();await page.locator('.role').filter({hasText:'学生 / 家长'}).click();await button('进入演示模式').click();await expect(button('退出演示身份')).toBeVisible();run.parentRoleProof=await page.locator('.linghang-profile .sub').innerText();if(!run.parentRoleProof.includes('家长'))throw new Error('Parent demo role missing')}
 async function publicTutor(){await page.goto(serverUrl+'#/pages/index/index');const search=page.locator('uni-input').filter({has:page.getByText('搜索科目、地区或老师姓名',{exact:true})}).locator('input');await search.fill('小林');const card=page.locator('.tutor-grid .card').filter({hasText:'小林老师'});await expect(card).toHaveCount(1);await card.click();await expect(page).toHaveURL(/id=t001/);await expect(page.locator('.linghang-detail .name')).toHaveText('小林老师');run.publicSelection={method:'real public UI search/name selection',id:'t001',url:page.url()}}
 async function orderState(){const card=page.locator('.linghang-orders .card').filter({hasText:'小航'});await expect(card).toHaveCount(1);await expect(card).toContainText('小林老师');await expect(card.locator('.status')).toHaveText('待家教确认');const text=await card.innerText();if(!text.includes('辅导科目：数学')||!text.includes('周六下午'))throw new Error('Actual pending order does not match scenario');return{card:await rect(card),actualText:text,status:await card.locator('.status').innerText(),url:page.url(),notice:await page.locator('.linghang-orders .notice').innerText()}}
 async function typeField(locator,value,label,delay=65){let r=await rect(locator);if(r.y<65||r.y+r.height>685){await locator.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center'}));await sleep(650)}await aim(locator,300);await click(locator,label);await locator.pressSequentially(value,{delay});await expect(locator).toHaveValue(value);log('actual-field-input',{label,value,nonPersonalDemoDigits:label==='必填演示数字'?true:undefined})}
 if(id==='S05'){
  await page.goto(serverUrl+'#/pages/match/index?demoScenario=math');await page.locator('.form .submit').click();const lin=page.locator('.match-card').filter({hasText:'小林老师'});await expect(lin).toHaveCount(1);await lin.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));await sleep(600)
  run.match={name:'小林老师',actualText:await lin.innerText(),selectedByName:true};const entry=lin.locator('uni-button');run.initialCard=await rect(lin)
  const origin=await alignViewport();await overlay();await page.mouse.move(cursor.x,cursor.y);await startRecorder(origin);await at(.7);await save('start');await aim(lin.locator('.name'),400)
  await at(2);await aim(entry,400);await at(3.7);await click(entry,'查看详情与预约');await expect(page).toHaveURL(/id=t001/);const detail=page.locator('.linghang-detail');await expect(detail.locator('.name')).toHaveText('小林老师');await expect(detail).toContainText('可授课时间')
  run.detail={url:page.url(),id:'t001',actualText:await detail.innerText(),photoLabel:await detail.locator('.demo-photo-label').innerText(),photoPresent:await detail.locator('.tutor-photo-image').count()};log('detail-state-verified',run.detail)
  const info=detail.locator('.panel').filter({hasText:'参考课时费'}),intro=detail.locator('.panel').filter({hasText:'自我介绍'}).locator('.description'),book=detail.locator('uni-button').filter({hasText:'发起演示预约'})
  await at(7.9);await focus(detail.locator('.profile .muted'),'学校与专业（自述）');await at(9.4);await save('profile');await focus(info.locator('.line').filter({hasText:'擅长科目'}),'实际科目与方式')
  await at(11);await focus(info.locator('.line').filter({hasText:'参考课时费'}),'实际报价');await at(12.2);await focus(null,'必要的一次向下滚动');await page.evaluate(()=>scrollBy({top:330,behavior:'smooth'}));await sleep(800)
  await at(13.2);await focus(intro,'自我介绍');await at(16.2);await save('introduction');await at(18.2);await focus(info.locator('.line').filter({hasText:'可授课时间'}),'真实时间安排');await at(20);await save('schedule');await focus(info.locator('.line').filter({hasText:'授课地区'}),'公共授课区域')
  await at(24);await focus(null,'进入预约入口的位置');await book.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center'}));await sleep(750);await aim(book,350);run.bookingEntry=await rect(book);await at(28.5);await save('end');log('ending-state-verified',{url:page.url(),bookingEntry:run.bookingEntry,photoIsExample:true});await at(30.4)
 }else if(id==='S06'){
  await loginParent();await publicTutor();const book=page.locator('.linghang-detail uni-button').filter({hasText:'发起演示预约'});await book.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));await sleep(500)
  const origin=await alignViewport();await overlay();await page.mouse.move(cursor.x,cursor.y);await startRecorder(origin);await at(.6);await save('start');await aim(book,450);await at(2);await click(book,'发起演示预约');await expect(page).toHaveURL(/orders\/create\?tutorId=t001/);await expect(page.locator('.linghang-booking .title')).toContainText('小林老师');log('actual-form-entered',{url:page.url()})
  await at(5);await typeField(field('称呼 *'),'小航','虚构称呼',80);await at(6.3);await typeField(field('联系电话 *'),'10000000000','必填演示数字',22)
  await at(7.6);await typeField(field('期望时间 *'),'周六下午','期望时间',70);run.subject=await page.locator('.linghang-booking .field').filter({has:page.getByText('辅导科目',{exact:true})}).innerText();if(!run.subject.includes('数学'))throw new Error('Actual subject is not math')
  await at(9.2);await typeField(field('辅导需求'),'初一数学，一元一次方程；预算100元/小时以内。','初中数学学习需求',32);await at(12.3);const submit=page.locator('.linghang-booking>uni-button.primary-button');await submit.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center'}));await sleep(700);await save('form');run.formValues=await page.locator('.linghang-booking input,.linghang-booking textarea').evaluateAll(ns=>ns.map(n=>n.value));log('actual-form-verified',{values:run.formValues,subject:run.subject})
  await at(15);await aim(submit,400);await at(16.6);await click(submit,'保存演示预约');await expect(page).toHaveURL(/pages\/orders\/index/);run.order=await orderState();log('actual-order-submitted',run.order);await at(20.2);await focus(page.locator('.linghang-orders .status'),'真实待确认状态');await save('result');await at(23.7);await focus(null,'保留提交结果');await save('end');log('ending-state-verified',{status:(await orderState()).status,realNotification:false});await at(25.4)
 }else if(id==='S07'){
  await loginParent();await publicTutor();await button('发起演示预约').click();await field('称呼 *').fill('小航');await field('联系电话 *').fill('10000000000');await field('期望时间 *').fill('周六下午');await field('辅导需求').fill('初一数学，一元一次方程；预算100元/小时以内。');await button('保存演示预约').click();run.preparedOrder=await orderState();run.preparation={independentUiBooking:true,usesS06Storage:false,contact:'10000000000',status:run.preparedOrder.status};log('real-ui-preparation-submitted',run.preparation)
  await page.goto(serverUrl+'#/pages/profile/index');const entry=page.locator('.linghang-profile .item').filter({hasText:'我的预约'});await expect(entry).toBeVisible();await entry.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));await sleep(500)
  const origin=await alignViewport();await overlay();await page.mouse.move(cursor.x,cursor.y);await startRecorder(origin);await at(.6);await save('start');await aim(entry,400);await at(2.2);await click(entry,'我的预约');await expect(page).toHaveURL(/pages\/orders\/index/);run.order=await orderState();log('my-orders-state-verified',run.order)
  const card=page.locator('.linghang-orders .card').filter({hasText:'小航'});await at(7.1);await focus(card.locator('.line').filter({hasText:'辅导科目'}),'数学与小林老师');await at(9);await save('subject');await at(10);await focus(card.locator('.line').filter({hasText:'期望时间'}),'周六下午约课意向');await at(12);await focus(card.locator('.line').filter({hasText:'预约称呼'}),'本场景虚构称呼');await save('record')
  await at(14.2);await focus(card.locator('.status'),'待家教确认，不虚构接单');await at(17);await save('status');await at(18);await focus(page.locator('.linghang-orders .notice'),'Mock不跨设备同步或真实通知');await at(20.2);await focus(null,'等待老师接力');await at(23.6);await save('end');if((await orderState()).status!=='待家教确认')throw new Error('Pending state unexpectedly changed');log('ending-state-verified',{status:'待家教确认',accepted:false,notification:false});await at(25.4)
 }else throw new Error('Unsupported segment id')
 if(errors.length||modelRequests.length)throw new Error('Page errors or unexpected model requests occurred')
 if(recorder.exitCode===null)await new Promise((r,j)=>{recorder.once('exit',code=>code===0?r():j(new Error(`Recorder failed: ${code}`)))})
 if(recorder.exitCode!==0)throw new Error('Recorder did not finish successfully')
 if(id!=='S05'){await page.reload();const card=page.locator('.linghang-orders .card').filter({hasText:'小航'});await expect(card.locator('.status')).toHaveText('待家教确认');run.reloadProof={status:await card.locator('.status').innerText(),actualText:await card.innerText(),verifiedAfterRecording:true};log('off-camera-reload-verified',run.reloadProof)}
 run.progress=progress;const pacingLog=readFileSync(resolve(rawDir,'ffmpeg-capture.log'),'utf8'),pacing=auditPacing(pacingLog,run.rawTrimStartSec,duration);if(pacing.rawDroppedFrames>0||pacing.rawDuplicateFrames>1)throw new Error('Native pacing exceeds the recorded quality limit (no drops; at most one isolated CFR repeat); retain failed attempt');writeFileSync(resolve(root,'evidence/selected-capture.log'),pacingLog);writeFileSync(resolve(root,'evidence/pacing-audit.json'),JSON.stringify(pacing,null,2));run.status='passed';run.realInteractions=events.filter(e=>e.kind==='real-mouse-click').length
 writeFileSync(resolve(root,'evidence/capture.json'),JSON.stringify(run,null,2));writeFileSync(resolve(root,`evidence/capture-${runId}.json`),JSON.stringify(run,null,2));console.log('CAPTURE PASSED',run.rawVideo)
}catch(error){run.status='failed';run.failure=error.stack??String(error);try{await page?.screenshot({path:resolve(root,`evidence/failure-${runId}.png`)})}catch{};writeFileSync(resolve(root,`evidence/failure-${runId}.json`),JSON.stringify(run,null,2));console.error(error);process.exitCode=1}
finally{if(recorder&&recorder.exitCode===null)recorder.kill('SIGINT');await browser?.close().catch(()=>{});stop(server);stop(xvfb)}
