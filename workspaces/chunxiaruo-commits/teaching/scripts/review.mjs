import {fileURLToPath} from 'node:url'
import {spawn,spawnSync} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {materializeReview,reviewEnv,BASE} from './review-lib.mjs'
const personalDir=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),sourceDir=resolve(personalDir,'../../..')
const env=reviewEnv(personalDir)
await mkdir(env.TMPDIR,{recursive:true});await mkdir(env.TEACHING_UPLOAD_ROOT,{recursive:true})
function run(cmd,args,cwd){const r=spawnSync(cmd,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(cmd+' failed: '+r.status)}
const action=process.argv[2]||'help'
if(action==='setup'){
 const {appDir}=await materializeReview({sourceDir,personalDir,baseSha:BASE})
 run('npm',['ci'],appDir);run('npm',['ci'],join(appDir,'server'))
 run('npm',['run','db:generate'],join(appDir,'server'));run('npm',['run','db:migrate'],join(appDir,'server'))
 for(const key of ['SEED_PARENT_PASSWORD','SEED_TUTOR_PASSWORD','SEED_ADMIN_PASSWORD'])if(!env[key]||env[key].length<12)throw new Error('请在本地环境配置至少12位的 '+key)
 run('npm',['run','db:seed'],join(appDir,'server'))
}else if(action==='serve'){
 const appDir=join(personalDir,'.local/review-app')
 const api=spawn('npm',['run','dev'],{cwd:join(appDir,'server'),env,stdio:'inherit'})
 const web=spawn('npm',['run','dev:h5','--','--host','127.0.0.1','--port','5174','--strictPort'],{cwd:appDir,env,stdio:'inherit'})
 const stop=()=>{api.kill('SIGTERM');web.kill('SIGTERM')}
 process.on('SIGINT',stop);process.on('SIGTERM',stop)
 for(const child of [api,web])child.on('exit',code=>{if(code&&code!==0){process.exitCode=code;stop()}})
}else if(action==='verify')run(process.execPath,[join(fileURLToPath(new URL('.',import.meta.url)),'verify.mjs')],sourceDir)
else if(action==='clean-temp')run(process.execPath,[join(fileURLToPath(new URL('.',import.meta.url)),'cleanup-uploads.mjs')],sourceDir)
else console.log('用法：node '+join(fileURLToPath(new URL('.',import.meta.url)),'review.mjs')+' setup|serve|verify|clean-temp')

