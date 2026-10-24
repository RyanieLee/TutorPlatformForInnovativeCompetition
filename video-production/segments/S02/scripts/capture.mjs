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
 const style=document.createElement('style');style.dataset.s02='cursor-only';style.textContent=`#s02-cursor{position:fixed;left:180px;top:460px;width:32px;height:40px;pointer-events:none;z-index:2147483647;filter:drop-shadow(0 3px 3px #163e3540)}.s02-ripple{position:fixed;width:66px;height:66px;border:3px solid #2c735c;border-radius:50%;background:#85c9a22b;pointer-events:none;z-index:2147483646;animation:s02-wave .8s ease-out forwards}@keyframes s02-wave{from{transform:translate(-50%,-50%) scale(.15);opacity:.9}to{transform:translate(-50%,-50%) scale(1.5);opacity:0}}`
 document.head.append(style);const cursor=document.createElement('div');cursor.id='s02-cursor';cursor.innerHTML='<svg width="32" height="40" viewBox="0 0 32 40"><path d="M2 2 L2 31 L10 24 L17 38 L24 34 L17 21 L29 20 Z" fill="#fffdf7" stroke="#214d3a" stroke-width="2.3" stroke-linejoin="round"/></svg>';document.body.append(cursor)
 document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'})
 document.addEventListener('mousedown',e=>{const ring=document.createElement('div');ring.className='s02-ripple';ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';document.body.append(ring);setTimeout(()=>ring.remove(),900)})
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
 recorder=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-draw_mouse','0','-video_size','1920x1080','-i',`${display}+${origin.x},${origin.y}`,'-an','-c:v','libx264','-threads','2','-preset','ultrafast','-tune','zerolatency','-crf','18','-bf','0','-g','30','-r','30','-fps_mode','cfr','-pix_fmt','yuv420p','-t','38','-progress','pipe:1','-stats_period','0.1',resolve(rawDir,'input.mkv')],{stdio:['ignore','pipe','pipe']})
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
 xvfb=launch(process.env.XVFB_BIN||'Xvfb',[display,'-screen','0','1920x1200x24','-nolisten','tcp'],resolve(rawDir,'xvfb.log'))
 await until(()=>existsSync(`/tmp/.X11-unix/X${number}`),5000)
 browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:display},args:['--window-size=1920,1200','--window-position=0,0','--force-device-scale-factor=1','--disable-translate','--disable-features=Translate,TranslateUI,TranslateBubble','--lang=zh-CN']})
 run.browserVersion=browser.version()
 const options={viewport:{width:1920,height:1080},deviceScaleFactor:1,locale:'zh-CN',reducedMotion:'reduce',storageState:{cookies:[],origins:[]}}
 // Compile the real home/detail off camera in a disposable context; no stored state is reused.
 const warm=await browser.newContext(options),w=await warm.newPage()
 await w.goto(serverUrl+'#/pages/index/index');await expect(w.locator('.tutor-grid .card').first()).toBeAttached()
 const warmLin=w.locator('.tutor-grid .card').filter({hasText:'小林老师'});await expect(warmLin).toHaveCount(1);await warmLin.click()
 await expect(w).toHaveURL(/id=t001/);await expect(w.locator('.linghang-detail')).toContainText('可授课时间');await warm.close()
 const context=await browser.newContext(options);run.initialStorage=await context.storageState();if(run.initialStorage.origins.length||run.initialStorage.cookies.length)throw new Error('Context is not isolated')
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/(assistant\/chat|match-assistant\/parse|exams)/.test(r.url()))modelRequests.push(r.url())})
 await page.goto(serverUrl+'#/pages/index/index');await expect(page.locator('.mode')).toContainText('本机 Mock')
 await expect(page.locator('.hero')).toBeVisible();await expect(page.locator('.tutor-grid .card').first()).toBeAttached()
 await page.evaluate(()=>document.fonts.ready);await sleep(500)
 const origin=await alignViewport();await overlay();await page.mouse.move(cursor.x,cursor.y)
 await startRecorder(origin);await at(.8);await save('start');log('start-state',{url:page.url(),hero:await page.locator('.hero .headline').innerText()})
 const entry=page.getByText('浏览家教老师 ↗',{exact:true});await expect(entry).toBeVisible();const b=await entry.boundingBox()
 run.entryBox=b
 await at(16.1);await move({x:b.x+b.width/2,y:b.y+b.height/2},1700);log('entry-hover',{box:b})
 await at(18.3);await click(entry,'浏览家教老师');await sleep(650)
 const lin=page.locator('.tutor-grid .card').filter({hasText:'小林老师'});await expect(lin).toBeVisible();await lin.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center'}));await sleep(1200)
 const cards=await page.locator('.tutor-grid .card').evaluateAll(nodes=>nodes.slice(0,3).map(el=>{const b=el.getBoundingClientRect();return{text:el.innerText,box:{x:b.x,y:b.y,width:b.width,height:b.height}}}))
 if(!cards.every(c=>c.text.includes('小时')&&c.text.includes('擅长：')))throw new Error('Actual list fields missing')
 run.list={cards,url:page.url(),count:await page.locator('.tutor-grid .card').count()};log('list-state-verified',run.list);await save('list')
 await at(20.8);await move({x:1000,y:700},600);await page.mouse.wheel(0,-180);await sleep(750);await save('list_scrolled')
 const cardBox=await lin.boundingBox();run.list.linBox=cardBox
 await at(22.1);await move({x:cardBox.x+cardBox.width/2,y:cardBox.y+cardBox.height/2},1300);await save('detail_before_click')
 await at(24);await click(lin,'小林老师真实列表卡片');await expect(page).toHaveURL(/id=t001/)
 const detail=page.locator('.linghang-detail');await expect(detail).toContainText('可授课时间');await expect(detail.locator('.name')).toHaveText('小林老师')
 const teaching=detail.locator('.panel').filter({hasText:'参考课时费'});await teaching.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center'}));await sleep(900)
 const text=await detail.innerText(),time=teaching.locator('.line').filter({hasText:'可授课时间'})
 const timeBox=await time.boundingBox();if(timeBox.y<0||timeBox.y+timeBox.height>1080)throw new Error('Actual time field not visible')
 if(!text.includes('80/小时')||!text.includes('周六 14:00–17:00'))throw new Error('Unexpected actual t001 fields')
 run.result={id:'t001',name:'小林老师',url:page.url(),actualText:text,timeText:await time.innerText(),timeBox,teachingBox:await teaching.boundingBox()}
 log('detail-state-verified',run.result);await at(26);await move({x:1580,y:850},650);await save('result')
 await at(27.8);await save('freeze_source');log('freeze-source-state',{url:page.url(),timeVisible:true})
 await at(34.5);await save('end');log('ending-state-verified',{url:page.url(),freezeBeginsInEdit:28})
 await at(35.4)
 if(errors.length||modelRequests.length)throw new Error('Page errors or unexpected model requests occurred')
 if(recorder.exitCode===null)await new Promise((r,j)=>{recorder.once('exit',code=>code===0?r():j(new Error(`Recorder failed: ${code}`)))})
 if(recorder.exitCode!==0)throw new Error('Recorder did not finish successfully')
 run.progress=progress;const pacingLog=readFileSync(resolve(rawDir,'ffmpeg-capture.log'),'utf8'),pacing=auditPacing(pacingLog,run.rawTrimStartSec);if(!pacing.noPacingCorrectionInUsedInterval)throw new Error('Native capture pacing correction inside used interval; retain attempt and re-record');writeFileSync(resolve(root,'evidence/selected-capture.log'),pacingLog);writeFileSync(resolve(root,'evidence/pacing-audit.json'),JSON.stringify(pacing,null,2));run.status='passed';run.realInteractions=events.filter(e=>e.kind==='real-mouse-click').length
 writeFileSync(resolve(root,'evidence/capture.json'),JSON.stringify(run,null,2));writeFileSync(resolve(root,`evidence/capture-${runId}.json`),JSON.stringify(run,null,2));console.log('CAPTURE PASSED',run.rawVideo)
}catch(error){run.status='failed';run.failure=error.stack??String(error);try{await page?.screenshot({path:resolve(root,`evidence/failure-${runId}.png`)})}catch{};writeFileSync(resolve(root,`evidence/failure-${runId}.json`),JSON.stringify(run,null,2));console.error(error);process.exitCode=1}
finally{if(recorder&&recorder.exitCode===null)recorder.kill('SIGINT');await browser?.close().catch(()=>{});stop(server);stop(xvfb)}
