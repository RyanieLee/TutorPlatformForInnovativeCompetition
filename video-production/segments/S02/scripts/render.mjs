import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports')
mkdirSync(out,{recursive:true})
const capture=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
if(capture.status!=='passed'||capture.realInteractions<2||capture.modelRequests.length)throw new Error('Requires independently verified real capture')
const regular=process.env.S02_FONT_REGULAR||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
const bold=process.env.S02_FONT_BOLD||'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
const ease=q=>`((${q})*(${q})*(3-2*(${q})))`
const z=`if(lt(on,240),1.04+0.025*${ease('on/240')},if(lt(on,540),1.065,if(lt(on,720),1+0.2*${ease('(on-540)/180')},if(lt(on,810),1.2+0.4*${ease('(on-720)/90')},1.6))))`
const x=`if(lt(on,540),960,if(lt(on,720),960-160*${ease('(on-540)/180')},if(lt(on,810),800+152*${ease('(on-720)/90')},952)))`
const y=`if(lt(on,720),540,if(lt(on,810),540-90*${ease('(on-720)/90')},450))`
const text=(name,value,font,size,px,py,extra='')=>{writeFileSync(resolve(out,name+'.txt'),value);return`drawtext=fontfile='${font}':textfile='${resolve(out,name+'.txt')}':fontsize=${size}:fontcolor=0x244c3b:x=${px}:y=${py}${extra}`}
const fade=(a,b)=>`min(1,min(max((t-${a})/0.35,0),max((${b}-t)/0.35,0)))`
const f=[`[0:v]trim=start=${capture.rawTrimStartSec}:duration=28,setpts=PTS-STARTPTS,fps=30,trim=end_frame=840,tpad=stop_mode=clone:stop_duration=7,trim=end_frame=1050,scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,2*(${x})-iw/zoom/2))':y='max(0,min(ih-ih/zoom,2*(${y})-ih/zoom/2))':d=1:s=1920x1080:fps=30,gblur=sigma=15:enable='lt(t,18)+gte(t,28)',drawbox=x=0:y=0:w=iw:h=ih:color=0xf6f3eb@0.78:t=fill:enable='lt(t,18)+gte(t,28)',scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,drawbox=x=126:y=70:w=1668:h=940:t=2:color=0x325b46@0.25`,text('header','S02  |  传统找家教的盲目性',bold,24,128,24),text('source','真实 Mock 网页 · 虚构演示资料',regular,18,1390,29),text('opening-kicker','从家长的一个问题开始',regular,25,270,346,`:alpha='${fade(0,8)}'`),text('opening-title','找老师，为什么这么难？',bold,76,260,414,`:alpha='${fade(0,8)}'`),text('opening-case','初一小航 · 寻找数学家教',regular,28,270,550,`:alpha='${fade(0,8)}'`)]
f.push(text('pain-heading','信息多，判断仍然很难',bold,46,235,270,`:alpha='${fade(8,18)}'`))
// Editorial abstract graphics only. These rectangles/paths are not platform controls or data.
f.push("drawbox=x=440:y=695:w=1030:h=2:color=0x557964@0.5:t=fill:enable='gte(t,8)*lt(t,18)'")
const pains=[['01','渠道分散','入口多，信息不在一处',210,8],['02','能力难比较','同样的介绍，难直接判断',745,11.3],['03','时间反复确认','是否有空，仍需逐项核对',1280,14.6]]
for(const [n,title,note,px,a] of pains){f.push(`drawbox=x=${px}:y=400:w=430:h=240:color=0xfffdf7@0.87:t=fill:enable='gte(t,${a})*lt(t,18)'`,`drawbox=x=${px}:y=400:w=430:h=3:color=0x315b45:t=fill:enable='gte(t,${a})*lt(t,18)'`,text('pain-'+n+'-number',n,regular,24,px+28,430,`:alpha='${fade(a,18)}'`),text('pain-'+n,title,bold,40,px+28,485,`:alpha='${fade(a,18)}'`),text('pain-'+n+'-note',note,regular,22,px+28,555,`:alpha='${fade(a,18)}'`))}
f.push(text('list-caption','先浏览真实家教资料：学校、科目、费用',regular,30,'(w-text_w)/2',1023,`:alpha='${fade(18,24)}'`),text('detail-caption','点开资料，再核对可授课时间',regular,30,'(w-text_w)/2',1023,`:alpha='${fade(24,28)}'`),text('end-kicker','从「看到」到「适合」',regular,27,270,350,`:alpha='${fade(28,35)}'`),text('end-title','看到了信息，但能判断适合吗？',bold,60,260,435,`:alpha='${fade(28,35)}'`),text('end-note','需求，需要转成可核对的条件',regular,28,270,550,`:alpha='${fade(28,35)}'`))
writeFileSync(resolve(out,'filtergraph.txt'),f.join(',')+'[v]')
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({duration:35,frames:1050,rawTrimStartSec:capture.rawTrimStartSec,footageFrame:{x:128,y:72,width:1664,height:936},opening:'0-8 actual blurred home with question',painPoints:pains.map(([id,text,note,x,start])=>({id,text,note,start,end:18})),live:'18-28 true list navigation/scroll and t001 detail; availability only on actual detail',freeze:{start:28,end:35,source:'last actual frame before 28s; tpad clone, fixed final camera; editorial blur and question'},zoomExpression:z,visualEdits:'Actual native screen recording; abstract editorial graphics only; no reconstructed business UI, fabricated interview or model call.'},null,2))
const fd=openSync(resolve(out,'render.log'),'w')
try{execFileSync('ffmpeg',['-hide_banner','-y','-i',resolve(root,capture.rawVideo),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v','1050','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','35','-movflags','+faststart','-metadata','title=S02 传统找家教的盲目性','-metadata','comment=Actual Mock UI capture; editorial problem framing; synthetic demonstration profiles; no model call',resolve(out,'clip_S02.mp4')],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}
console.log('RENDERED',resolve(out,'clip_S02.mp4'))
