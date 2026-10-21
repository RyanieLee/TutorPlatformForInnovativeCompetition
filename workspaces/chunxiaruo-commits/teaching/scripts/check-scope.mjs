import {fileURLToPath} from 'node:url'
import {scopePaths,BASE} from './review-lib.mjs'
import {resolve} from 'node:path'
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../../../..')
const invalid=scopePaths(root,BASE)
if(invalid.length){console.error('越界改动: '+invalid.join(', '));process.exitCode=1}else console.log('目录检查通过：所有提交差异均在个人目录。')

