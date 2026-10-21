import 'dotenv/config'
import { buildApp } from './app'
if(process.env.NODE_ENV==='production')throw new Error('V0.4 SQLite 服务仅用于开发与演示，请先完成生产部署评审')
const app=buildApp()
const port=Number(process.env.PORT||3001)
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须为 1–65535 的整数')
let closing=false
async function close(){if(closing)return;closing=true;try{await app.close()}catch(error){app.log.error(error);process.exitCode=1}}
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void close()})
app.listen({host:process.env.HOST||'127.0.0.1',port}).catch(async error=>{app.log.error(error);process.exitCode=1;await close()})
