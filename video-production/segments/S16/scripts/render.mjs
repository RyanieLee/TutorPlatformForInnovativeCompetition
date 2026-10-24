import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports');mkdirSync(out,{recursive:true});const m=JSON.parse(readFileSync(resolve(root,'manifest.json'))),c=JSON.parse(readFileSync(resolve(root,'evidence/capture.json'))),id=m.id;
if(c.status!=='passed'||c.modelRequests.length||!c.realInteractions)throw new Error('Successful real capture required');
execFileSync('python3',[resolve(root,'scripts/graphics.py')]);const args=['-hide_banner','-y'],filters=[],sources=[];let count=0;
function raw(name,dur,mode='full'){const s=c.scenes.find(x=>x.name===name);if(!s)throw new Error('Missing actual scene '+name);const i=count++;args.push('-i',resolve(root,s.rawVideo));const label='scene'+i;let chain=`[${i}:v]trim=start=${s.rawTrimStartSec}:duration=${dur},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${Math.round(dur*30)}`;
 if(mode==='half')chain+=',scale=832:468:flags=lanczos,setsar=1';else chain+=',scale=1664:936:flags=lanczos,pad=1920:1080:128:72:color=0xf6f3eb,setsar=1';filters.push(chain+`[${label}]`);sources.push({name,durationSec:dur,trim:s.rawTrimStartSec,source:s.rawVideo,mode});return label}
function graphic(name,dur,fade=false){const i=count++;args.push('-loop','1','-framerate','30','-i',resolve(out,name+'.png'));const label='scene'+i;filters.push(`[${i}:v]trim=duration=${dur},setpts=PTS-STARTPTS,fps=30,setsar=1${fade?',fade=t=in:st=0:d=0.5:color=0xf6f3eb,fade=t=out:st=4.2:d=0.8:color=0xf6f3eb':''}[${label}]`);sources.push({name,durationSec:dur,mode:'abstract graphic, not business UI'});return label}
let order;
if(id==='S14'){
 const a=raw('match',10),b=raw('teacher-feedback',10),p=raw('parent-feedback',15,'half'),t=raw('teacher-review',9,'half');filters.push(`[${t}]tpad=stop_mode=clone:stop_duration=6,trim=duration=15[teacherheld]`);filters.push(`[${p}][teacherheld]hstack=inputs=2,pad=1920:1080:128:300:color=0xf6f3eb[dual]`);order=[a,b,'dual'];
}else if(id==='S15')order=[graphic('architecture',9),graphic('governance',9),raw('github-actions',10),raw('parent-role',3.5),raw('teacher-role',3.5)];
else order=[raw('four-lessons',4),raw('match',4),raw('feedback',4),graphic('completed',12),graphic('next',9),graphic('brand',7,true)];
filters.push(order.map(x=>`[${x}]`).join('')+`concat=n=${order.length}:v=1:a=0[join]`);
const reg='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';let overlay=[];
function text(name,value,size,x,y,a,b,weight=false){writeFileSync(resolve(out,name+'.txt'),value);overlay.push(`drawtext=fontfile='${weight?bold:reg}':textfile='${resolve(out,name+'.txt')}':fontsize=${size}:fontcolor=0x234d3a:x=${x}:y=${y}:enable='gte(t,${a})*lt(t,${b})'`)}
text('heading',`${id} | ${m.title}`,24,128,24,0,id==='S16'?33:m.durationSec,true);
if(id==='S14'){
 text('boundary','虚构案例 · 规则 / 预置样例 · 未调用模型',18,1330,28,0,35);
 text('parent-title','家长查看已确认反馈',32,180,225,20,35,true);text('teacher-title','教师核验并发布 v2',32,1060,225,20,35,true);text('link','←  同一预约下的课程与反馈  →',28,'(w-text_w)/2',825,20,35);
 text('held','教师确认录像结束后，保留真实发布结果静帧',21,1030,900,29,35);
}else if(id==='S15')text('boundary','源码架构 / main CI 实况 · Mock 非公网运营',18,1280,28,0,35);
const sec=t=>{const[h,m,s]=t.split(':');return +h*3600+ +m*60+ +s.replace(',','.')};const captions=readFileSync(resolve(root,`captions_${id}.srt`),'utf8').trim().split(/\n\s*\n/).map((b,i)=>{const lines=b.split('\n'),[a,z]=lines[1].split(' --> ').map(sec),value=lines.slice(2).join('\n');text('caption'+i,value,30,'(w-text_w)/2',1026,a,z);return{start:a,end:z,text:value}});
filters.push('[join]'+overlay.join(',')+'[v]');writeFileSync(resolve(out,'filtergraph.txt'),filters.join(';\n'));
args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_threads','1','-filter_complex_script',resolve(out,'filtergraph.txt'),'-map','[v]','-map',`${count}:a`,'-c:v','libx264','-threads','4','-preset','medium','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-r','30','-frames:v',String(m.durationSec*30),'-c:a','aac','-b:a','192k','-ar','48000','-t',String(m.durationSec),'-movflags','+faststart',resolve(out,`clip_${id}.mp4`));
const fd=openSync(resolve(out,'render.log'),'w');try{execFileSync('ffmpeg',args,{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({id,durationSec:m.durationSec,sources,order,captions,fixedCamera:true,animatedZoom:false,heldRealFrame:id==='S14'?'Teacher review result held for final 6 seconds while parent footage continues':null,endingWhiteHoldSec:id==='S16'?2:0},null,2));console.log('RENDERED',id);
