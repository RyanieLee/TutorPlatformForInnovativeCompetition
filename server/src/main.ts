import 'dotenv/config'
import { buildApp } from './app'
if(process.env.NODE_ENV==='production')throw new Error('V0.4 SQLite 服务仅用于开发与演示，请先完成生产部署评审')
const app=buildApp()
app.listen({host:'0.0.0.0',port:Number(process.env.PORT||3001)}).catch(error=>{app.log.error(error);process.exitCode=1})
