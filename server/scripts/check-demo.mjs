import { mkdtempSync, rmSync, existsSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
const directory=mkdtempSync(join(tmpdir(),'tutor-demo-check-'))
const database=join(directory,'demo.db')
const env={...process.env,AI_CONFIG_FILE:join(directory,'provider.enc'),AI_CONFIG_ENCRYPTION_KEY:'',MATCH_MODEL_BASE_URL:'',MATCH_MODEL_NAME:'',MATCH_MODEL_API_KEY:'',HOMEWORK_MODEL_BASE_URL:'',HOMEWORK_MODEL_NAME:'',HOMEWORK_MODEL_API_KEY:'',NODE_ENV:'development',DATABASE_URL:'file:'+database,SEED_PARENT_PASSWORD:randomBytes(24).toString('hex'),SEED_TUTOR_PASSWORD:randomBytes(24).toString('hex'),SEED_ADMIN_PASSWORD:randomBytes(24).toString('hex')}
const npm=process.env.npm_execpath
let server
const run=(task,environment=env,args=[])=>spawnSync(process.execPath,[npm,'run',task,...(args.length?['--',...args]:[])],{env:environment,encoding:'utf8'})
function successful(task,args=[]){const result=run(task,env,args);if(result.error)throw result.error;if(result.status!==0)throw new Error(task+' failed: '+result.stdout.slice(-1800)+'\n'+result.stderr.slice(-1800))}
async function stop(){
 if(!server || server.exitCode!==null)return
 const child=server
 await new Promise(resolve=>{const timer=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('exit',()=>{clearTimeout(timer);resolve()});child.kill('SIGTERM')})
 server=undefined
}
try {
 // Exercise setup in an isolated directory; never overwrite the user's .env.
 copyFileSync('.env.example',join(directory,'.env.example'))
 const setup=()=>spawnSync(process.execPath,[resolve('scripts/setup-demo.mjs')],{cwd:directory,env:{...process.env,NODE_ENV:'development'},encoding:'utf8'})
 assert.equal(setup().status,0)
 const setupContent=readFileSync(join(directory,'.env'),'utf8')
 const passwords=setupContent.match(/^SEED_\w+_PASSWORD=(.+)$/gm)
 assert.equal(passwords?.length,3)
 assert.equal(new Set(passwords.map(line=>line.split('=')[1])).size,3)
 assert.equal(setup().status,0)
 assert.equal(readFileSync(join(directory,'.env'),'utf8'),setupContent)
 assert.notEqual(run('db:init',{...env,NODE_ENV:'production'}).status,0)
 assert.equal(existsSync(database),false,'production preflight must not create a database')
 assert.notEqual(run('db:init',{...env,SEED_PARENT_PASSWORD:''}).status,0)
 assert.equal(existsSync(database),false,'missing password preflight must not create a database')
 successful('db:init');successful('build')
 const port=await new Promise(resolve=>{const listener=createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port))})})
 const origin='http://127.0.0.1:'+port
 async function start(databaseUrl=env.DATABASE_URL,serve=false){
  let output=''
  server=spawn(process.execPath,[serve?'scripts/serve-demo.mjs':'dist/src/main.js'],{env:{...env,DATABASE_URL:databaseUrl,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']})
  server.stdout.on('data',chunk=>{output=(output+chunk).slice(-4000)})
  server.stderr.on('data',chunk=>{output=(output+chunk).slice(-4000)})
  for(let i=0;i<200;i++){
   if(server.exitCode!==null)throw new Error('API exited before readiness: '+output)
   try{const response=await fetch(origin+'/health');if(response.ok)return}catch{}
   await new Promise(resolve=>setTimeout(resolve,150))
  }
  throw new Error('API health probe timed out: '+output)
 }
 async function request(method,path,body,token){
  const response=await fetch(origin+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000)})
  assert.equal(response.status,200,method+' '+path)
  return (await response.json()).data
 }
 const login=role=>request('POST','/api/auth/login',{loginId:'demo.'+role,password:env['SEED_'+role.toUpperCase()+'_PASSWORD']})
 await start()
 const parent=await login('parent'),tutor=await login('tutor'),admin=await login('admin')
 const teachers=[await request('GET','/api/tutors/me',undefined,tutor.token)]
 const initialOverview=await request('GET','/api/admin/overview',undefined,admin.token)
 assert.equal(initialOverview.tutors.published,24,'fresh demo includes all 24 profiles')
 const bookingInput={tutorId:teachers[0].id,studentName:'虚构重启同学',subject:'数学',expectedTime:'周末（演示）',requestId:'demo-check-'+randomBytes(12).toString('hex')}
 const order=await request('POST','/api/bookings',bookingInput,parent.token)
 assert.equal((await request('POST','/api/bookings',bookingInput,parent.token)).id,order.id,'retry must not create another booking')
 await request('POST','/api/bookings/'+order.id+'/accept',{},tutor.token)
 await request('POST','/api/bookings/'+order.id+'/complete',{},tutor.token)
 const profile={displayName:'虚构重审家教',university:'示例大学',major:'数学',subjects:['数学'],teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'此资料仅用于本机自动化演示验收。',availability:'周末'}
 await request('PUT','/api/tutor-applications/draft',profile,tutor.token)
 assert.ok(!(await request('GET','/api/tutors?pageSize=50')).some(item=>item.id===teachers[0].id),'draft must withdraw only the edited profile')
 const application=await request('POST','/api/tutor-applications',profile,tutor.token)
 await request('POST',`/api/admin/tutor-applications/${application.id}/review`,{decision:'rejected',reason:'虚构演示：请补充资料'},admin.token)
 assert.equal((await request('GET','/api/tutor-applications/mine',undefined,tutor.token)).rejectionReason,'虚构演示：请补充资料')
 await request('POST','/api/tutor-applications',profile,tutor.token)
 await request('POST',`/api/admin/tutor-applications/${application.id}/review`,{decision:'approved'},admin.token)
 const report=await request('POST','/api/reports',{tutorId:teachers[0].id,reason:'其他',description:'虚构验收举报'},parent.token)
 await request('POST',`/api/admin/reports/${report.id}/resolve`,{},admin.token)
 const overview=await request('GET','/api/admin/overview',undefined,admin.token)
 assert.equal(overview.bookings.completed,1)
 assert.equal(overview.applications.approved,24)
 assert.equal(overview.reports.resolved,1)
 assert.equal(overview.tutors.published,24)
 assert.equal((await request('GET','/api/bookings/mine?status=completed&pageSize=1',undefined,parent.token))[0].id,order.id)
 assert.equal((await fetch(origin+'/api/admin/overview',{headers:{authorization:'Bearer '+parent.token}})).status,403)
 function inspect(action,databasePath,expectedCount=''){
  const result=spawnSync(process.execPath,['scripts/inspect-demo.mjs',action,databasePath,join(directory,'snapshot.db'),parent.user.id,order.id,String(expectedCount)],{env,encoding:'utf8'})
  if(result.error)throw result.error
  assert.equal(result.status,0,result.stderr)
  return JSON.parse(result.stdout.trim())
 }
 const {auditCount}=inspect('backup',database)
 await stop()
 // Repeat initialization against the same database, then start a fresh API process.
 successful('db:init')
 await start()
 const restored=await login('parent')
 const orders=await request('GET','/api/bookings/mine',undefined,restored.token)
 assert.equal(orders.find(item=>item.id===order.id)?.status,'completed')
 assert.ok((await request('GET','/api/tutors?pageSize=50')).some(item=>item.id===teachers[0].id))
 const reinitialized=await login('admin')
 assert.equal((await request('GET','/api/admin/overview',undefined,reinitialized.token)).tutors.published,24,'reinitialization never duplicates catalog')
 const restoredAdmin=await login('admin')
 assert.equal((await request('GET','/api/admin/reports?status=resolved',undefined,restoredAdmin.token))[0].id,report.id)
 await stop()
 // Restore into another fresh path, leaving the original database and .env untouched.
 const restoredDatabase=join(directory,'restored.db')
 copyFileSync(join(directory,'snapshot.db'),restoredDatabase)
 inspect('restore',restoredDatabase,auditCount)
 await start('file:'+restoredDatabase,true)
 const backupParent=await login('parent'),backupAdmin=await login('admin')
 assert.equal((await request('GET','/api/bookings/'+order.id,undefined,backupParent.token)).status,'completed')
 assert.equal((await request('GET','/api/admin/overview',undefined,backupAdmin.token)).reports.resolved,1)
 console.log('演示验收通过：初始化保护、预约去重/完成、资料撤回/驳回重提/批准、举报处理、权限/统计、重启持久化、WAL快照及备份恢复、demo:serve实际启动。')
} finally {
 await stop()
 rmSync(directory,{recursive:true,force:true})
}
