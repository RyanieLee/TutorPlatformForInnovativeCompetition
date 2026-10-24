import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports');mkdirSync(out,{recursive:true})
const ids=['S05','S06','S07'];if(!process.argv.includes('--concat-only'))for(const id of ids)execFileSync(process.execPath,[resolve(root,'..',id,'scripts/render.mjs')],{stdio:'inherit'})
const segments=ids.map((id,i)=>{const r=resolve(root,'..',id),m=JSON.parse(readFileSync(resolve(r,'manifest.json'),'utf8'));return{id,root:r,durationSec:m.durationSec,startSec:[0,30,55][i],video:resolve(r,`exports/clip_${id}.mp4`)}})
// Remove each input AAC track before concat, so AAC priming cannot shift video PTS by 21ms.
for(const s of segments){s.videoOnly=resolve(out,`${s.id}-video-only.mp4`);execFileSync('ffmpeg',['-v','error','-y','-i',s.video,'-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',s.videoOnly])}
const quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";writeFileSync(resolve(out,'concat.txt'),segments.map(s=>'file '+quote(s.videoOnly)).join('\n')+'\n')
// Copy already rendered frames exactly; regenerate one silent AAC track to avoid
// per-file AAC priming at cuts. No dissolve, retiming, extra zoom or image edits.
const fd=openSync(resolve(out,'render.log'),'w');try{execFileSync('ffmpeg',['-hide_banner','-y','-f','concat','-safe','0','-i',resolve(out,'concat.txt'),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v:0','-map','1:a:0','-c:v','copy','-frames:v','2400','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','80','-movflags','+faststart','-metadata','title=S05–S07 家长：看资料、提交预约、查看待确认状态','-metadata','comment=Three independent real Mock captures; fixed camera; no real notifications, credentials or model call',resolve(out,'clip_S05-S07.mp4')],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}
const parse=t=>{const[h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s.replace(',','.'))},stamp=t=>{const ms=Math.round(t*1000);return`${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`}
let n=0;const blocks=[];for(const s of segments)for(const block of readFileSync(resolve(s.root,`captions_${s.id}.srt`),'utf8').trim().split(/\n\s*\n/)){const lines=block.split('\n'),times=lines[1].split(' --> ').map(t=>parse(t)+s.startSec);blocks.push(`${++n}\n${stamp(times[0])} --> ${stamp(times[1])}\n${lines.slice(2).join('\n')}`)}writeFileSync(resolve(root,'captions_S05-S07.srt'),blocks.join('\n\n')+'\n')
writeFileSync(resolve(root,'voiceover.md'),'# S05–S07 配音文稿\n\n'+segments.map(s=>readFileSync(resolve(s.root,'voiceover.md'),'utf8')).join('\n\n'))
writeFileSync(resolve(root,'evidence/edit-decision-list.json'),JSON.stringify({durationSec:80,frames:2400,segments:segments.map(({id,durationSec,startSec})=>({id,durationSec,startSec,endSec:startSec+durationSec})),transition:'Exact source-frame cuts at 30s and 55s; no moving camera, zoom, dissolves, fake UI or time compression.',audio:'One silent stereo AAC 48kHz track',independence:'S07 recreates its own pending case through real UI. IDs/created timestamps differ between independent contexts; this is scenario continuity, not cross-context persistence.'},null,2))
console.log('COMBINED',resolve(out,'clip_S05-S07.mp4'))
