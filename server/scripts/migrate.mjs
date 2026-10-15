import 'dotenv/config'
import { closeSync, existsSync, openSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const url=process.env.DATABASE_URL
if(!url?.startsWith('file:'))throw new Error('请配置 SQLite DATABASE_URL，例如 file:./dev.db')
const path=url.slice(5)
const full=path.startsWith('/')?path:resolve('prisma',path)
if(!existsSync(full))closeSync(openSync(full,'w'))
const result=spawnSync('npx',['prisma','migrate','deploy'],{stdio:'inherit',env:process.env,shell:process.platform==='win32'})
if(result.status!==0)process.exit(result.status||1)
