import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
// 多个隔离 API 实例共用同一份生成客户端，启动前只生成一次。
const generated = spawnSync(process.execPath, [require.resolve('prisma/build/index.js',{paths:[process.cwd()+'/server']}), 'generate'], {cwd:'server',stdio:'inherit'})
if(generated.error)throw generated.error
if (generated.status !== 0) process.exit(generated.status ?? 1)
// Only the ephemeral local test database receives this password; never print it.
const args=process.argv.slice(2)
const suites=args.includes('--config')?[args]:[args,[...args,'--config','playwright.teaching.config.ts']]
function next(){
 const suite=suites.shift();if(!suite)return
 const filtered=args.some(a=>a==='--grep'||a==='-g'||a==='--grep-invert')
 const child=spawn(process.execPath,[require.resolve('@playwright/test/cli'),'test',...suite,...(filtered?['--pass-with-no-tests']:[])],{stdio:'inherit',env:{...process.env,E2E_PASSWORD:randomBytes(24).toString('hex')}})
 child.on('error',error=>{console.error(error);process.exitCode=1})
 child.on('exit',code=>{if(code!==0){process.exitCode=code??1;return}next()})
}
next()
