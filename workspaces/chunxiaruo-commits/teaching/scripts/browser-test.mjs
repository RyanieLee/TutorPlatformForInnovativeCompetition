import {fileURLToPath} from 'node:url'
import {spawn,spawnSync} from 'node:child_process'
import {openSync,closeSync} from 'node:fs'
import {mkdir} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
import {resolve,join} from 'node:path'
import {createRequire} from 'node:module'
import {materializeReview,reviewEnv,BASE} from './review-lib.mjs'
const personalDir=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),sourceDir=resolve(personalDir,'../../..')
const {appDir}=await materializeReview({sourceDir,personalDir,baseSha:BASE}),server=join(appDir,'server')
const env={...reviewEnv(personalDir),NODE_PATH:join(appDir,'node_modules'),PLAYWRIGHT_BROWSERS_PATH:join(personalDir,'.local/browsers')}
for(const key of ['SEED_PARENT_PASSWORD','SEED_TUTOR_PASSWORD','SEED_ADMIN_PASSWORD'])env[key]=randomBytes(24).toString('hex')
await mkdir(env.TMPDIR,{recursive:true})
function run(args,cwd=server){const r=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error('Browser command failed: '+r.status)}
run(['node_modules/prisma/build/index.js','generate']);run(['node_modules/prisma/build/index.js','migrate','deploy']);run(['--import','tsx','prisma/seed.ts'])
const targets=process.argv.slice(2).length?process.argv.slice(2):['teaching-ui.spec.ts','teaching-e2e.spec.ts']
if(targets.some(target=>!/^teaching-[\w-]+\.spec\.ts$/.test(target)))throw new Error('请传入单个或多个 teaching-*.spec.ts 文件名')
for(const target of targets){
const apiLog=openSync(join(personalDir,'.local/browser-api.log'),'w'),webLog=openSync(join(personalDir,'.local/browser-web.log'),'w')
const req=createRequire(join(server,'package.json'))
const api=spawn(process.execPath,['--import',req.resolve('tsx'),'src/main.ts'],{cwd:server,env,stdio:['ignore',apiLog,apiLog],detached:true})
const web=spawn(process.execPath,[join(appDir,'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js'),'--host','127.0.0.1','--port','5174','--strictPort'],{cwd:appDir,env,stdio:['ignore',webLog,webLog],detached:true})
env.BROWSER_API_PID=String(api.pid);env.TEACHING_REVIEW_SERVER=server
async function ready(url){const until=Date.now()+45000;while(Date.now()<until){try{const r=await fetch(url);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw new Error('审核服务启动超时: '+url)}
try{
 await ready('http://127.0.0.1:3002/health');await ready('http://127.0.0.1:5174')
 run([join(appDir,'node_modules/@playwright/test/cli.js'),'test','--config',join(personalDir,'playwright.config.ts'),target],sourceDir)
}finally{
 for(const child of [api,web]){try{process.kill(-child.pid,'SIGTERM')}catch{}}
 await Promise.all([api,web].map(child=>child.exitCode!==null||child.signalCode!==null?Promise.resolve():new Promise(resolve=>{const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{}resolve(null)},3000);child.once('exit',()=>{clearTimeout(timer);resolve(null)})})))
 closeSync(apiLog);closeSync(webLog)
}
}

