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
const run={id:runId,status:'running',gitSha:manifest.gitSha,captureHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),browserViewport:[1280,720],deviceScaleFactor:1.5,nativeCaptureResolution:[1920,1080],freshContext:true,events,errors,modelRequests,nativePreparation:[],scenes:[]}
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
async function startRecorder(origin,seconds,sceneName){
 const ffLog=createWriteStream(resolve(rawDir,'ffmpeg-capture.log'))
 recorder=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-draw_mouse','0','-video_size','1920x1080','-i',`${display}+${origin.x},${origin.y}`,'-an','-c:v','libx264','-threads','2','-preset','ultrafast','-tune','zerolatency','-crf','18','-bf','0','-g','30','-r','30','-fps_mode','cfr','-pix_fmt','yuv420p','-t',String(seconds+2),'-progress','pipe:1','-stats_period','0.1',resolve(rawDir,sceneName+'.mkv')],{stdio:['ignore','pipe','pipe']})
 recorder.stderr.pipe(ffLog)
 let buffer='',readyResolve,readyReject
 const ready=new Promise((r,j)=>{readyResolve=r;readyReject=j})
 recorder.stdout.on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);const at=line.indexOf('=');if(at<0)continue;progress[line.slice(0,at)]=line.slice(at+1);if(line==='progress=continue'&&Number(progress.frame)>=1&&!rawOrigin){rawOrigin=performance.now()-Number(progress.out_time_us??0)/1000;readyResolve()}}})
 recorder.on('error',readyReject);recorder.on('exit',code=>{if(code!==0)readyReject(new Error(`X11 recording exited ${code}`))})
 await Promise.race([ready,sleep(10000).then(()=>{throw new Error('No first X11 frame')})]);t0=performance.now()+400
 run.rawTrimStartSec=(t0-rawOrigin)/1000;run.recorder='FFmpeg native X11 screen grab at 30fps; not a sequence of website screenshots'
}
try{
 if(execFileSync('git',['diff',manifest.gitSha,'--','src','server','package.json','package-lock.json'],{cwd:repo,encoding:'utf8'}).trim())throw new Error('Source differs from baseline');
 const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p))})});server=launch('npm',['run','demo','--','--port',String(port),'--strictPort'],resolve(rawDir,'demo-server.log'));
 serverUrl=await until(()=>readFileSync(resolve(rawDir,'demo-server.log'),'utf8').match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/)?.[1],45000);run.baseUrl=serverUrl;
 let number=130;while(existsSync(`/tmp/.X11-unix/X${number}`)||existsSync(`/tmp/.X${number}-lock`))number++;display=':'+number;
 xvfb=launch(process.env.XVFB_BIN||'Xvfb',[display,'-screen','0','1920x1320x24','-nolisten','tcp'],resolve(rawDir,'xvfb.log'));await until(()=>existsSync(`/tmp/.X11-unix/X${number}`));
 browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:display},args:['--window-size=1280,880','--window-position=0,0','--force-device-scale-factor=1.5','--disable-features=Translate,TranslateUI,TranslateBubble','--lang=zh-CN']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1.5,locale:'zh-CN',reducedMotion:'reduce',storageState:{cookies:[],origins:[]}});run.initialStorage=await context.storageState();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/(assistant\/chat|match-assistant\/parse)|teaching-loop\/generate/.test(r.url()))modelRequests.push(r.url())});
 const btn=text=>page.locator('uni-button').filter({hasText:text});
 const go=path=>page.goto(serverUrl+'#/pages/'+path);
 async function real(locator,label){await locator.scrollIntoViewIfNeeded();await sleep(130);const b=await locator.boundingBox();if(!b)throw new Error('No target '+label);await move({x:b.x+b.width/2,y:b.y+b.height/2},220);await click(locator,label)}
 async function login(role){await go('profile/index');if(await btn('退出演示身份').isVisible())await real(btn('退出演示身份'),'退出演示身份');await real(btn('演示登录'),'演示登录');await real(page.locator('.role').filter({hasText:role==='parent'?'学生 / 家长':role==='tutor'?'大学生家教':'管理员'}),'选择'+role);await real(btn('进入演示模式'),'进入演示模式');await expect(btn('退出演示身份')).toBeVisible();log('role-verified',{role,text:await page.locator('.linghang-profile .sub').innerText()})}
 const field=placeholder=>page.locator('uni-input,uni-textarea').filter({has:page.getByText(placeholder,{exact:true})}).locator('input,textarea');
 async function confirm(){await real(page.locator('.uni-modal__btn_primary'),'真实确认弹窗')}
 async function take(name,seconds,action=async()=>{}){
  await page.evaluate(()=>document.getElementById('v567-cursor')?.remove());await overlay();await page.mouse.move(100,100);cursor={x:100,y:100};await sleep(250);
  const origin=await alignViewport();rawOrigin=0;progress={};await startRecorder(origin,seconds,name);const exit=new Promise((r,j)=>recorder.once('exit',c=>c===0?r():j(new Error('Recorder exited '+c))));const trim=run.rawTrimStartSec;log('scene-start',{name,seconds});await at(.1);await save(name+'_start');const before=events.length;
  await action();await at(seconds-.2);await save(name+'_end');const text=await page.locator('body').innerText();const url=page.url();await exit;
  run.scenes.push({name,durationSec:seconds,rawVideo:`raw/${runId}/${name}.mkv`,rawTrimStartSec:trim,url,actualText:text,events:events.slice(before),rawCounters:{dropped:Number(progress.drop_frames??0),duplicated:Number(progress.dup_frames??0)},alignment:run.viewportAlignment});t0=0;recorder=null;writeFileSync(resolve(root,'evidence/capture-in-progress.json'),JSON.stringify(run,null,2));
 }
 async function matching(){await go('match/index?demoScenario=math');await real(page.locator('.form .submit'),'生成推荐');await expect(page.locator('.match-card').filter({hasText:'小林老师'})).toHaveCount(1);await page.locator('.match-card').filter({hasText:'小林老师'}).scrollIntoViewIfNeeded();await sleep(300)}
 // All prerequisite state is created by this context's own public UI, never imported localStorage.
 await login('parent');await go('index/index');await field('搜索科目、地区或老师姓名').fill('小林');await real(page.locator('.tutor-grid .card').filter({hasText:'小林老师'}),'公开选择小林');await expect(page).toHaveURL(/id=t001/);await real(btn('发起演示预约'),'发起演示预约');await field('例如：测试同学').fill('小航');await field('11位演示数字').fill('10000000000');await field('例如：周六下午2点').fill('周六下午');await page.locator('.linghang-booking textarea').fill('初一数学，一元一次方程；预算100元/小时以内。');await real(btn('保存演示预约'),'保存演示预约');await expect(page.locator('.card').filter({hasText:'小航'})).toContainText('待家教确认');
 await login('tutor');await real(page.locator('.item').filter({hasText:'家教工作台'}),'家教工作台');await real(page.locator('.b-card').filter({hasText:'小航'}).locator('uni-button'),'小航预约详情');await real(btn('接受预约'),'接受预约');await confirm();await expect(page.locator('.b-status')).toContainText('家教已接受');await real(btn('教学计划与课后反馈'),'教学计划与课后反馈');run.loopUrl=page.url();await real(page.getByTestId('load-preset-course'),'加载预置演示课程');await expect(page.getByText('预置演示样例（非实时生成）',{exact:false}).first()).toBeVisible();await expect(page).toHaveURL(/pages\/teaching\/loop/);run.loopUrl=page.url();
 run.courseText=await page.locator('.outline').innerText();if(!run.courseText.includes('4节 × 45分钟'))throw new Error('Four lessons absent');
 await real(page.locator('uni-checkbox'),'核验课程与答案');await real(page.getByTestId('publish-course'),'确认发布v1');await confirm();await expect(page.getByTestId('loop-status')).toContainText('已确认发布');
 await real(page.getByTestId('fill-class-sample'),'填入虚构3/5记录');await real(page.getByTestId('save-class-record'),'保存课堂事实');await expect(page.getByTestId('loop-status')).toContainText('课堂事实已保存');await real(page.getByTestId('sample-feedback'),'生成样例反馈（非实时AI）');await expect(page.getByTestId('feedback-card')).toContainText('3/5（60%）');await expect(page.getByTestId('feedback-card')).toContainText('L2-Q4、L2-Q5');await real(page.getByTestId('publish-feedback'),'确认发布课后反馈');await confirm();await expect(page.getByTestId('loop-status')).toContainText('课后反馈已由教师确认发布');
 if(id==='S14'){
  await matching();await take('match',10,async()=>{await at(1);const rules=page.locator('.match-card').filter({hasText:'小林老师'});await move({x:400,y:350},350);run.matchText=await rules.innerText();await at(4);await page.evaluate(()=>scrollBy({top:180,behavior:'smooth'}));});
  await page.goto(run.loopUrl);await page.getByTestId('feedback-card').scrollIntoViewIfNeeded();await take('teacher-feedback',10,async()=>{await at(2);await move({x:300,y:260},350);await at(5);await page.evaluate(()=>scrollBy({top:160,behavior:'smooth'}))});
 }
 await page.goto(run.loopUrl);await real(page.getByTestId('sample-revision'),'生成第三课样例调整建议');await expect(page.getByText('第三课修订对比',{exact:true})).toBeVisible();run.revisionText=await page.locator('.t-card').filter({has:page.getByText('第三课修订对比',{exact:true})}).innerText();if(!run.revisionText.includes('10分钟'))throw new Error('Revision lacks ten-minute symbol drill');await real(page.getByTestId('accept-revision'),'确认采纳，生成新草稿');await expect(page.getByTestId('loop-status')).toContainText('生成新草稿');
 if(id==='S14'){
  await page.locator('.review-check').scrollIntoViewIfNeeded();await take('teacher-review',9,async()=>{await at(1);await real(page.locator('uni-checkbox'),'教师核验v2课程');await at(3);await real(page.getByTestId('publish-course'),'确认发布v2');await at(4);await confirm();await expect(page.getByTestId('loop-status')).toContainText('已确认发布');log('v2-published',{actualText:await page.getByTestId('loop-status').innerText()})});
 }else{await real(page.locator('uni-checkbox'),'核验v2');await real(page.getByTestId('publish-course'),'确认发布v2');await confirm();await expect(page.getByTestId('loop-status')).toContainText('已确认发布');}
 await login('parent');await page.goto(run.loopUrl);await expect(page.getByText('教师已确认的课程 · v2',{exact:true})).toBeVisible();await expect(page.getByTestId('publish-course')).toHaveCount(0);await expect(page.getByTestId('feedback-card')).toContainText('3/5（60%）');run.parentReadOnly={hasPublishControl:false,version:2,feedback:await page.getByTestId('feedback-card').innerText()};
 if(id==='S14'){await page.getByTestId('feedback-card').scrollIntoViewIfNeeded();await take('parent-feedback',15,async()=>{await at(2);await move({x:420,y:270},300);await at(7);await page.evaluate(()=>scrollBy({top:100,behavior:'smooth'}))});}
 if(id==='S15'){
  await go('profile/index');await take('parent-role',3.5,async()=>{await at(1);await move({x:380,y:270},300)});await login('tutor');await take('teacher-role',3.5,async()=>{await at(1);await move({x:400,y:270},300)});
  const gh=JSON.parse(execFileSync('gh',['run','view','39946226822','--repo','RyanieLee/TutorPlatformForInnovativeCompetition','--json','jobs,conclusion,headSha,url'],{encoding:'utf8'}));if(gh.conclusion!=='success'||gh.headSha!==manifest.gitSha||gh.jobs.some(j=>j.conclusion!=='success'))throw new Error('CI not verified');run.ci=gh;writeFileSync(resolve(root,'evidence/ci.json'),JSON.stringify(gh,null,2));
  await page.goto(gh.url,{waitUntil:'domcontentloaded',timeout:45000});await expect(page.locator('body')).toContainText('Success',{timeout:20000});await expect(page.locator('body')).toContainText('5d04c4f');await page.getByText('Success',{exact:true}).first().scrollIntoViewIfNeeded();await take('github-actions',10,async()=>{await at(1);await move({x:520,y:370},350);await at(5);await page.evaluate(()=>scrollBy({top:120,behavior:'smooth'}))});
 }
 if(id==='S16'){
  await page.locator('.outline').scrollIntoViewIfNeeded();await take('four-lessons',4,async()=>{await at(.7);await real(page.getByTestId('lesson-tab-L3'),'查看第三课');await expect(page.getByTestId('course-L3')).toContainText('移项符号专项复盘');});
  await matching();await take('match',4,async()=>{await at(1);await move({x:470,y:300},300)});
  await page.goto(run.loopUrl);await page.getByTestId('feedback-card').scrollIntoViewIfNeeded();await take('feedback',4,async()=>{await at(1);await move({x:350,y:300},300)});
  await login('admin');run.adminRole=await page.locator('.linghang-profile .sub').innerText();await real(page.locator('.item').filter({hasText:'模拟审核台'}),'模拟审核台');await expect(page).toHaveURL(/pages\/admin\/index/);await expect(page.locator('body')).toContainText('审核');run.adminPage={url:page.url(),actualText:await page.locator('body').innerText()};await page.screenshot({path:resolve(root,'evidence/admin-page.png')});
  await go('index/index');await page.locator('.brand').first().screenshot({path:resolve(root,'evidence/actual-site-brand.png')});run.brandSource={url:page.url(),actualText:await page.locator('body').innerText()};
 }
 await page.screenshot({path:resolve(root,'evidence/ending-browser.png')});if(modelRequests.length||errors.length)throw new Error('Unexpected model request/browser error');run.realInteractions=events.filter(e=>e.kind==='real-mouse-click').length;run.status='passed';writeFileSync(resolve(root,'evidence/capture.json'),JSON.stringify(run,null,2));console.log('CAPTURE PASSED',id,run.scenes.map(s=>s.name));
}catch(e){try{run.failedPage={url:page.url(),text:await page.locator('body').innerText()};await page.screenshot({path:resolve(rawDir,'failure-page.png')})}catch{}run.status='failed';run.failure=e.stack;writeFileSync(resolve(root,`evidence/failure-${runId}.json`),JSON.stringify(run,null,2));console.error(e);process.exitCode=1}finally{stop(recorder);try{await browser?.close()}catch{}stop(server);stop(xvfb)}
