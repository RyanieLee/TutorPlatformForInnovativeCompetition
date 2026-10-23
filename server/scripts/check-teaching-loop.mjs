import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomBytes} from 'node:crypto'
import {createServer} from 'node:net'
import {spawn,spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),directory=mkdtempSync(join(tmpdir(),'teaching-loop-http-'))
const env={...process.env,AI_CONFIG_FILE:join(directory,'provider.enc'),AI_CONFIG_ENCRYPTION_KEY:'',MATCH_MODEL_BASE_URL:'',MATCH_MODEL_NAME:'',MATCH_MODEL_API_KEY:'',HOMEWORK_MODEL_BASE_URL:'',HOMEWORK_MODEL_NAME:'',HOMEWORK_MODEL_API_KEY:'',NODE_ENV:'development',DATABASE_URL:'file:'+join(directory,'demo.db'),SEED_PARENT_PASSWORD:randomBytes(24).toString('hex'),SEED_TUTOR_PASSWORD:randomBytes(24).toString('hex'),SEED_ADMIN_PASSWORD:randomBytes(24).toString('hex')}
let server,origin
function run(task){const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',task],{env,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(task+' failed: '+result.stderr.slice(-1500))}
async function stop(){if(!server||server.exitCode!==null)return;const child=server;await new Promise(resolve=>{const timeout=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('exit',()=>{clearTimeout(timeout);resolve()});child.kill('SIGTERM')});server=undefined}
async function start(){server=spawn(process.execPath,['dist/src/main.js'],{env:{...env,PORT:origin.split(':').slice(-1)[0],HOST:'127.0.0.1'},stdio:'ignore'});for(let i=0;i<200;i++){if(server.exitCode!==null)throw new Error('API exited');try{if((await fetch(origin+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('API health timeout')}
async function request(method,path,body,token){const response=await fetch(origin+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});assert.equal(response.status,200,method+' '+path);return(await response.json()).data}
const login=role=>request('POST','/api/auth/login',{loginId:'demo.'+role,password:env['SEED_'+role.toUpperCase()+'_PASSWORD']})
try{
 run('db:init');run('build')
 const port=await new Promise(resolve=>{const listener=createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port))})});origin='http://127.0.0.1:'+port
 await start();const parent=await login('parent'),tutor=await login('tutor'),profile=await request('GET','/api/tutors/me',undefined,tutor.token)
 const order=await request('POST','/api/bookings',{tutorId:profile.id,studentName:'虚构匿名课程案例',subject:'数学',expectedTime:'演示时间'},parent.token)
 await request('POST','/api/bookings/'+order.id+'/accept',{},tutor.token)
 const path='/api/bookings/'+order.id+'/teaching-loop';let state=await request('GET',path,undefined,tutor.token),serial=0
 const command=async(type,payload={})=>{const body={requestId:'http-loop-'+(++serial),expectedRevision:state.revision,type,payload};state=await request('POST',path,body,tutor.token);const retry=await request('POST',path,body,tutor.token);assert.equal(retry.revision,state.revision);return state}
 await command('initialize');assert.equal((await request('GET',path,undefined,parent.token)).plan,null)
 await command('publish')
 await command('record',{planVersion:1,lessonId:'L2',date:'2026-10-22',completed:'合并同类项与移项，5道练习',goalMet:'部分达成',results:[1,2,3,4,5].map(n=>({questionId:'L2-Q'+n,correct:n<=3})),errorTypes:['移项符号'],observation:'Q4/Q5在负号与移项出现符号错误',questions:'负系数如何变形',consolidation:'带负号移项'})
 const {makePresetFeedback,makePresetRevision}=require('../dist/src/teaching-loop/engine.js')
 const record=state.records[0];await command('feedback',{recordId:record.id,feedback:makePresetFeedback(state,record.id,new Date().toISOString())});assert.equal((await request('GET',path,undefined,parent.token)).feedbacks.length,0)
 await command('publishFeedback',{feedbackId:state.feedbacks[0].id});await command('suggest',{suggestion:makePresetRevision(state,new Date().toISOString())});await command('applyRevision',{suggestionId:state.suggestions[0].id})
 assert.equal((await request('GET',path,undefined,parent.token)).plan.version,1)
 await command('publish');assert.equal(state.versions.length,2);const feedbackId=state.feedbacks[0].id
 await stop();run('db:init');await start()
 const restored=await login('parent'),view=await request('GET',path,undefined,restored.token)
 assert.equal(view.plan.version,2);assert.equal(view.versions.length,2);assert.equal(view.feedbacks[0].id,feedbackId);assert.equal(view.feedbacks[0].percent,60);assert.equal(view.plan.course.lessons[2].blocks.reduce((n,b)=>n+b.minutes,0),45);assert.equal('draft'in view,false)
 console.log('教学HTTP重启验收通过：四课发布、3/5证据反馈、第三课v2、幂等重试、草稿隔离、同一数据库重复初始化及新API进程读取。')
}finally{await stop();rmSync(directory,{recursive:true,force:true})}
