import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {auditPacing} from './pacing.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')),id=manifest.id,duration=manifest.durationSec,expectedFrames=duration*30,clip=resolve(root,`exports/clip_${id}.mp4`),checks={}

function check(name,condition,actual){checks[name]={passed:!!condition,actual};if(!condition)throw new Error(`${name}: ${JSON.stringify(actual)}`)}
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',clip],{encoding:'utf8'}))
writeFileSync(resolve(root,'evidence/ffprobe.json'),JSON.stringify(probe,null,2))
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio')
check('exactDuration',Number(probe.format.duration)===duration,probe.format.duration)
check('exactFrameCount',Number(video.nb_read_frames)===expectedFrames,video.nb_read_frames)
check('resolution',video.width===1920&&video.height===1080,[video.width,video.height])
check('frameRate',video.r_frame_rate==='30/1'&&video.avg_frame_rate==='30/1',[video.r_frame_rate,video.avg_frame_rate])
check('H264yuv420p',video.codec_name==='h264'&&video.pix_fmt==='yuv420p',[video.codec_name,video.pix_fmt])
check('AAC48kHz',audio?.codec_name==='aac'&&audio?.sample_rate==='48000',[audio?.codec_name,audio?.sample_rate])
const bytes=readFileSync(clip),atoms=[];let offset=0
while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));if(size===0)size=bytes.length-offset;atoms.push({type,offset,size});if(size<8)break;offset+=size}
check('faststart',atoms.find(a=>a.type==='moov')?.offset<atoms.find(a=>a.type==='mdat')?.offset,atoms)
const timestamps=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',clip],{encoding:'utf8'}).split('\n').map(parseFloat).filter(Number.isFinite)
const deviations=timestamps.slice(1).map((t,i)=>Math.abs(t-timestamps[i]-1/30));check('monotonic30fpsPTS',timestamps.length===expectedFrames&&Math.max(...deviations)<.000002,{count:timestamps.length,maxDeltaError:Math.max(...deviations)})
execFileSync('ffmpeg',['-v','error','-i',clip,'-f','null','-'],{stdio:'pipe'});check('completeDecode',true,'Entire MP4 decoded without FFmpeg errors')
const pcm=execFileSync('ffmpeg',['-v','error','-i',clip,'-map','0:a:0','-f','f32le','pipe:1'],{maxBuffer:24*1024*1024});let maximum=0;for(let i=0;i<pcm.length;i+=4)maximum=Math.max(maximum,Math.abs(pcm.readFloatLE(i)));check('silentAAC',maximum<1e-7,{maxSample:maximum,samples:pcm.length/4})
const {spawnSync}=await import('node:child_process');const black=spawnSync('ffmpeg',['-hide_banner','-i',clip,'-an','-vf','crop=1664:936:128:72,blackdetect=d=0.01:pix_th=0.1:pic_th=0.98','-f','null','-'],{encoding:'utf8'})
writeFileSync(resolve(root,'evidence/blackdetect.log'),black.stderr);check('noBlackIntervals',black.status===0&&!/black_start:/.test(black.stderr),'No black-screen interval in the actual footage area (10ms detector minimum)')
const gray=execFileSync('ffmpeg',['-v','error','-i',clip,'-an','-vf','crop=1664:936:128:72,scale=160:90,format=gray','-f','rawvideo','pipe:1'],{maxBuffer:24*1024*1024})
let minStd=Infinity,uniformFrames=0;const pixels=160*90
for(let frame=0;frame<expectedFrames;frame++){let sum=0,squares=0;for(let i=0;i<pixels;i++){const value=gray[frame*pixels+i];sum+=value;squares+=value*value}const std=Math.sqrt(Math.max(0,squares/pixels-(sum/pixels)**2));minStd=Math.min(minStd,std);if(std<3)uniformFrames++}
check('noBlankFootageFrames',gray.length===pixels*expectedFrames&&uniformFrames===0,{uniformFrames,minStd,frames:gray.length/pixels})
const clicks=capture.events.filter(e=>e.kind==='real-mouse-click'&&e.timeSec>=0&&e.timeSec<duration)
check('realVisibleClicks',capture.status==='passed'&&clicks.length>=1&&clicks.every(e=>e.hitTest&&e.point.x>=0&&e.point.x<=1280&&e.point.y>=44&&e.point.y<=720),clicks)
const edl=JSON.parse(readFileSync(resolve(root,'evidence/edit-decision-list.json'),'utf8')),graph=readFileSync(resolve(root,'exports/filtergraph.txt'),'utf8');check('fixedCameraNoAnimatedZoom',edl.camera.fixed&&!edl.camera.pan&&!edl.camera.animatedZoom&&!/zoompan|crop=|scale=.*eval=frame/.test(graph),edl.camera)
if(id==='S05'){
 check('realT001Detail',capture.detail.id==='t001'&&capture.detail.url.includes('id=t001')&&capture.match.selectedByName,capture.detail)
 check('actualProfileFields', ['西安交通大学','数学与应用数学','数学、物理','均可','¥80/小时','周六','长安区','自我介绍','自述，未核验'].every(s=>capture.detail.actualText.includes(s)),capture.detail.actualText)
 const intro=capture.events.find(e=>e.kind==='actual-region-highlight'&&e.label==='自我介绍');check('introductionVisibleInRequiredShot',intro&&intro.timeSec>=8&&intro.timeSec<18&&intro.region.y>=44&&intro.region.y+intro.region.height<=720,intro)
 check('examplePortraitNotCertification',capture.detail.photoLabel==='示例头像'&&capture.detail.photoPresent===1,capture.detail.photoLabel)
 const e=capture.bookingEntry;check('endsAtRealBookingEntry',e.text==='发起演示预约'&&e.y>=44&&e.y+e.height<=720,e)
 check('detailClickInWindow',clicks.some(e=>e.name==='查看详情与预约'&&e.timeSec<8),clicks)
}else{
 check('parentDemoRole',capture.parentRoleProof.includes('家长'),capture.parentRoleProof)
 check('realPublicSelectionT001',capture.publicSelection.id==='t001'&&capture.publicSelection.url.includes('id=t001'),capture.publicSelection)
 check('realPendingOrder',capture.order.status==='待家教确认'&&['小林老师','辅导科目：数学','期望时间：周六下午','预约称呼：小航'].every(s=>capture.order.actualText.includes(s)),capture.order)
 check('noFakeAcceptanceOrNotification',capture.order.notice.includes('不会真实通知')&&!capture.order.actualText.includes('家教已接受'),capture.order.notice)
 check('pendingSurvivesActualReload',capture.reloadProof?.verifiedAfterRecording&&capture.reloadProof.status==='待家教确认',capture.reloadProof)
 if(id==='S06'){
  check('onlyNonPersonalDemoDigits',capture.formValues.includes('10000000000')&&!/^1[3-9]/.test('10000000000'),capture.formValues)
  check('formInputsThroughRealUI',capture.events.filter(e=>e.kind==='actual-field-input').length===4&&capture.events.filter(e=>e.kind==='actual-field-input').every(e=>e.timeSec>=5&&e.timeSec<14),capture.events.filter(e=>e.kind==='actual-field-input'))
  check('bookingAndSubmitWindows',clicks.some(e=>e.name==='发起演示预约'&&e.timeSec<5)&&clicks.some(e=>e.name==='保存演示预约'&&e.timeSec>=14&&e.timeSec<20),clicks)
 }else{
  check('independentS07Booking',capture.preparation.independentUiBooking&&capture.preparation.usesS06Storage===false&&capture.preparedOrder.status==='待家教确认',capture.preparation)
  check('ordersEntryWithinSevenSeconds',clicks.some(e=>e.name==='我的预约'&&e.timeSec<7),clicks)
 }
}
const srt=readFileSync(resolve(root,`captions_${id}.srt`),'utf8'),blocks=srt.trim().split(/\n\s*\n/),toSec=t=>{const [h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const intervals=blocks.map(b=>b.split('\n')[1].split(' --> ').map(toSec))
check('SRTExactDurationUTF8',intervals[0][0]===0&&intervals.at(-1)[1]===duration&&intervals.every(([a,b],i)=>b>a&&(!i||a===intervals[i-1][1]))&&!srt.includes('\ufffd'),intervals)
check('noModelCall',capture.modelRequests.length===0,capture.modelRequests)
check('freshBrowserContext',!capture.initialStorage.cookies.length&&!capture.initialStorage.origins.length,capture.initialStorage)
check('nativeViewportAlignment',capture.viewportAlignment.error<.5&&capture.viewportAlignment.topRightMaeAfter<1,capture.viewportAlignment)
const pacingLog=readFileSync(resolve(root,'evidence/selected-capture.log'),'utf8'),pacing=auditPacing(pacingLog,capture.rawTrimStartSec,duration);check('nativePacingAudited',pacing.rawDroppedFrames===0&&pacing.rawDuplicateFrames<=1&&pacing.rawDuplicateFrames===Number(capture.progress.dup_frames)&&pacing.rawDroppedFrames===Number(capture.progress.drop_frames),pacing)
mkdirSync(resolve(root,'keyframes'),{recursive:true})
const frames=id==='S05'?[['01_start',.8],['02_click',clicks[0].timeSec-.065],['03_profile',9],['04_introduction',16],['05_schedule',20],['06_end',28]]:id==='S06'?[['01_start',.8],['02_click_book',clicks[0].timeSec-.065],['03_form',13.6],['04_click_submit',clicks.find(e=>e.name==='保存演示预约').timeSec-.065],['05_result',21],['06_end',24]]:[['01_start',.8],['02_click',clicks[0].timeSec-.065],['03_record',9],['04_status',17],['05_end',23]]
for(const[name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',clip,'-frames:v','1','-q:v','2',resolve(root,'keyframes',name+'.jpg')])
execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-vf',`fps=1,scale=384:216,tile=5x${Math.ceil(duration/5)}:padding=6:margin=8:color=0xf6f3eb`,'-frames:v','1','-q:v','3',resolve(root,'evidence/contact-sheet.jpg')])
mkdirSync(resolve(root,'evidence/sourceframes'),{recursive:true})
const sourceFrames=[frames[0],frames[Math.floor(frames.length/2)],frames.at(-1)]
for(const[name,time]of sourceFrames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(capture.rawTrimStartSec+time),'-i',resolve(root,capture.rawVideo),'-frames:v','1','-q:v','2',resolve(root,'evidence/sourceframes',name+'.jpg')])
writeFileSync(resolve(root,'evidence/sourceframes/provenance.json'),JSON.stringify({captureId:capture.id,rawVideo:capture.rawVideo,gitSha:capture.gitSha,description:'Selected genuine native webpage frames before fixed matte/captions; no reconstruction.',frames:sourceFrames.map(([name,timeSec])=>({file:name+'.jpg',segmentTimeSec:timeSec,rawTimeSec:capture.rawTrimStartSec+timeSec}))},null,2))
const output={status:'passed',id,gitSha:capture.gitSha,videoSha256:createHash('sha256').update(bytes).digest('hex'),fileSizeBytes:statSync(clip).size,checks,keyframes:frames.map(([name,timeSec])=>({file:'keyframes/'+name+'.jpg',timeSec})),manualVisualReview:'Required separately: compare all keyframes/contact sheet with original webpage frames and DOM state evidence. Script success alone is not a visual review.'}
writeFileSync(resolve(root,'evidence/validation.json'),JSON.stringify(output,null,2));console.log(JSON.stringify({id,status:output.status,checks:Object.keys(checks).length,videoSha256:output.videoSha256,fileSizeBytes:output.fileSizeBytes},null,2))
