// Local protocol/visual verification only. This script is never in the deploy ZIP.
import {createServer} from 'node:http'
import {readFile,stat} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {pathToFileURL} from 'node:url'
const metadata=JSON.parse(await readFile(new URL('../.test-temp/edgeone-output.json',import.meta.url),'utf8'))
const root=resolve(metadata.directory),entry=resolve(root,'cloud-functions/api/assistant/[[path]].js')
// Import exactly the generated deployment handler, then intercept its fixed upstream.
globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'【本地协议测试，未调用DeepSeek】\n错因：应先核对运算过程。\n针对训练：计算3+4，答案7。\n老师备课建议：下节课复习加法的计算步骤。'}}]}))
const handle=(await import(pathToFileURL(entry).href)).onRequest
const env={DEEPSEEK_API_KEY:'fixture-key-not-real',DEMO_AI_ACCESS_CODE:'local-fixture-access-only',DEMO_AI_EXPIRES_AT:'2027-01-01T00:00:00Z'}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:5187')
  if(url.pathname.startsWith('/api/assistant/')){
   const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>70000){res.writeHead(413);res.end();return}chunks.push(chunk)}
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})})
   const response=await handle({request,env,clientIp:'local-review'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return
  }
  let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html')
  if(file.includes(sep+'cloud-functions'+sep)){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file))
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(5187,'127.0.0.1',()=>console.log('本地协议测试 http://127.0.0.1:5187；上游固定模拟，不调用真实模型。'))
