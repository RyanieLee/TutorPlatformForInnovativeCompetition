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
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8'))
const runId=new Date().toISOString().replace(/[:.]/g,'-'),rawDir=resolve(root,'raw',runId)
for(const path of [rawDir,resolve(root,'evidence')])mkdirSync(path,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),events=[],errors=[],modelRequests=[]
let browser,page,recorder,server,xvfb,t0=0,rawOrigin=0,progress={},display='',serverUrl=''
const run={id:runId,status:'running',gitSha:manifest.gitSha,captureHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),browserViewport:[1920,1080],freshContext:true,events,errors,modelRequests,nativePreparation:[],rawVideo:`raw/${runId}/input.mkv`}
function log(kind,details={}){const e={timeSec:t0?Number(((performance.now()-t0)/1000).toFixed(3)):null,kind,...details};events.push(e);console.log(JSON.stringify(e))}
function stop(proc){if(!proc||proc.exitCode!==null)return;try{process.kill(-proc.pid,'SIGTERM')}catch{try{proc.kill('SIGTERM')}catch{}}}
function launch(command,args,logPath,options={}){writeFileSync(logPath,'');const stream=createWriteStream(logPath);const proc=spawn(command,args,{cwd:repo,detached:true,stdio:['ignore','pipe','pipe'],...options});proc.stdout?.pipe(stream,{end:false});proc.stderr?.pipe(stream,{end:false});proc.on('error',e=>{errors.push(e.message)});return proc}
async function until(test,timeout=15000){const start=performance.now();while(performance.now()-start<timeout){const result=await test();if(result)return result;await sleep(80)}throw new Error('Timed out waiting for actual state')}
async function at(seconds){const wait=t0+seconds*1000-performance.now();if(wait>0)await sleep(wait);if(performance.now()-t0>seconds*1000+2500)throw new Error(`Shot missed its timing budget: ${seconds}s`)}
function screenPng(path){execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','x11grab','-draw_mouse','0','-video_size','1920x1200','-i',display,'-frames:v','1',path])}
function mae(a,b,dx,dy,rect,stride=4){let sum=0,n=0;for(let y=rect[1];y<rect[3];y+=stride)for(let x=rect[0];x<rect[2];x+=stride){const i=(y*a.width+x)*4,j=((y+dy)*b.width+x+dx)*4;for(let k=0;k<3;k++){sum+=Math.abs(a.data[i+k]-b.data[j+k]);n++}}return sum/n}
async function alignViewport(){
 const expectedPath=resolve(rawDir,'viewport.png'),screenPath=resolve(rawDir,'screen.png')
 await page.screenshot({path:expectedPath});screenPng(screenPath)
 const expected=PNG.sync.read(readFileSync(expectedPath)),screen=PNG.sync.read(readFileSync(screenPath))
 let best={x:0,y:0,error:Infinity}
 for(let y=0;y<=120;y++){const error=mae(expected,screen,0,y,[170,180,850,430]);if(error<best.error)best={x:0,y,error}}
 if(best.error>.5)throw new Error(`X11/page viewport alignment failed: ${best.error}`)
 const bubbleError=mae(expected,screen,best.x,best.y,[1490,0,1880,40],2)
 if(bubbleError>2){
  // Native Chrome preparation only, before recording. Never covers or edits the webpage.
  execFileSync('python3',[resolve(root,'scripts/native-click.py'),display,String(best.x+1848),String(best.y+17)])
  run.nativePreparation.push({action:'dismiss native translation bubble',beforeMae:bubbleError});await sleep(400)
 }
 await page.screenshot({path:expectedPath});screenPng(screenPath)
 const after=mae(PNG.sync.read(readFileSync(expectedPath)),PNG.sync.read(readFileSync(screenPath)),best.x,best.y,[1490,0,1880,40],2)
 if(after>1)throw new Error(`Browser chrome still obscures the actual page: ${after}`)
 run.viewportAlignment={...best,topRightMaeAfter:after,method:'PNG pixel comparison between actual viewport screenshot and X11 grab; no business UI modification'}
 return best
}
async function overlay(){await page.evaluate(()=>{
 const style=document.createElement('style');style.dataset.s04='cursor-only';style.textContent=`#s04-cursor{position:fixed;left:180px;top:460px;width:32px;height:40px;pointer-events:none;z-index:2147483647;filter:drop-shadow(0 3px 3px #163e3540)}.s04-ripple{position:fixed;width:66px;height:66px;border:3px solid #2c735c;border-radius:50%;background:#85c9a22b;pointer-events:none;z-index:2147483646;animation:s04-wave .8s ease-out forwards}@keyframes s04-wave{from{transform:translate(-50%,-50%) scale(.15);opacity:.9}to{transform:translate(-50%,-50%) scale(1.5);opacity:0}}`
 const focus=document.createElement('div');focus.id='s04-focus';focus.style.cssText='position:fixed;border:2px solid #2e7259;border-radius:7px;background:#98cba513;box-shadow:0 0 0 5px #a3c9ae22;pointer-events:none;z-index:2147483645;opacity:0;transition:left .45s ease,top .45s ease,width .45s ease,height .45s ease,opacity .25s ease';document.body.append(focus);document.head.append(style);const cursor=document.createElement('div');cursor.id='s04-cursor';cursor.innerHTML='<svg width="32" height="40" viewBox="0 0 32 40"><path d="M2 2 L2 31 L10 24 L17 38 L24 34 L17 21 L29 20 Z" fill="#fffdf7" stroke="#214d3a" stroke-width="2.3" stroke-linejoin="round"/></svg>';document.body.append(cursor)
 document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'})
 document.addEventListener('mousedown',e=>{const ring=document.createElement('div');ring.className='s04-ripple';ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';document.body.append(ring);setTimeout(()=>ring.remove(),900)})
})}
let cursor={x:180,y:460}
async function move(point,ms=1500){const start={...cursor},begin=performance.now(),steps=Math.ceil(ms/33.3333);for(let i=1;i<=steps;i++){const t=i/steps,e=t*t*(3-2*t);await page.mouse.move(start.x+(point.x-start.x)*e,start.y+(point.y-start.y)*e);const remaining=begin+ms*t-performance.now();if(remaining>0)await sleep(remaining)}cursor=point}
async function click(locator,name){
 const box=await locator.boundingBox();if(!box||box.y<0||box.y+box.height>1080)throw new Error(`Actual button not fully visible: ${name}`)
 const point={x:box.x+box.width/2,y:box.y+box.height/2}
 const hit=await locator.evaluate((el,p)=>{const node=document.elementFromPoint(p.x,p.y);return node===el||el.contains(node)},point)
 if(!hit)throw new Error(`Real hit test failed: ${name}`)
 await page.mouse.click(point.x,point.y,{delay:90});log('real-mouse-click',{name,box,point,hitTest:hit})
}
async function save(name){const shots=resolve(rawDir,'screenshots');mkdirSync(shots,{recursive:true});await page.screenshot({path:resolve(shots,`browser_${name}.png`)})}
async function startRecorder(origin){
 const ffLog=createWriteStream(resolve(rawDir,'ffmpeg-capture.log'))
 recorder=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-draw_mouse','0','-video_size','1920x1080','-i',`${display}+${origin.x},${origin.y}`,'-an','-c:v','libx264','-threads','2','-preset','ultrafast','-tune','zerolatency','-crf','18','-bf','0','-g','30','-r','30','-fps_mode','cfr','-pix_fmt','yuv420p','-t','43','-progress','pipe:1','-stats_period','0.1',resolve(rawDir,'input.mkv')],{stdio:['ignore','pipe','pipe']})
 recorder.stderr.pipe(ffLog)
 let buffer='',readyResolve,readyReject
 const ready=new Promise((r,j)=>{readyResolve=r;readyReject=j})
 recorder.stdout.on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);const at=line.indexOf('=');if(at<0)continue;progress[line.slice(0,at)]=line.slice(at+1);if(line==='progress=continue'&&Number(progress.frame)>=1&&!rawOrigin){rawOrigin=performance.now()-Number(progress.out_time_us??0)/1000;readyResolve()}}})
 recorder.on('error',readyReject);recorder.on('exit',code=>{if(code!==0)readyReject(new Error(`X11 recording exited ${code}`))})
 await Promise.race([ready,sleep(10000).then(()=>{throw new Error('No first X11 frame')})]);t0=performance.now()+9000
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
 xvfb=launch(process.env.XVFB_BIN||'Xvfb',[display,'-screen','0','1920x1200x24','-nolisten','tcp'],resolve(rawDir,'xvfb.log'))
 await until(()=>existsSync(`/tmp/.X11-unix/X${number}`),5000)
 browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:display},args:['--window-size=1920,1200','--window-position=0,0','--force-device-scale-factor=1','--disable-translate','--disable-features=Translate,TranslateUI,TranslateBubble','--lang=zh-CN']})
 run.browserVersion=browser.version()
 const options={viewport:{width:1920,height:1080},deviceScaleFactor:1,locale:'zh-CN',reducedMotion:'reduce',storageState:{cookies:[],origins:[]}}
 // Compile route and verify t001 by actual detail navigation in a separate context.
 const warm=await browser.newContext(options),w=await warm.newPage()
 await w.goto(serverUrl+'#/pages/match/index?demoScenario=math');await w.locator('.form .submit').click();const warmLin=w.locator('.match-card').filter({hasText:'小林老师'});await expect(warmLin).toHaveCount(1);await warmLin.locator('uni-button').click();await expect(w).toHaveURL(/id=t001/);run.offCameraTutorVerification={id:'t001',url:w.url(),name:'小林老师'};await warm.close()
 const context=await browser.newContext(options);run.initialStorage=await context.storageState();if(run.initialStorage.origins.length||run.initialStorage.cookies.length)throw new Error('Context is not isolated')
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/(assistant\/chat|match-assistant\/parse|exams)|\/teaching-loop\/generate/.test(r.url()))modelRequests.push(r.url())})
 // Entire pre-generation click is also captured in the raw lead-in. The film starts after verified results.
 await page.goto(serverUrl+'#/pages/match/index?demoScenario=math');await expect(page.locator('.hero .intro')).toContainText('使用本机虚构家教')
 const values=await page.locator('.form input').evaluateAll(nodes=>nodes.map(n=>n.value)),selected=await page.locator('.form .chips .selected').allTextContents()
 if(!values.includes('100')||!values.includes('周六下午')||!selected.some(t=>t.trim()==='数学')||!selected.some(t=>t.includes('初中')))throw new Error('Actual math preset is wrong')
 run.fields={values,selected};run.weightLabels=await page.locator('.weight-row').allTextContents()
 const submit=page.locator('.form .submit');await submit.scrollIntoViewIfNeeded();await sleep(600);await page.evaluate(()=>document.fonts.ready)
 const origin=await alignViewport();await overlay();await page.mouse.move(cursor.x,cursor.y);await startRecorder(origin)
 const submitBox=await submit.boundingBox();await at(-7.8);await move({x:submitBox.x+submitBox.width/2,y:submitBox.y+submitBox.height/2},650);await save('preparation_before_generate');await click(submit,'生成推荐（片前准备）')
 const lin=page.locator('.match-card').filter({hasText:'小林老师'});await expect(lin).toHaveCount(1,{timeout:3000});const reasons=await lin.locator('.reason').allTextContents()
 if(reasons.length<6||!reasons[0].includes('学科吻合')||!reasons[1].includes('空闲时间兼容'))throw new Error('Actual score reasons are missing')
 run.preparation={actualButton:'生成推荐',actualResult:await lin.innerText(),verifiedBeforeFilm:true};log('pregenerated-results-verified',{score:await lin.locator('.score').innerText(),reasons})
 const rules=page.locator('.rules');await rules.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));await page.evaluate(()=>scrollBy({top:-80,behavior:'instant'}));await sleep(700)
 const rect=async locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,text:el.innerText??el.textContent}})
 run.rules=await rect(rules);run.score=await rect(lin.locator('.score'));run.result={id:'t001',name:'小林老师',card:await rect(lin),reasons:await lin.locator('.reason').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,text:el.textContent}})),actualText:await lin.innerText()}
 for(const region of [run.rules,run.result.card,...run.result.reasons])if(region.y<44||region.y+region.height>1080)throw new Error('Rules or selected card not fully visible together; do not fabricate split UI')
 run.resultFocus={x:run.result.card.x+run.result.card.width/2,y:run.result.card.y+run.result.card.height/2};run.rulesFocus={x:run.rules.x+run.rules.width/2,y:run.rules.y+run.rules.height/2}
 async function focus(region,label){await page.evaluate(r=>{const node=document.getElementById('s04-focus');if(!r){node.style.opacity='0';return}node.style.left=(r.x-7)+'px';node.style.top=(r.y-5)+'px';node.style.width=(r.width+14)+'px';node.style.height=(r.height+10)+'px';node.style.opacity='1'},region);log('actual-region-highlight',{label,region});if(region)await move({x:region.x-30,y:region.y+region.height/2},750)}
 await at(-2);await move({x:run.rules.x-30,y:run.rules.y+40},650)
 await at(.7);await focus(run.rules,'公开规则');await save('start');log('start-state-with-actual-results',{url:page.url(),name:run.result.name,score:run.score.text})
 await at(3.4);await focus(run.score,'实际匹配分数')
 await at(6.2);await focus(run.result.reasons[0],'学科与方式条件');await at(8);await save('subject')
 await at(10.4);await focus(run.result.reasons[1],'空闲时间兼容');await at(12);await save('time')
 await at(15.2);await focus(run.result.reasons[2],'教学经历（自述）');await at(16.5);await save('experience')
 await at(17.6);await focus(run.result.reasons[3],'课时费与预算');await at(18.7);await save('price')
 await at(19.6);await focus(run.result.reasons[4],'其他因素与偏好命中');await at(20.6);await save('preference')
 await at(21.2);await focus(run.rules,'实际公开权重说明');await at(22.2);await save('weights')
 await at(23.2);await focus(null,'保留完整真实推荐结果');await move({x:1510,y:850},700);await at(28.5);await save('end')
 if(await lin.innerText()!==run.result.actualText)throw new Error('Actual result changed during explanation')
 log('ending-state-verified',{url:page.url(),sameActualResult:true,modelCalls:0});await at(30.4)
 if(errors.length||modelRequests.length)throw new Error('Page errors or unexpected model requests occurred')
 if(recorder.exitCode===null)await new Promise((r,j)=>{recorder.once('exit',code=>code===0?r():j(new Error(`Recorder failed: ${code}`)))})
 if(recorder.exitCode!==0)throw new Error('Recorder did not finish successfully')
 run.progress=progress;const pacingLog=readFileSync(resolve(rawDir,'ffmpeg-capture.log'),'utf8'),pacing=auditPacing(pacingLog,run.rawTrimStartSec,30);if(!pacing.noPacingCorrectionInUsedInterval)throw new Error('Native capture pacing correction inside used interval; retain attempt and re-record');writeFileSync(resolve(root,'evidence/selected-capture.log'),pacingLog);writeFileSync(resolve(root,'evidence/pacing-audit.json'),JSON.stringify(pacing,null,2));run.status='passed';run.realInteractions=events.filter(e=>e.kind==='real-mouse-click').length
 writeFileSync(resolve(root,'evidence/capture.json'),JSON.stringify(run,null,2));writeFileSync(resolve(root,`evidence/capture-${runId}.json`),JSON.stringify(run,null,2));console.log('CAPTURE PASSED',run.rawVideo)
}catch(error){run.status='failed';run.failure=error.stack??String(error);try{await page?.screenshot({path:resolve(root,`evidence/failure-${runId}.png`)})}catch{};writeFileSync(resolve(root,`evidence/failure-${runId}.json`),JSON.stringify(run,null,2));console.error(error);process.exitCode=1}
finally{if(recorder&&recorder.exitCode===null)recorder.kill('SIGINT');await browser?.close().catch(()=>{});stop(server);stop(xvfb)}
