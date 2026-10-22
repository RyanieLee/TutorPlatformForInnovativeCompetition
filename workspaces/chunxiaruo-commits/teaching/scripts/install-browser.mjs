import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {resolve,join} from 'node:path'
import {reviewEnv} from './review-lib.mjs'
const personal=resolve(fileURLToPath(new URL('.',import.meta.url)),'..')
const result=spawnSync(process.execPath,[join(personal,'.local/review-app/node_modules/@playwright/test/cli.js'),'install','chromium'],{env:{...reviewEnv(personal),PLAYWRIGHT_BROWSERS_PATH:join(personal,'.local/browsers')},stdio:'inherit'})
if(result.error)throw result.error
process.exitCode=result.status??1
