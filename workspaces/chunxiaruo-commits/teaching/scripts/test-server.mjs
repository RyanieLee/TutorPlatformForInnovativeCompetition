import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {materializeReview,reviewEnv,BASE} from './review-lib.mjs'
const personalDir=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),sourceDir=resolve(personalDir,'../../..')
const {appDir}=await materializeReview({sourceDir,personalDir,baseSha:BASE})
const tempRoot=join(personalDir,'.local/test-runs');await mkdir(tempRoot,{recursive:true})
const temp=await mkdtemp(join(tempRoot,'api-')),cwd=join(appDir,'server')
const env={...reviewEnv(personalDir),NODE_ENV:'test',CORS_ORIGINS:'http://localhost:5173,http://127.0.0.1:5173',DATABASE_URL:'file:'+join(temp,'test.db'),TEACHING_UPLOAD_ROOT:join(temp,'uploads')}
await mkdir(env.TEACHING_UPLOAD_ROOT,{recursive:true})
await writeFile(join(temp,'test.db'),'')
function run(args){const r=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error('Test command failed: '+args.join(' '))}
try{run(['node_modules/prisma/build/index.js','generate']);run(['node_modules/prisma/build/index.js','migrate','deploy']);run(['node_modules/vitest/vitest.mjs','run',...process.argv.slice(2)])}
finally{await rm(temp,{recursive:true,force:true})}

