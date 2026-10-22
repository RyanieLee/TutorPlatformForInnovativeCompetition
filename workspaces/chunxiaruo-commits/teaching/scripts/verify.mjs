import {fileURLToPath} from 'node:url'
import {spawnSync,execFileSync} from 'node:child_process'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {materializeReview,reviewEnv,BASE} from './review-lib.mjs'
const personal=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),source=resolve(personal,'../../..'),local=join(personal,'.local'),logs=join(local,'verification')
await mkdir(logs,{recursive:true})
const {appDir}=await materializeReview({sourceDir:source,personalDir:personal,baseSha:BASE}),env=reviewEnv(personal)
const results=[]
function run(label,cmd,args,cwd=source,extra={}){
 const log=join(logs,label+'.log'),fd=openSync(log,'w'),start=new Date().toISOString()
 const result=spawnSync(cmd,args,{cwd,env:{...env,...extra},stdio:['ignore',fd,fd]});closeSync(fd)
 results.push({label,command:[cmd,...args].join(' '),startedAt:start,exitCode:result.status,log:'.local/verification/'+label+'.log'})
 if(result.error||result.status!==0){console.error(label+' failed; see '+log);if(result.error)throw result.error;throw new Error(label+' failed')}
 console.log(label+': PASS')
}
run('isolation',process.execPath,['--test',join(personal,'tests/review-isolation.test.mjs')])
run('backend-tests',process.execPath,[join(personal,'scripts/test-server.mjs')])
run('frontend-tests','npm',['test'],appDir)
run('existing-b-workflows','npm',['run','test:workflows'],appDir)
run('existing-b-types','npm',['run','typecheck:workflows'],appDir)
run('frontend-types','npm',['run','typecheck'],appDir)
run('backend-build','npm',['run','build'],join(appDir,'server'))
run('h5-build','npm',['run','build:h5'],appDir)
run('wechat-build','npm',['run','build:mp-weixin'],appDir)
run('browser-flow',process.execPath,[join(personal,'scripts/browser-test.mjs')])
await materializeReview({sourceDir:source,personalDir:personal,baseSha:BASE})
const evidence=JSON.parse(await readFile(join(local,'persistence-evidence.json'),'utf8'))
const require=createRequire(join(appDir,'server/package.json')), {PrismaClient}=require('@prisma/client')
const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}})
try{
 const file=await db.teachingAttachment.findUniqueOrThrow({where:{id:evidence.fileId}})
 const bytes=await readFile(join(env.TEACHING_UPLOAD_ROOT,file.storageKey))
 const hash=createHash('sha256').update(bytes).digest('hex')
 const latest=await db.homeworkSubmission.findFirstOrThrow({where:{lessonId:evidence.lessonId},orderBy:{revision:'desc'}})
 if(hash!==evidence.sha256||latest.revision!==2)throw new Error('Regeneration lost persistent submission data')
 console.log('regeneration-persistence: PASS')
}finally{await db.$disconnect()}
const changes=execFileSync('git',['diff','--name-only',BASE],{cwd:source,encoding:'utf8'}).trim().split('\n').filter(Boolean)
if(changes.some(path=>!path.startsWith('workspaces/chunxiaruo-commits/')))throw new Error('Files changed outside personal directory')
const staged=execFileSync('git',['ls-files','workspaces/chunxiaruo-commits/teaching'],{cwd:source,encoding:'utf8'}).trim().split('\n')
if(staged.some(path=>/\/(?:node_modules|\.local)\//.test(path)||/\/\.env(?:$|\.)/.test(path)))throw new Error('Private runtime file was tracked')
await mkdir(join(personal,'docs'),{recursive:true})
await writeFile(join(personal,'docs/validation-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),baseSha:BASE,checks:results,persistence:true,personalDirectoryOnly:true},null,2)+'\n')
console.log('scope-and-artifacts: PASS')

