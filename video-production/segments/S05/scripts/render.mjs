import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports'),m=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')),id=m.id,duration=m.durationSec
mkdirSync(out,{recursive:true});const c=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
if(c.status!=='passed'||c.modelRequests.length||c.realInteractions<1)throw new Error('Actual successful UI capture required')
const regular=process.env.SEGMENT_FONT_REGULAR||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',bold=process.env.SEGMENT_FONT_BOLD||'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
// One static frame for the entire recording: no zoompan, reframing or camera motion.
const filters=[`[0:v]trim=start=${c.rawTrimStartSec}:duration=${duration},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${duration*30},scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,drawbox=x=126:y=70:w=1668:h=940:t=2:color=0x325b46@0.25`]
function text(name,value,font,size,x,y,a=0,b=duration){writeFileSync(resolve(out,name+'.txt'),value);filters.push(`drawtext=fontfile='${font}':textfile='${resolve(out,name+'.txt')}':fontsize=${size}:fontcolor=0x244c3b:x=${x}:y=${y}:alpha='min(1,min(max((t-${a})/0.18,0),max((${b}-t)/0.18,0)))'`)}
text('header',`${id}  |  ${m.title}`,bold,24,128,24)
text('boundary',id==='S05'?'自述资料 · 学历与资质仍需核验':'Mock预约 · 不发送真实通知',regular,18,820,29)
text('source','虚构案例 · 固定画幅 · 未调用模型',regular,18,1410,29)
const sec=t=>{const[h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const captions=readFileSync(resolve(root,`captions_${id}.srt`),'utf8').trim().split(/\n\s*\n/).map((block,i)=>{const lines=block.split('\n'),[start,end]=lines[1].split(' --> ').map(sec),value=lines.slice(2).join('\n');text(`caption-${i+1}`,value,end===duration?bold:regular,end===duration?34:30,'(w-text_w)/2',1023,start,end);return{start,end,text:value}})
writeFileSync(resolve(out,'filtergraph.txt'),filters.join(',')+'[v]')
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({id,durationSec:duration,frames:duration*30,rawTrimStartSec:c.rawTrimStartSec,camera:{fixed:true,pan:false,animatedZoom:false,source:[1920,1080],sourceCrop:[0,0,1920,1080],footageFrame:[128,72,1664,936],browserCssViewport:[1280,720],deviceScaleFactor:1.5},captions,userSteering:'Faster actual actions; necessary smooth page scroll only. No shakes, dynamic zoom or artificial progress UI.'},null,2))
const fd=openSync(resolve(out,'render.log'),'w');try{execFileSync('ffmpeg',['-hide_banner','-y','-i',resolve(root,c.rawVideo),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v',String(duration*30),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart','-metadata',`title=${id} ${m.title}`,'-metadata','comment=Actual isolated Mock UI; fixed camera; fictional sample only; no model, qualification or notification claim',resolve(out,`clip_${id}.mp4`)],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}console.log('RENDERED',id)
