import 'dotenv/config'
import { spawn, spawnSync } from 'node:child_process'
if(process.env.NODE_ENV==='production')throw new Error('此命令仅启动开发演示服务，不允许 production')
for(const task of ['db:init','build']) {
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',task],{stdio:'inherit',env:process.env})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status||1)
}
const child=spawn(process.execPath,['dist/src/main.js'],{stdio:'inherit',env:process.env})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
child.on('exit',code=>{process.exitCode=code||0})
