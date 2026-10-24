import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,createWriteStream,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports')
mkdirSync(out,{recursive:true})
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
if(capture.status!=='passed'||capture.realInteractions<2||capture.modelRequests.length)throw new Error('Render requires a passed real capture, two real clicks, and zero model calls')
const regular=process.env.S01_FONT_REGULAR||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
const bold=process.env.S01_FONT_BOLD||'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
const ease=q=>`((${q})*(${q})*(3-2*(${q})))`
const z=`if(lt(on,150),1+0.025*on/150,if(lt(on,360),1.025,if(lt(on,420),1.025+0.625*${ease('(on-360)/60')},if(lt(on,552),1.65,if(lt(on,600),1.65-0.65*${ease('(on-552)/48')},if(lt(on,810),1,if(lt(on,930),1+0.35*${ease('(on-810)/120')},1.35+0.45*${ease('min((on-930)/255,1)')})))))))`
const focusY=capture.resultFocus.y
const y=`if(lt(on,360),540,if(lt(on,420),540-140*${ease('(on-360)/60')},if(lt(on,552),400,if(lt(on,600),400+140*${ease('(on-552)/48')},if(lt(on,810),540,if(lt(on,930),540+(${focusY}-540)*${ease('(on-810)/120')},${focusY}))))))`
writeFileSync(resolve(out,'header.txt'),'S01  |  家长需求与智能匹配')
writeFileSync(resolve(out,'source.txt'),'Mock · 规则演示 · 虚构案例')
const text=(file,font,size,x,y,extra='')=>`drawtext=fontfile='${font}':textfile='${resolve(out,file)}':fontsize=${size}:fontcolor=0x244c3b:x=${x}:y=${y}${extra}`
const blocks=readFileSync(resolve(root,'captions_S01.srt'),'utf8').trim().split(/\n\s*\n/)
const seconds=s=>{const [h,m,rest]=s.split(':');return Number(h)*3600+Number(m)*60+Number(rest.replace(',','.'))}
const captions=blocks.map((block,i)=>{const lines=block.split('\n'),[a,b]=lines[1].split(' --> ');const start=seconds(a),end=seconds(b);const filename=`caption-${i+1}.txt`;writeFileSync(resolve(out,filename),lines.slice(2).join('\n'));return{file:filename,start,end,text:lines.slice(2).join('\n')}})
const filter=[`[0:v]trim=start=${capture.rawTrimStartSec}:duration=40,setpts=PTS-STARTPTS,fps=30,trim=end_frame=1200,scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,iw/2-iw/zoom/2))':y='max(0,min(ih-ih/zoom,2*(${y})-ih/zoom/2))':d=1:s=1920x1080:fps=30,scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,drawbox=x=126:y=70:w=1668:h=940:t=2:color=0x325b46@0.25`,text('header.txt',bold,24,128,24),text('source.txt',regular,18,1430,29)]
for(const c of captions){const alpha=`min(1,min(max((t-${c.start})/0.22,0),max((${c.end}-t)/0.22,0)))`;filter.push(text(c.file,c.start===0||c.start===31?bold:regular,c.start===0||c.start===31?36:30,'(w-text_w)/2',1023,`:enable='gte(t,${c.start})*lt(t,${c.end})':alpha='${alpha}'`))}
const graph=filter.join(',')+'[v]'
writeFileSync(resolve(out,'filtergraph.txt'),graph)
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({duration:40,frames:1200,footageFrame:{x:128,y:72,width:1664,height:936},rawTrimStartSec:capture.rawTrimStartSec,zoomExpression:z,focusYExpression:y,captions,visualEdits:'Real continuous capture, eased camera pushes, warm-white matte, dark-green titles/subtitles and cursor/ripple only; no reconstructed business UI or replacement results.'},null,2))
const fd=openSync(resolve(out,'render.log'),'w')
try{execFileSync('ffmpeg',['-hide_banner','-y','-i',resolve(root,capture.rawVideo),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v','1200','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','40','-movflags','+faststart','-metadata','title=S01 家长需求与智能匹配','-metadata','comment=Actual Mock UI capture; no model call; synthetic demonstration case',resolve(out,'clip_S01.mp4')],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}
console.log('RENDERED',resolve(out,'clip_S01.mp4'))
