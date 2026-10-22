import {fileURLToPath} from 'node:url'
import {materializeReview,BASE} from './review-lib.mjs'
import {resolve} from 'node:path'
const personalDir=resolve(fileURLToPath(new URL('.',import.meta.url)),'..'),sourceDir=resolve(personalDir,'../../..')
const out=await materializeReview({sourceDir,personalDir,baseSha:BASE})
console.log(JSON.stringify(out))

