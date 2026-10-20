import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
const directory=mkdtempSync(join(tmpdir(),'tutor-demo-check-'))
const database=join(directory,'demo.db')
const env={...process.env,NODE_ENV:'development',DATABASE_URL:'file:'+database,SEED_PARENT_PASSWORD:randomBytes(24).toString('hex'),SEED_TUTOR_PASSWORD:randomBytes(24).toString('hex'),SEED_ADMIN_PASSWORD:randomBytes(24).toString('hex')}
const npm=process.env.npm_execpath
let server
const run=(task,environment=env)=>spawnSync(process.execPath,[npm,'run',task],{env:environment,encoding:'utf8'})
function successful(task){const result=run(task);if(result.status!==0)throw new Error(task+' failed: '+result.stderr.slice(-1800))}
async function stop(){
 if(!server || server.exitCode!==null)return
 const child=server
 await new Promise(resolve=>{const timer=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('exit',()=>{clearTimeout(timer);resolve()});child.kill('SIGTERM')})
 server=undefined
}
try {
 assert.notEqual(run('db:init',{...env,NODE_ENV:'production'}).status,0)
 assert.equal(existsSync(database),false,'production preflight must not create a database')
 assert.notEqual(run('db:init',{...env,SEED_PARENT_PASSWORD:''}).status,0)
 assert.equal(existsSync(database),false,'missing password preflight must not create a database')
 successful('db:init');successful('build')
 const port=await new Promise(resolve=>{const listener=createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port))})})
 const origin='http://127.0.0.1:'+port
 async function start(){
  server=spawn(process.execPath,['dist/src/main.js'],{env:{...env,PORT:String(port)},stdio:'ignore'})
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)throw new Error('API exited before readiness')
   try{const response=await fetch(origin+'/health');if(response.ok)return}catch{}
   await new Promise(resolve=>setTimeout(resolve,150))
  }
  throw new Error('API health probe timed out')
 }
 async function request(method,path,body,token){
  const response=await fetch(origin+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})})
  assert.equal(response.status,200,method+' '+path)
  return (await response.json()).data
 }
 const login=role=>request('POST','/api/auth/login',{loginId:'demo.'+role,password:env['SEED_'+role.toUpperCase()+'_PASSWORD']})
 await start()
 const parent=await login('parent'),tutor=await login('tutor')
 const teachers=await request('GET','/api/tutors')
 const order=await request('POST','/api/bookings',{tutorId:teachers[0].id,studentName:'虚构重启同学',subject:'数学',expectedTime:'周末（演示）',requestId:'demo-check-'+randomBytes(12).toString('hex')},parent.token)
 await request('POST','/api/bookings/'+order.id+'/accept',{},tutor.token)
 await request('POST','/api/bookings/'+order.id+'/complete',{},tutor.token)
 await stop()
 // Repeat initialization against the same database, then start a fresh API process.
 successful('db:init')
 await start()
 const restored=await login('parent')
 const orders=await request('GET','/api/bookings/mine',undefined,restored.token)
 assert.equal(orders.find(item=>item.id===order.id)?.status,'completed')
 assert.equal((await request('GET','/api/tutors'))[0].id,teachers[0].id)
 console.log('演示部署检查通过：初始化前置保护、重复初始化、健康检查、预约完成和进程重启后数据持久化。')
} finally {
 await stop()
 rmSync(directory,{recursive:true,force:true})
}
