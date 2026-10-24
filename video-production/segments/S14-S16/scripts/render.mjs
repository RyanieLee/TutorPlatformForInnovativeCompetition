import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'exports');mkdirSync(out,{recursive:true});const ids=['S14','S15','S16'];
for(const id of ids){const p=resolve(root,'..',id);if(!process.argv.includes('--concat-only')){execFileSync('node',[resolve(p,'scripts/render.mjs')],{stdio:'inherit'});execFileSync('node',[resolve(p,'scripts/validate.mjs')],{stdio:'inherit'})}execFileSync('ffmpeg',['-v','error','-y','-i',resolve(p,`exports/clip_${id}.mp4`),'-map','0:v','-an','-c:v','copy',resolve(out,`video-${id}.mp4`)]);}
writeFileSync(resolve(out,'concat.txt'),ids.map(s=>`file '${resolve(out,`video-${s}.mp4`)}'`).join('\n'));execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',resolve(out,'concat.txt'),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-ar','48000','-t','110','-movflags','+faststart',resolve(out,'clip_S14-S16.mp4')]);console.log('COMBINED 110 seconds');
