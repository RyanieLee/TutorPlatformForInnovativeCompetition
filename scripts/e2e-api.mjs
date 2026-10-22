import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
if (!process.env.E2E_PASSWORD) throw new Error('请使用 npm run test:e2e 启动临时测试服务')
const directory=mkdtempSync(join(tmpdir(),'tutor-e2e-'))
const env={...process.env,NODE_ENV:'development',DATABASE_URL:'file:'+join(directory,'test.db'),TUTOR_PHOTO_ROOT:join(directory,'photos'),PORT:process.env.PORT||'3001',CORS_ORIGINS:process.env.CORS_ORIGINS||'http://127.0.0.1:5174',SEED_PARENT_PASSWORD:process.env.E2E_PASSWORD,SEED_TUTOR_PASSWORD:process.env.E2E_PASSWORD,SEED_ADMIN_PASSWORD:process.env.E2E_PASSWORD}
for(const args of [['run','db:migrate'],['run','db:seed']]) {
  const result=spawnSync('npm',args,{cwd:'server',env,stdio:'inherit'})
  if(result.status!==0){rmSync(directory,{recursive:true,force:true});process.exit(result.status||1)}
}
const mapFixture=spawnSync(process.execPath,['scripts/seed-map-e2e.mjs'],{cwd:'server',env,stdio:'inherit'})
if(mapFixture.status!==0){rmSync(directory,{recursive:true,force:true});process.exit(mapFixture.status||1)}
const child=spawn(process.execPath,['--import','tsx','src/main.ts'],{cwd:'server',env,stdio:'inherit'})
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal))
child.on('exit',code=>{rmSync(directory,{recursive:true,force:true});process.exit(code||0)})
