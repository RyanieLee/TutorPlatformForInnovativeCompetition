const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
async function main(){
 const source=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),dir=path.join(source,'assets');
 const html=fs.readFileSync(path.join(source,'index.html'),'utf8'),entry=html.match(/src="[^"]*\/(index-[^"]+\.js)"/)[1];
 const bundle=await esbuild.build({entryPoints:[path.join(dir,entry)],bundle:true,write:false,format:'iife',target:'es2020',plugins:[{name:'offline-preloads',setup(b){b.onLoad({filter:/\.js$/},async a=>({contents:fs.readFileSync(a.path,'utf8').replace(/return indexes\.map\(\(i\) => __vite__mapDeps\.viteFileDeps\[i\]\)/g,'return []'),loader:'js'}))}}]});
 const css=fs.readdirSync(dir).filter(n=>n.endsWith('.css')).sort((a,b)=>a.startsWith('uni.')?-1:b.startsWith('uni.')?1:0).map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const js=bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
 fs.writeFileSync(output,'<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>校园家教 教学闭环预览</title><style>'+css+'</style></head><body><div id="app"></div><script>'+js+'</script></body></html>');
 console.log('Preview created: '+fs.statSync(output).size+' bytes');
}
main().catch(e=>{console.error(e);process.exit(1)});
