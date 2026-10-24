import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports');mkdirSync(out,{recursive:true})
const c=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
if(c.status!=='passed'||c.realInteractions<2||c.modelRequests.length||!c.course.existingBooking||c.navigation.steps.length!==5)throw new Error('Actual course, real navigation clicks and verified independent state required')
const regular=process.env.S03_FONT_REGULAR||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',bold=process.env.S03_FONT_BOLD||'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
const ease=q=>`((${q})*(${q})*(3-2*(${q})))`
const z=`if(lt(on,300),1.04+0.03*${ease('on/300')},if(lt(on,570),1.04,if(lt(on,720),1,if(lt(on,810),1+0.18*${ease('(on-720)/90')},1.18))))`
const cx=`if(lt(on,720),960,if(lt(on,810),960-160*${ease('(on-720)/90')},800))`
const filter=[`[0:v]trim=start=${c.rawTrimStartSec}:duration=35,setpts=PTS-STARTPTS,fps=30,trim=end_frame=1050,scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,2*(${cx})-iw/zoom/2))':y='max(0,min(ih-ih/zoom,ih/2-ih/zoom/2))':d=1:s=1920x1080:fps=30,gblur=sigma=11:enable='lt(t,19)+gte(t,27)',drawbox=x=0:y=0:w=iw:h=ih:color=0xf6f3eb@0.78:t=fill:enable='lt(t,19)+gte(t,27)',scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,drawbox=x=126:y=70:w=1668:h=940:t=2:color=0x325b46@0.25`]
const alpha=(a,b)=>`min(1,min(max((t-${a})/0.35,0),max((${b}-t)/0.35,0)))`
function text(name,value,font,size,x,y,a=0,b=35){writeFileSync(resolve(out,name+'.txt'),value);filter.push(`drawtext=fontfile='${font}':textfile='${resolve(out,name+'.txt')}':fontsize=${size}:fontcolor=0x244c3b:x=${x}:y=${y}:alpha='${alpha(a,b)}'`)}
text('header','S03  |  家长与教师的沟通断层',bold,24,128,24)
text('source','Mock · 预置课程 · 未调用模型',regular,18,1400,29)
text('opening-kicker','问题，也发生在课堂之后',regular,27,240,330,0,10)
text('opening-title','讲完了 ≠ 家长知道学会了',bold,68,230,420,0,10)
text('opening-note','老师的观察 · 学生的错题 · 家长的关注',regular,29,240,550,0,10)
text('chain-heading','把分散的环节，接成一条服务链',bold,44,220,270,10,19)
const chain=[{id:'01',label:'找老师',note:'先把需求说清楚',x:220,start:10},{id:'02',label:'备课',note:'明确目标与安排',x:535,start:11.6},{id:'03',label:'课堂记录',note:'留下逐题事实',x:850,start:13.2},{id:'04',label:'反馈',note:'由教师核对确认',x:1165,start:14.8},{id:'05',label:'下一课',note:'依据记录再调整',x:1480,start:16.4}]
for(const [i,node] of chain.entries()){
 text('chain-number-'+node.id,node.id,regular,23,node.x,407,node.start,19)
 text('chain-'+node.id,node.label,bold,38,node.x,468,node.start,19)
 text('chain-note-'+node.id,node.note,regular,22,node.x,555,node.start,19)
 if(i<4)text('chain-arrow-'+node.id,'→',regular,44,node.x+220,468,node.start+.6,19)
}
text('chain-caption','链路示意 · 建议与内容均需教师核验',regular,24,220,710,10,19)
text('entry-caption','打开“5分钟演示路线”，看见服务链',regular,30,'(w-text_w)/2',1023,19,24)
text('nav-caption','课堂事实 → 教师确认 → 课程修订',regular,30,'(w-text_w)/2',1023,24,27)
text('brand','领航云学堂',bold,66,260,250,27,35)
text('brand-line','让需求、课堂记录与反馈接起来',regular,30,270,358,27,35)
text('parent-title','家长',bold,42,300,495,27,35)
text('parent-note','提出需求 · 查看确认反馈',regular,25,300,570,27,35)
text('role-link','需求  ↔  反馈',regular,27,810,515,27,35)
text('tutor-title','大学生家教',bold,42,1180,495,27,35)
text('tutor-note','备课 · 记录 · 核验发布',regular,25,1180,570,27,35)
text('role-boundary','双角色服务链 · 概念示意',regular,21,270,665,27,35)
text('story','从初一小航的一次数学需求开始 →',bold,32,270,770,31,35)
text('story-needs','初中数学 · 100元/小时以内 · 周六下午',regular,26,270,835,31,35)
const graph=filter.join(',')+'[v]';writeFileSync(resolve(out,'filtergraph.txt'),graph)
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({duration:35,frames:1050,rawTrimStartSec:c.rawTrimStartSec,footageFrame:{x:128,y:72,width:1664,height:936},chain,shots:[{start:0,end:10,source:'actual accepted-booking preset course draft',overlay:'讲完了 ≠ 家长知道学会了'},{start:10,end:19,source:'actual course/home return under blur',overlay:'five editorial chain labels, arrows; not business UI'},{start:19,end:27,source:'actual home route click, five-step demo navigation and teaching card scroll'},{start:27,end:35,source:'actual demo navigation background',overlay:'领航云学堂; 家长; 大学生家教; lead to Xiaohang story'}],zoomExpression:z,focusXExpression:cx,visualEdits:'Native screen recording only for business imagery. Warm-white/dark-green titles, abstract chain, smooth cursor/camera and fades. No fake UI, score claims, interviews or new external media.'},null,2))
const fd=openSync(resolve(out,'render.log'),'w');try{execFileSync('ffmpeg',['-hide_banner','-y','-i',resolve(root,c.rawVideo),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v','1050','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','35','-movflags','+faststart','-metadata','title=S03 家长与教师的沟通断层','-metadata','comment=Actual Mock UI and preset course; editorial dual-role service-chain introduction; no model or achievement claim',resolve(out,'clip_S03.mp4')],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}console.log('RENDERED',resolve(out,'clip_S03.mp4'))
