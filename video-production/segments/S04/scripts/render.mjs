import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports');mkdirSync(out,{recursive:true})
const c=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'),'utf8'))
if(c.status!=='passed'||!c.preparation.verifiedBeforeFilm||c.realInteractions<1||c.modelRequests.length||c.result.reasons.length<6)throw new Error('Requires a verified actual pre-generation click and complete unchanged result reasons')
const regular=process.env.S04_FONT_REGULAR||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',bold=process.env.S04_FONT_BOLD||'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
const ease=q=>`((${q})*(${q})*(3-2*(${q})))`,fy=c.resultFocus.y,ry=c.rulesFocus.y,cx=c.resultFocus.x
const finalZoom=Math.min(1.85,1920/(c.result.card.width+90),1080/(c.result.card.height+90)),midZoom=Math.min(1.65,finalZoom)
const z=`if(lt(on,180),1.03+0.02*${ease('on/180')},if(lt(on,210),1.05+(${midZoom}-1.05)*${ease('(on-180)/30')},if(lt(on,690),${midZoom},${midZoom}+(${finalZoom}-${midZoom})*${ease('min((on-690)/195,1)')})))`
const y=`if(lt(on,180),540,if(lt(on,210),540+(${fy}-540)*${ease('(on-180)/30')},if(lt(on,630),${fy},if(lt(on,654),${fy}+(${ry}-${fy})*${ease('(on-630)/24')},if(lt(on,690),${ry},if(lt(on,720),${ry}+(${fy}-${ry})*${ease('(on-690)/30')},${fy}))))))`
const f=[`[0:v]trim=start=${c.rawTrimStartSec}:duration=30,setpts=PTS-STARTPTS,fps=30,trim=end_frame=900,scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,2*${cx}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,2*(${y})-ih/zoom/2))':d=1:s=1920x1080:fps=30,scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,drawbox=x=126:y=70:w=1668:h=940:t=2:color=0x325b46@0.25`]
const alpha=(a,b)=>`min(1,min(max((t-${a})/0.25,0),max((${b}-t)/0.25,0)))`
function text(name,value,font,size,x,y,a=0,b=30){writeFileSync(resolve(out,name+'.txt'),value);f.push(`drawtext=fontfile='${font}':textfile='${resolve(out,name+'.txt')}':fontsize=${size}:fontcolor=0x244c3b:x=${x}:y=${y}:alpha='${alpha(a,b)}'`)}
text('header','S04  |  推荐解释与多因子排序',bold,24,128,24)
text('score-boundary','匹配分 ≠ 教学质量或提分概率',regular,18,880,29)
text('source','Mock · 公开规则 · 虚构案例',regular,18,1450,29)
const seconds=t=>{const[h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))}
const captions=readFileSync(resolve(root,'captions_S04.srt'),'utf8').trim().split(/\n\s*\n/).map((b,i)=>{const lines=b.split('\n'),[start,end]=lines[1].split(' --> ').map(seconds);const value=lines.slice(2).join('\n');text('caption-'+(i+1),value,start===23?bold:regular,start===23?36:30,'(w-text_w)/2',1023,start,end);return{start,end,text:value}})
writeFileSync(resolve(out,'filtergraph.txt'),f.join(',')+'[v]')
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({duration:30,frames:900,rawTrimStartSec:c.rawTrimStartSec,footageFrame:{x:128,y:72,width:1664,height:936},finalZoom,midZoom,finalFocus:c.resultFocus,ruleFocus:c.rulesFocus,zoomExpression:z,focusYExpression:y,captions,weightOverlayNumbers:false,visualEdits:'Actual continuous rule-matching UI; measured highlight rectangles/pointer only, warm matte and captions. No reconstructed score table or altered data. Actual Generate click is in the recorded pre-roll, excluded so film opens with results as required.'},null,2))
const fd=openSync(resolve(out,'render.log'),'w');try{execFileSync('ffmpeg',['-hide_banner','-y','-i',resolve(root,c.rawVideo),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v','900','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','30','-movflags','+faststart','-metadata','title=S04 推荐解释与多因子排序','-metadata','comment=Actual Mock rule matching; current data and weights; no model, quality or achievement probability claim',resolve(out,'clip_S04.mp4')],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}console.log('RENDERED',resolve(out,'clip_S04.mp4'))
