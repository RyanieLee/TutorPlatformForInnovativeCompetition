import {execFileSync} from 'node:child_process'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
for(const id of ['S05','S06','S07'])execFileSync(process.execPath,[resolve(root,'..',id,'scripts/capture.mjs')],{stdio:'inherit'})
