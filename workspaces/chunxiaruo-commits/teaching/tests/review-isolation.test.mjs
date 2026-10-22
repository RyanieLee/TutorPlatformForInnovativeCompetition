import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, readFile, symlink, rm} from 'node:fs/promises'
import {resolve, join} from 'node:path'
import {execFileSync} from 'node:child_process'
const dir=resolve(fileURLToPath(new URL('.',import.meta.url)),'../.local/isolation-tests')
await mkdir(dir,{recursive:true})
async function fixture() {
 const root=await mkdtemp(join(dir,'case-')), source=join(root,'source'), personal=join(source,'workspaces/chunxiaruo-commits/teaching')
 await mkdir(personal,{recursive:true});await writeFile(join(source,'package.json'),'{"name":"fixture"}')
 execFileSync('git',['init','-q'],{cwd:source});execFileSync('git',['add','.'],{cwd:source})
 execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','baseline'],{cwd:source})
 const baseSha=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()
 await mkdir(join(personal,'overlay/src'),{recursive:true});await writeFile(join(personal,'overlay/src/new.ts'),'export const value=1')
 await writeFile(join(personal,'baseline.json'),JSON.stringify({baseSha}))
 return{root,sourceDir:source,personalDir:personal,baseSha}
}
const {materializeReview}=await import('../scripts/review-lib.mjs').catch(()=>({materializeReview:async()=>assert.fail('materializeReview not implemented')}))
test('fixed snapshot and overlay are generated without changing source',async()=>{
 const f=await fixture();try{const out=await materializeReview(f);assert.equal(await readFile(join(out.appDir,'src/new.ts'),'utf8'),'export const value=1');assert.equal(await readFile(join(f.sourceDir,'package.json'),'utf8'),'{"name":"fixture"}')}finally{await rm(f.root,{recursive:true,force:true})}
})
test('rejects baseline mismatch',async()=>{const f=await fixture();try{await assert.rejects(()=>materializeReview({...f,baseSha:'0'.repeat(40)}),/baseline|基线|revision/i)}finally{await rm(f.root,{recursive:true,force:true})}})
test('rejects symlinks in overlay',async()=>{const f=await fixture();try{await symlink('/etc/passwd',join(f.personalDir,'overlay/src/leak'));await assert.rejects(()=>materializeReview(f),/symlink|链接/i)}finally{await rm(f.root,{recursive:true,force:true})}})
test('rejects manifest traversal',async()=>{const f=await fixture();try{await writeFile(join(f.personalDir,'integration-manifest.json'),JSON.stringify({files:[{target:'../escape'}]}));await assert.rejects(()=>materializeReview(f),/path|路径/i)}finally{await rm(f.root,{recursive:true,force:true})}})
test('rematerialize preserves persistent data and dependencies',async()=>{
 const f=await fixture();try{const first=await materializeReview(f);await writeFile(join(first.dataDir,'keep.db'),'db-bytes');await mkdir(join(first.appDir,'node_modules'),{recursive:true});await writeFile(join(first.appDir,'node_modules/keep'),'deps');const again=await materializeReview(f);assert.equal(await readFile(join(again.dataDir,'keep.db'),'utf8'),'db-bytes');assert.equal(await readFile(join(again.appDir,'node_modules/keep'),'utf8'),'deps')}finally{await rm(f.root,{recursive:true,force:true})}
})
