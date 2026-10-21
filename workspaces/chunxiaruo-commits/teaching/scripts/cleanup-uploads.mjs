import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {resolve,join} from 'node:path'
import {reviewEnv} from './review-lib.mjs'
const personalDir=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),server=join(personalDir,'.local/review-app/server')
const require=createRequire(join(server,'package.json'))
const result=spawnSync(process.execPath,['--import',require.resolve('tsx'),join(server,'src/teaching/cleanup-cli.ts')],{cwd:server,env:reviewEnv(personalDir),stdio:'inherit'})
if(result.error)throw result.error;process.exitCode=result.status??1

