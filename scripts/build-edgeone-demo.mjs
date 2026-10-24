import {spawnSync} from 'node:child_process'
import {mkdirSync,cpSync,readdirSync,existsSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {resolveNpmCli} from './npm-runtime.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url)
const result=spawnSync(process.execPath,[resolveNpmCli({root}),'run','build:h5'],{cwd:root,stdio:'inherit',env:{...process.env,VITE_DATA_MODE:'mock',VITE_DEMO_AI_GATEWAY:'true',VITE_HOSTED_ASSISTANT:'false',VITE_API_BASE_URL:'',VITE_BASE_PATH:'/'}})
if(result.status!==0)process.exit(result.status??1)
// Fresh timestamped directory avoids overwriting user files or retaining stale assets.
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=resolve(root,'../../outputs','edgeone-online-demo-'+stamp)
if(existsSync(out))throw Error('发布目录已存在，请重新运行')
mkdirSync(out,{recursive:true});cpSync(join(root,'dist/build/h5'),out,{recursive:true})
const target=join(out,'cloud-functions/api/assistant/[[path]].js')
await require('esbuild').build({entryPoints:[join(root,'deploy/edgeone/cloud-functions/api/assistant/[[path]].js')],outfile:target,bundle:true,platform:'node',target:'node20',format:'esm'})
writeFileSync(join(out,'edgeone.json'),JSON.stringify({headers:[{source:'/api/*',headers:[{key:'Cache-Control',value:'no-store'}]}]},null,2)+'\n')
writeFileSync(join(out,'package.json'),JSON.stringify({private:true,type:'module'})+'\n')
const files=[];function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else files.push(path)}}walk(out)
if(files.some(p=>/\.(?:env|db|sqlite|pem|map)$/.test(p)||/[\\/]\.env/.test(p)))throw Error('发布目录包含不应上传的文件')
mkdirSync(resolve(root,'.test-temp'),{recursive:true});writeFileSync(resolve(root,'.test-temp/edgeone-output.json'),JSON.stringify({directory:out,files:files.length},null,2))
console.log('在线演示发布目录：'+out+'；文件数：'+files.length+'。尚未部署，云端密钥需另行配置。')
