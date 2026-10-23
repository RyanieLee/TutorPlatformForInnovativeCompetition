const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild')
async function main(){
 const source=path.resolve(process.argv[2]||'dist/build/h5'),output=path.resolve(process.argv[3]||'outputs/云伴学新版预览.html')
 const html=fs.readFileSync(path.join(source,'index.html'),'utf8'),entry=html.match(/src="[^"]*\/(index-[^"]+\.js)"/)?.[1]
 if(!entry)throw new Error('未找到 H5 入口，请先构建 Mock H5')
 const dir=path.join(source,'assets'),bundle=await esbuild.build({entryPoints:[path.join(dir,entry)],bundle:true,write:false,format:'iife',target:'es2020',plugins:[{name:'offline-preloads',setup(b){b.onLoad({filter:/\.js$/},a=>({contents:fs.readFileSync(a.path,'utf8').replace(/return indexes\.map\(\(i\) => __vite__mapDeps\.viteFileDeps\[i\]\)/g,'return []'),loader:'js'}))}}]})
 const css=fs.readdirSync(dir).filter(n=>n.endsWith('.css')).sort((a,b)=>a.startsWith('uni.')?-1:b.startsWith('uni.')?1:a.localeCompare(b)).map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n')
 const mime={svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',woff2:'font/woff2',woff:'font/woff'}
 let count=0
 function inline(text){return text.replace(/\/(?:static|assets)\/[A-Za-z0-9_./%+@-]+\.(?:svg|png|jpe?g|webp|gif|woff2?)/g,url=>{
  const filename=path.resolve(source,'.'+decodeURIComponent(url))
  if(!filename.startsWith(source+path.sep)||!fs.existsSync(filename))return url
  count++;const ext=path.extname(filename).slice(1).toLowerCase();return 'data:'+mime[ext]+';base64,'+fs.readFileSync(filename).toString('base64')
 })}
 const js=inline(bundle.outputFiles[0].text).replace(/<\/script/gi,'<\\/script'),styles=inline(css)
 fs.mkdirSync(path.dirname(output),{recursive:true})
 fs.writeFileSync(output,'<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>领航云学堂 · 云伴学新版预览</title><style>'+styles+'</style></head><body><div id="app"></div><script>'+js+'</script></body></html>')
 console.log('已生成离线 Mock 预览；内嵌资源引用 '+count+' 个，文件 '+fs.statSync(output).size+' 字节。')
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
