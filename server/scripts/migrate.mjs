import 'dotenv/config'
import { closeSync, existsSync, openSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const url=process.env.DATABASE_URL
if(!url?.startsWith('file:'))throw new Error('请配置 SQLite DATABASE_URL，例如 file:./dev.db')
const path=url.slice(5)
const full=isAbsolute(path)?path:resolve('prisma',path)
if(!existsSync(full))closeSync(openSync(full,'w'))
const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy'],{stdio:'inherit',env:process.env})
if(result.error)throw result.error
if(result.status!==0)process.exit(result.status||1)
