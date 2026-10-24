import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {auditPacing} from './pacing.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),clip=resolve(root,'exports/clip_S03.mp4'),checks={}
function check(name,condition,actual){checks[name]={passed:!!condition,actual};if(!condition)throw new Error(`${name}: ${JSON.stringify(actual)}`)}
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',clip],{encoding:'utf8'}))
writeFileSync(resolve(root,'evidence/ffprobe.json'),JSON.stringify(probe,null,2))
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio')
check('exact35Seconds',Number(probe.format.duration)===35,probe.format.duration)
check('1050Frames',Number(video.nb_read_frames)===1050,video.nb_read_frames)
check('resolution',video.width===1920&&video.height===1080,[video.width,video.height])
check('frameRate',video.r_frame_rate==='30/1'&&video.avg_frame_rate==='30/1',[video.r_frame_rate,video.avg_frame_rate])
check('H264yuv420p',video.codec_name==='h264'&&video.pix_fmt==='yuv420p',[video.codec_name,video.pix_fmt])
check('AAC48kHz',audio?.codec_name==='aac'&&audio?.sample_rate==='48000',[audio?.codec_name,audio?.sample_rate])
const bytes=readFileSync(clip),atoms=[];let offset=0
while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));if(size===0)size=bytes.length-offset;atoms.push({type,offset,size});if(size<8)break;offset+=size}
check('faststart',atoms.find(a=>a.type==='moov')?.offset<atoms.find(a=>a.type==='mdat')?.offset,atoms)
const timestamps=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',clip],{encoding:'utf8'}).split('\n').map(parseFloat).filter(Number.isFinite)
const deviations=timestamps.slice(1).map((t,i)=>Math.abs(t-timestamps[i]-1/30));check('monotonic30fpsPTS',timestamps.length===1050&&Math.max(...deviations)<.000002,{count:timestamps.length,maxDeltaError:Math.max(...deviations)})
execFileSync('ffmpeg',['-v','error','-i',clip,'-f','null','-'],{stdio:'pipe'});check('completeDecode',true,'Entire MP4 decoded without FFmpeg errors')
const pcm=execFileSync('ffmpeg',['-v','error','-i',clip,'-map','0:a:0','-f','f32le','pipe:1'],{maxBuffer:24*1024*1024});let maximum=0;for(let i=0;i<pcm.length;i+=4)maximum=Math.max(maximum,Math.abs(pcm.readFloatLE(i)));check('silentAAC',maximum<1e-7,{maxSample:maximum,samples:pcm.length/4})
const {spawnSync}=await import('node:child_process');const black=spawnSync('ffmpeg',['-hide_banner','-i',clip,'-an','-vf','crop=1664:936:128:72,blackdetect=d=0.01:pix_th=0.1:pic_th=0.98','-f','null','-'],{encoding:'utf8'})
writeFileSync(resolve(root,'evidence/blackdetect.log'),black.stderr);check('noBlackIntervals',black.status===0&&!/black_start:/.test(black.stderr),'No black-screen interval in the actual footage area (10ms detector minimum)')
const gray=execFileSync('ffmpeg',['-v','error','-i',clip,'-an','-vf','crop=1664:936:128:72,scale=160:90,format=gray','-f','rawvideo','pipe:1'],{maxBuffer:24*1024*1024})
let minStd=Infinity,uniformFrames=0;const pixels=160*90
for(let frame=0;frame<1050;frame++){let sum=0,squares=0;for(let i=0;i<pixels;i++){const value=gray[frame*pixels+i];sum+=value;squares+=value*value}const std=Math.sqrt(Math.max(0,squares/pixels-(sum/pixels)**2));minStd=Math.min(minStd,std);if(std<3)uniformFrames++}
check('noBlankFootageFrames',gray.length===pixels*1050&&uniformFrames===0,{uniformFrames,minStd,frames:gray.length/pixels})
check('actualCourseWithGenuineBooking',capture.course.existingBooking&&capture.course.url.includes('bookingId=')&&capture.course.actualText.includes('一元一次方程')&&capture.preparation.some(p=>p.action==='tutor actually accepted booking'&&p.actualStatus.includes('家教已接受')),capture.course)
check('presetSourceDisclosed',capture.course.source==='预置演示样例（非实时生成）'&&capture.course.published===false,{source:capture.course.source,published:capture.course.published})
check('realFiveStepNavigation',capture.navigation.steps.length===5&&capture.navigation.hero.includes('把功能串成一条学习服务链')&&capture.navigation.modelStatus.includes('未配置'),capture.navigation)
const box=capture.navigation.teachingBox;check('teachingNavigationFullyVisible',box.y>=0&&box.y+box.height<=1080&&capture.navigation.teachingText.includes('教师确认'),{box,text:capture.navigation.teachingText})
const labels=['找老师','备课','课堂记录','反馈','下一课'];check('fiveEditorialChainLabels',labels.every((word,i)=>readFileSync(resolve(root,'exports',`chain-0${i+1}.txt`),'utf8')===word),labels)
const brand=readFileSync(resolve(root,'exports/brand.txt'),'utf8'),parent=readFileSync(resolve(root,'exports/parent-title.txt'),'utf8'),tutor=readFileSync(resolve(root,'exports/tutor-title.txt'),'utf8');check('brandAndDualRoles',brand==='领航云学堂'&&parent==='家长'&&tutor==='大学生家教',{brand,parent,tutor})
const srt=readFileSync(resolve(root,'captions_S03.srt'),'utf8'),blocks=srt.trim().split(/\n\s*\n/),toSec=t=>{const [h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const intervals=blocks.map(b=>b.split('\n')[1].split(' --> ').map(toSec))
check('SRT35SecondsUTF8',intervals[0][0]===0&&intervals.at(-1)[1]===35&&intervals.every(([a,b],i)=>b>a&&(!i||a===intervals[i-1][1]))&&!srt.includes('\ufffd'),intervals)
check('twoActualClicks',capture.status==='passed'&&capture.realInteractions>=2,capture.events.filter(e=>e.kind==='real-mouse-click'))
check('clicksInShotWindows',capture.events.filter(e=>e.kind==='real-mouse-click').every((e,i)=>i===0?e.timeSec>=10&&e.timeSec<19:e.timeSec>=19&&e.timeSec<27),capture.events.filter(e=>e.kind==='real-mouse-click').map(e=>e.timeSec))
check('noModelCall',capture.modelRequests.length===0,capture.modelRequests)
check('freshBrowserContext',!capture.initialStorage.cookies.length&&!capture.initialStorage.origins.length,capture.initialStorage)
check('nativeViewportAlignment',capture.viewportAlignment.error<.5&&capture.viewportAlignment.topRightMaeAfter<1,capture.viewportAlignment)
const pacingLog=readFileSync(resolve(root,'evidence/selected-capture.log'),'utf8'),pacing=auditPacing(pacingLog,capture.rawTrimStartSec,35);check('captureNoPacingCorrectionInUsedInterval',pacing.noPacingCorrectionInUsedInterval&&pacing.rawDuplicateFrames===Number(capture.progress.dup_frames)&&pacing.rawDroppedFrames===Number(capture.progress.drop_frames),pacing)
mkdirSync(resolve(root,'keyframes'),{recursive:true})
const clicks=capture.events.filter(e=>e.kind==='real-mouse-click')
const frames=[['01_start',2],['02_chain',17.4],['03_home',19.3],['04_click_route',clicks[1].timeSec-.065],['05_navigation',23.4],['06_teaching_chain',26.6],['07_end',33]]
for(const [name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',clip,'-frames:v','1',resolve(root,'keyframes',name+'.png')])
execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-vf','fps=1,scale=384:216,tile=5x7:padding=6:margin=8:color=0xf6f3eb','-frames:v','1','-q:v','3',resolve(root,'evidence/contact-sheet.jpg')])
// Lossless source-frame evidence from the selected native recording, independent
// of screenshots saved by any later failed attempt. Never substitute a fake UI.
mkdirSync(resolve(root,'evidence/sourceframes'),{recursive:true})
for(const [name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(capture.rawTrimStartSec+time),'-i',resolve(root,capture.rawVideo),'-frames:v','1',resolve(root,'evidence/sourceframes',name+'.png')])
writeFileSync(resolve(root,'evidence/sourceframes/provenance.json'),JSON.stringify({captureId:capture.id,rawVideo:capture.rawVideo,gitSha:capture.gitSha,description:'Full viewport frames extracted from the selected actual native screen recording before post-production; no graphics or reconstruction. The end-state footage remains the actual demo navigation; brand/role graphics are editorial overlays.',frames:frames.map(([name,timeSec])=>({file:name+'.png',segmentTimeSec:timeSec,rawTimeSec:capture.rawTrimStartSec+timeSec}))},null,2))

const output={status:'passed',gitSha:capture.gitSha,videoSha256:createHash('sha256').update(bytes).digest('hex'),fileSizeBytes:statSync(clip).size,checks,keyframes:frames.map(([name,timeSec])=>({file:'keyframes/'+name+'.png',timeSec})),manualVisualReview:'Required separately: compare keyframes and contact sheet with actual browser screenshots and DOM evidence. This script does not claim an OCR or human visual review.'}
writeFileSync(resolve(root,'evidence/validation.json'),JSON.stringify(output,null,2));console.log(JSON.stringify({status:output.status,checks:Object.keys(checks).length,videoSha256:output.videoSha256,fileSizeBytes:output.fileSizeBytes},null,2))
