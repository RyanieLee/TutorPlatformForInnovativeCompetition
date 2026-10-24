import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),clip=resolve(root,'exports/clip_S01.mp4'),checks={}
function check(name,condition,actual){checks[name]={passed:!!condition,actual};if(!condition)throw new Error(`${name}: ${JSON.stringify(actual)}`)}
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',clip],{encoding:'utf8'}))
writeFileSync(resolve(root,'evidence/ffprobe.json'),JSON.stringify(probe,null,2))
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio')
check('exact40Seconds',Number(probe.format.duration)===40,probe.format.duration)
check('1200Frames',Number(video.nb_read_frames)===1200,video.nb_read_frames)
check('resolution',video.width===1920&&video.height===1080,[video.width,video.height])
check('frameRate',video.r_frame_rate==='30/1'&&video.avg_frame_rate==='30/1',[video.r_frame_rate,video.avg_frame_rate])
check('H264yuv420p',video.codec_name==='h264'&&video.pix_fmt==='yuv420p',[video.codec_name,video.pix_fmt])
check('AAC48kHz',audio?.codec_name==='aac'&&audio?.sample_rate==='48000',[audio?.codec_name,audio?.sample_rate])
const bytes=readFileSync(clip),atoms=[];let offset=0
while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));if(size===0)size=bytes.length-offset;atoms.push({type,offset,size});if(size<8)break;offset+=size}
check('faststart',atoms.find(a=>a.type==='moov')?.offset<atoms.find(a=>a.type==='mdat')?.offset,atoms)
const timestamps=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',clip],{encoding:'utf8'}).split('\n').map(parseFloat).filter(Number.isFinite)
const deviations=timestamps.slice(1).map((t,i)=>Math.abs(t-timestamps[i]-1/30));check('monotonic30fpsPTS',timestamps.length===1200&&Math.max(...deviations)<.000002,{count:timestamps.length,maxDeltaError:Math.max(...deviations)})
execFileSync('ffmpeg',['-v','error','-i',clip,'-f','null','-'],{stdio:'pipe'});check('completeDecode',true,'Entire MP4 decoded without FFmpeg errors')
const pcm=execFileSync('ffmpeg',['-v','error','-i',clip,'-map','0:a:0','-f','f32le','pipe:1'],{maxBuffer:24*1024*1024});let maximum=0;for(let i=0;i<pcm.length;i+=4)maximum=Math.max(maximum,Math.abs(pcm.readFloatLE(i)));check('silentAAC',maximum<1e-7,{maxSample:maximum,samples:pcm.length/4})
const {spawnSync}=await import('node:child_process');const black=spawnSync('ffmpeg',['-hide_banner','-i',clip,'-an','-vf','crop=1664:936:128:72,blackdetect=d=0.01:pix_th=0.1:pic_th=0.98','-f','null','-'],{encoding:'utf8'})
writeFileSync(resolve(root,'evidence/blackdetect.log'),black.stderr);check('noBlackIntervals',black.status===0&&!/black_start:/.test(black.stderr),'No black-screen interval in the actual footage area (10ms detector minimum)')
const gray=execFileSync('ffmpeg',['-v','error','-i',clip,'-an','-vf','crop=1664:936:128:72,scale=160:90,format=gray','-f','rawvideo','pipe:1'],{maxBuffer:24*1024*1024})
let minStd=Infinity,uniformFrames=0;const pixels=160*90
for(let frame=0;frame<1200;frame++){let sum=0,squares=0;for(let i=0;i<pixels;i++){const value=gray[frame*pixels+i];sum+=value;squares+=value*value}const std=Math.sqrt(Math.max(0,squares/pixels-(sum/pixels)**2));minStd=Math.min(minStd,std);if(std<3)uniformFrames++}
check('noBlankFootageFrames',gray.length===pixels*1200&&uniformFrames===0,{uniformFrames,minStd,frames:gray.length/pixels})
const crop={x:960-960/1.8,y:capture.resultFocus.y-540/1.8,width:1920/1.8,height:1080/1.8}
check('twoReasonsInsideFinalCamera',capture.result.visibleReasons.every(r=>r.x>=crop.x&&r.y>=crop.y&&r.x+r.width<=crop.x+crop.width&&r.y+r.height<=crop.y+crop.height),{crop,reasons:capture.result.visibleReasons})
const srt=readFileSync(resolve(root,'captions_S01.srt'),'utf8'),blocks=srt.trim().split(/\n\s*\n/),toSec=t=>{const [h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const intervals=blocks.map(b=>b.split('\n')[1].split(' --> ').map(toSec))
check('SRT40SecondsUTF8',intervals[0][0]===0&&intervals.at(-1)[1]===40&&intervals.every(([a,b],i)=>b>a&&(!i||a===intervals[i-1][1]))&&!srt.includes('\ufffd'),intervals)
check('twoActualClicks',capture.status==='passed'&&capture.realInteractions>=2,capture.events.filter(e=>e.kind==='real-mouse-click'))
check('clicksInShotWindows',capture.events.filter(e=>e.kind==='real-mouse-click').every((e,i)=>i===0?e.timeSec>=5&&e.timeSec<12:e.timeSec>=20&&e.timeSec<31),capture.events.filter(e=>e.kind==='real-mouse-click').map(e=>e.timeSec))
check('actualTutorAndReasons',capture.result.id==='t001'&&capture.result.visibleReasons.length>=2,{name:capture.result.name,reasons:capture.result.visibleReasons})
check('noModelCall',capture.modelRequests.length===0,capture.modelRequests)
check('freshBrowserContext',!capture.initialStorage.cookies.length&&!capture.initialStorage.origins.length,capture.initialStorage)
check('nativeViewportAlignment',capture.viewportAlignment.error<.5&&capture.viewportAlignment.topRightMaeAfter<1,capture.viewportAlignment)
check('captureNoDropOrDup',Number(capture.progress.drop_frames)===0&&Number(capture.progress.dup_frames)===0,{drop:capture.progress.drop_frames,dup:capture.progress.dup_frames})
mkdirSync(resolve(root,'keyframes'),{recursive:true})
const clicks=capture.events.filter(e=>e.kind==='real-mouse-click')
const frames=[['01_start',.8],['02_click_entry',clicks[0].timeSec-.065],['03_fields',16],['04_click_generate',clicks[1].timeSec-.065],['05_result',31.5],['06_end',39]]
for(const [name,time]of frames)execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',clip,'-frames:v','1',resolve(root,'keyframes',name+'.png')])
execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-vf','fps=1,scale=384:216,tile=5x8:padding=6:margin=8:color=0xf6f3eb','-frames:v','1','-q:v','3',resolve(root,'evidence/contact-sheet.jpg')])
const output={status:'passed',gitSha:capture.gitSha,videoSha256:createHash('sha256').update(bytes).digest('hex'),fileSizeBytes:statSync(clip).size,checks,keyframes:frames.map(([name,timeSec])=>({file:'keyframes/'+name+'.png',timeSec})),manualVisualReview:'Required separately: compare keyframes and contact sheet with actual browser screenshots and DOM evidence. This script does not claim an OCR or human visual review.'}
writeFileSync(resolve(root,'evidence/validation.json'),JSON.stringify(output,null,2));console.log(JSON.stringify({status:output.status,checks:Object.keys(checks).length,videoSha256:output.videoSha256,fileSizeBytes:output.fileSizeBytes},null,2))
