import {execFileSync} from 'node:child_process'
import {mkdir,readFile,writeFile,readdir,lstat,rm,realpath} from 'node:fs/promises'
import {resolve,join,relative,sep} from 'node:path'
import {createHash} from 'node:crypto'
export const BASE='5c189221bb80a6232e20c3902e550f1d867eb97b'
export const PERSONAL='workspaces/chunxiaruo-commits/teaching'
export function safePath(root,path) {
 if(!path||path.includes('\\')||path.startsWith('/')||path.split('/').some(s=>s==='..'||s==='.'||s===''))throw new Error('Unsafe path 路径: '+path)
 const full=resolve(root,path)
 if(!full.startsWith(resolve(root)+sep))throw new Error('Unsafe path')
 return full
}
async function noLinks(root,path) {
 const parts=relative(root,path).split(sep);let current=root
 for(const part of parts){current=join(current,part);try{if((await lstat(current)).isSymbolicLink())throw new Error('symlink 链接不允许: '+current)}catch(e){if(e.code!=='ENOENT')throw e}}
}
async function walk(root,prefix='') {
 const out=[]
 try{for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){const name=prefix?prefix+'/'+entry.name:entry.name;if(entry.isSymbolicLink())throw new Error('symlink 链接不允许: '+name);if(entry.isDirectory())out.push(...await walk(root,name));else if(entry.isFile())out.push(name)}}
 catch(e){if(e.code!=='ENOENT')throw e}
 return out
}
const git=(cwd,args)=>execFileSync('git',args,{cwd,maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']})
const sha=b=>createHash('sha256').update(b).digest('hex')
export async function materializeReview({sourceDir,personalDir,baseSha=BASE}) {
 sourceDir=await realpath(sourceDir);personalDir=resolve(personalDir)
 if(!personalDir.startsWith(sourceDir+sep))throw new Error('Personal path must be inside source')
 const baseline=JSON.parse(await readFile(join(personalDir,'baseline.json'),'utf8'))
 if(baseline.baseSha!==baseSha)throw new Error('baseline 基线不一致')
 git(sourceDir,['cat-file','-e',baseSha+'^{commit}'])
 const overlay=join(personalDir,'overlay'), additions=await walk(overlay)
 const previous=JSON.parse(await readFile(join(personalDir,'integration-manifest.json'),'utf8').catch(()=>'{"files":[]}'))
 for(const f of previous.files)safePath(sourceDir,f.target)
 const appDir=join(personalDir,'.local/review-app'),dataDir=join(personalDir,'.local/data')
 await mkdir(appDir,{recursive:true});await mkdir(dataDir,{recursive:true})
 await noLinks(sourceDir,appDir);await noLinks(sourceDir,dataDir)
 const list=git(sourceDir,['ls-tree','-rz','--full-tree',baseSha]).toString().split('\0').filter(Boolean)
 const written=[]
 for(const line of list){
  const [meta,path]=line.split('\t');const mode=meta.split(' ')[0]
  if(mode==='120000'||mode==='160000')throw new Error('symlink/submodule baseline unsupported')
  const dest=safePath(appDir,path);await noLinks(appDir,dest)
  const content=git(sourceDir,['show',baseSha+':'+path])
  await mkdir(resolve(dest,'..'),{recursive:true});await writeFile(dest,content);written.push(path)
 }
 const manifest=[]
 for(const target of additions){
  const dest=safePath(appDir,target);await noLinks(appDir,dest)
  const content=await readFile(safePath(overlay,target));let original=null
  try{original=git(sourceDir,['show',baseSha+':'+target])}catch{}
  await mkdir(resolve(dest,'..'),{recursive:true});await writeFile(dest,content);written.push(target)
  manifest.push({target,baselineSha256:original?sha(original):null,overlaySha256:sha(content),reason:'教学审核版：个人目录中的待集成副本',approvedForIntegration:false})
 }
 const historyPath=join(personalDir,'.local/generated-files.json')
 const old=JSON.parse(await readFile(historyPath,'utf8').catch(()=>'[]'))
 for(const path of old)if(!written.includes(path)){const dest=safePath(appDir,path);await noLinks(appDir,dest);await rm(dest,{force:true})}
 await writeFile(historyPath,JSON.stringify(written,null,2))
 await writeFile(join(personalDir,'integration-manifest.json'),JSON.stringify({baseSha,files:manifest},null,2)+'\n')
 return{appDir,dataDir}
}
export function scopePaths(sourceDir,baseSha,head='HEAD') {
 return git(sourceDir,['diff','--name-only',baseSha,head]).toString().trim().split('\n').filter(Boolean).filter(p=>!p.startsWith('workspaces/chunxiaruo-commits/'))
}
export function reviewEnv(personalDir) {
 const local=join(personalDir,'.local')
 return {...process.env,npm_config_cache:join(local,'npm-cache'),TMPDIR:join(local,'tmp'),TMP:join(local,'tmp'),TEMP:join(local,'tmp'),DATABASE_URL:'file:'+join(local,'data/review.db'),TEACHING_UPLOAD_ROOT:join(local,'data/uploads'),HOST:'127.0.0.1',PORT:'3002',CORS_ORIGINS:'http://127.0.0.1:5174,http://localhost:5174',VITE_DATA_MODE:'api',VITE_API_BASE_URL:'http://127.0.0.1:3002',CHECKPOINT_DISABLE:'1'}
}

