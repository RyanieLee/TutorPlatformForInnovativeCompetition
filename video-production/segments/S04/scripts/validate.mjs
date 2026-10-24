import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {auditPacing} from './pacing.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),clip=resolve(root,'exports/clip_S04.mp4'),checks={}
function check(name,condition,actual){checks[name]={passed:!!condition,actual};if(!condition)throw new Error(`${name}: ${JSON.stringify(actual)}`)}
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',clip],{encoding:'utf8'}))
writeFileSync(resolve(root,'evidence/ffprobe.json'),JSON.stringify(probe,null,2))
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio')
check('exact30Seconds',Number(probe.format.duration)===30,probe.format.duration)
check('900Frames',Number(video.nb_read_frames)===900,video.nb_read_frames)
check('resolution',video.width===1920&&video.height===1080,[video.width,video.height])
check('frameRate',video.r_frame_rate==='30/1'&&video.avg_frame_rate==='30/1',[video.r_frame_rate,video.avg_frame_rate])
check('H264yuv420p',video.codec_name==='h264'&&video.pix_fmt==='yuv420p',[video.codec_name,video.pix_fmt])
check('AAC48kHz',audio?.codec_name==='aac'&&audio?.sample_rate==='48000',[audio?.codec_name,audio?.sample_rate])
const bytes=readFileSync(clip),atoms=[];let offset=0
while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));if(size===0)size=bytes.length-offset;atoms.push({type,offset,size});if(size<8)break;offset+=size}
check('faststart',atoms.find(a=>a.type==='moov')?.offset<atoms.find(a=>a.type==='mdat')?.offset,atoms)
const timestamps=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',clip],{encoding:'utf8'}).split('\n').map(parseFloat).filter(Number.isFinite)
const deviations=timestamps.slice(1).map((t,i)=>Math.abs(t-timestamps[i]-1/30));check('monotonic30fpsPTS',timestamps.length===900&&Math.max(...deviations)<.000002,{count:timestamps.length,maxDeltaError:Math.max(...deviations)})
execFileSync('ffmpeg',['-v','error','-i',clip,'-f','null','-'],{stdio:'pipe'});check('completeDecode',true,'Entire MP4 decoded without FFmpeg errors')
const pcm=execFileSync('ffmpeg',['-v','error','-i',clip,'-map','0:a:0','-f','f32le','pipe:1'],{maxBuffer:24*1024*1024});let maximum=0;for(let i=0;i<pcm.length;i+=4)maximum=Math.max(maximum,Math.abs(pcm.readFloatLE(i)));check('silentAAC',maximum<1e-7,{maxSample:maximum,samples:pcm.length/4})
const {spawnSync}=await import('node:child_process');const black=spawnSync('ffmpeg',['-hide_banner','-i',clip,'-an','-vf','crop=1664:936:128:72,blackdetect=d=0.01:pix_th=0.1:pic_th=0.98','-f','null','-'],{encoding:'utf8'})
writeFileSync(resolve(root,'evidence/blackdetect.log'),black.stderr);check('noBlackIntervals',black.status===0&&!/black_start:/.test(black.stderr),'No black-screen interval in the actual footage area (10ms detector minimum)')
const gray=execFileSync('ffmpeg',['-v','error','-i',clip,'-an','-vf','crop=1664:936:128:72,scale=160:90,format=gray','-f','rawvideo','pipe:1'],{maxBuffer:24*1024*1024})
let minStd=Infinity,uniformFrames=0;const pixels=160*90
for(let frame=0;frame<900;frame++){let sum=0,squares=0;for(let i=0;i<pixels;i++){const value=gray[frame*pixels+i];sum+=value;squares+=value*value}const std=Math.sqrt(Math.max(0,squares/pixels-(sum/pixels)**2));minStd=Math.min(minStd,std);if(std<3)uniformFrames++}
check('noBlankFootageFrames',gray.length===pixels*900&&uniformFrames===0,{uniformFrames,minStd,frames:gray.length/pixels})
check('actualMathPreset',capture.fields.values.includes('100')&&capture.fields.values.includes('周六下午')&&capture.fields.selected.some(s=>s.trim()==='数学')&&capture.fields.selected.some(s=>s.includes('初中')),capture.fields)
check('actualNamedTutorAndSixReasons',capture.result.id==='t001'&&capture.offCameraTutorVerification.url.includes('id=t001')&&capture.result.reasons.length>=6&&capture.result.reasons[0].text.includes('学科吻合')&&capture.result.reasons[1].text.includes('空闲时间兼容'),capture.result)
const points=capture.result.reasons.slice(0,5).map(r=>Number(r.text.match(/\+(\d+)/)?.[1]));const actualScore=Number(capture.score.text.match(/\d+/)?.[0]);check('displayedPointSumMatchesScore',points.length===5&&points.every(Number.isFinite)&&points.reduce((a,b)=>a+b,0)===actualScore,{points,actualScore})
check('publicWeightsComeFromActualPage',capture.weightLabels.length===5&&capture.rules.text.includes('硬过滤')&&capture.rules.text.includes('调整权重'),{weights:capture.weightLabels,rules:capture.rules.text})
const visible=[capture.rules,capture.result.card,...capture.result.reasons];check('allMeasuredRegionsVisible',visible.every(r=>r.y>=44&&r.y+r.height<=1080),visible)
const edl=JSON.parse(readFileSync(resolve(root,'evidence/edit-decision-list.json'),'utf8')),zoom=edl.finalZoom,crop={x:Math.max(0,Math.min(1920-1920/zoom,capture.resultFocus.x-960/zoom)),y:Math.max(0,Math.min(1080-1080/zoom,capture.resultFocus.y-540/zoom)),width:1920/zoom,height:1080/zoom},card=capture.result.card;check('completeCardInsideFinalCamera',card.x>=crop.x&&card.y>=crop.y&&card.x+card.width<=crop.x+crop.width&&card.y+card.height<=crop.y+crop.height,{crop,card,zoom})
const highlights=capture.events.filter(e=>e.kind==='actual-region-highlight');check('highlightsInRequiredShots',highlights.some(e=>e.timeSec>=6&&e.timeSec<15&&e.label==='学科与方式条件')&&highlights.some(e=>e.timeSec>=6&&e.timeSec<15&&e.label==='空闲时间兼容')&&['教学经历（自述）','课时费与预算','其他因素与偏好命中','实际公开权重说明'].every(label=>highlights.some(e=>e.label===label&&e.timeSec>=15&&e.timeSec<23)),highlights)
check('scoreBoundaryAndNoInventedWeights',readFileSync(resolve(root,'exports/score-boundary.txt'),'utf8')==='匹配分 ≠ 教学质量或提分概率'&&edl.weightOverlayNumbers===false,{boundary:'匹配分 ≠ 教学质量或提分概率',weightOverlayNumbers:edl.weightOverlayNumbers})
check('sameActualResultAtEnd',capture.events.some(e=>e.kind==='ending-state-verified'&&e.sameActualResult),capture.events.at(-1))
const srt=readFileSync(resolve(root,'captions_S04.srt'),'utf8'),blocks=srt.trim().split(/\n\s*\n/),toSec=t=>{const [h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const intervals=blocks.map(b=>b.split('\n')[1].split(' --> ').map(toSec))
check('SRT30SecondsUTF8',intervals[0][0]===0&&intervals.at(-1)[1]===30&&intervals.every(([a,b],i)=>b>a&&(!i||a===intervals[i-1][1]))&&!srt.includes('\ufffd'),intervals)
const preparationClicks=capture.events.filter(e=>e.kind==='real-mouse-click');check('actualGenerateClickBeforeFilm',capture.status==='passed'&&preparationClicks.length>=1&&preparationClicks.every(e=>e.timeSec<0&&e.hitTest)&&capture.preparation.verifiedBeforeFilm,preparationClicks)
check('resultsVerifiedBeforeFilm',capture.events.some(e=>e.kind==='pregenerated-results-verified'&&e.timeSec<0),capture.events.find(e=>e.kind==='pregenerated-results-verified'))
check('noModelCall',capture.modelRequests.length===0,capture.modelRequests)
check('freshBrowserContext',!capture.initialStorage.cookies.length&&!capture.initialStorage.origins.length,capture.initialStorage)
check('nativeViewportAlignment',capture.viewportAlignment.error<.5&&capture.viewportAlignment.topRightMaeAfter<1,capture.viewportAlignment)
const pacingLog=readFileSync(resolve(root,'evidence/selected-capture.log'),'utf8'),pacing=auditPacing(pacingLog,capture.rawTrimStartSec,30);check('captureNoPacingCorrectionInUsedInterval',pacing.noPacingCorrectionInUsedInterval&&pacing.rawDuplicateFrames===Number(capture.progress.dup_frames)&&pacing.rawDroppedFrames===Number(capture.progress.drop_frames),pacing)
mkdirSync(resolve(root,'keyframes'),{recursive:true})
const clicks=capture.events.filter(e=>e.kind==='real-mouse-click')
const frames=[['01_start',2],['02_subject',8.5],['03_time',12.5],['04_experience',16.4],['05_price',18.8],['06_preference',20.6],['07_weights',22.3],['08_end',28]]
for(const [name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',clip,'-frames:v','1',resolve(root,'keyframes',name+'.png')])
execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-vf','fps=1,scale=384:216,tile=5x6:padding=6:margin=8:color=0xf6f3eb','-frames:v','1','-q:v','3',resolve(root,'evidence/contact-sheet.jpg')])
// Lossless source-frame evidence from the selected native recording, independent
// of screenshots saved by any later failed attempt. Never substitute a fake UI.
mkdirSync(resolve(root,'evidence/sourceframes'),{recursive:true})
for(const [name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(capture.rawTrimStartSec+time),'-i',resolve(root,capture.rawVideo),'-frames:v','1',resolve(root,'evidence/sourceframes',name+'.png')])
writeFileSync(resolve(root,'evidence/sourceframes/provenance.json'),JSON.stringify({captureId:capture.id,rawVideo:capture.rawVideo,gitSha:capture.gitSha,description:'Full viewport frames extracted from the selected actual native screen recording before post-production; no graphics or reconstruction. The scored card and rules are unchanged actual UI; rectangle and cursor overlays only emphasize measured source text.',frames:frames.map(([name,timeSec])=>({file:name+'.png',segmentTimeSec:timeSec,rawTimeSec:capture.rawTrimStartSec+timeSec}))},null,2))

const preparationClickTime=capture.rawTrimStartSec+preparationClicks[0].timeSec-.065;execFileSync('ffmpeg',['-v','error','-y','-ss',String(preparationClickTime),'-i',resolve(root,capture.rawVideo),'-frames:v','1',resolve(root,'keyframes/00_preparation_click.png')]);writeFileSync(resolve(root,'evidence/preparation-click-frame.json'),JSON.stringify({file:'keyframes/00_preparation_click.png',phase:'actual native raw pre-roll, outside final film by design',rawTimeSec:preparationClickTime,segmentRelativeTimeSec:preparationClicks[0].timeSec-.065,source:capture.rawVideo,actualButton:'生成推荐'},null,2))
const output={status:'passed',gitSha:capture.gitSha,videoSha256:createHash('sha256').update(bytes).digest('hex'),fileSizeBytes:statSync(clip).size,checks,keyframes:frames.map(([name,timeSec])=>({file:'keyframes/'+name+'.png',timeSec})),manualVisualReview:'Required separately: compare keyframes and contact sheet with actual browser screenshots and DOM evidence. This script does not claim an OCR or human visual review.'}
writeFileSync(resolve(root,'evidence/validation.json'),JSON.stringify(output,null,2));console.log(JSON.stringify({status:output.status,checks:Object.keys(checks).length,videoSha256:output.videoSha256,fileSizeBytes:output.fileSizeBytes},null,2))
