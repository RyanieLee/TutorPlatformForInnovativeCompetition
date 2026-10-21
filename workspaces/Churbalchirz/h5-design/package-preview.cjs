const fs=require('node:fs'),path=require('node:path');
const esbuild=require('esbuild');
async function main(){
 const dir=path.join(__dirname,'dist/build/h5/assets');
 const html=fs.readFileSync(path.join(dir,'../index.html'),'utf8');
 const entry=html.match(/src="[^\"]*\/(index-[^\"]+\.js)"/)[1];
 const js=await esbuild.build({entryPoints:[path.join(dir,entry)],bundle:true,write:false,format:'iife',target:'es2020',plugins:[{name:'offline-preloads',setup(b){b.onLoad({filter:/\.js$/},async a=>({contents:fs.readFileSync(a.path,'utf8').replace(/return indexes\.map\(\(i\) => __vite__mapDeps\.viteFileDeps\[i\]\)/g,'return []'),loader:'js'}))}}]});
 const files=fs.readdirSync(dir).filter(n=>n.endsWith('.css'));
 files.sort((a,b)=>a.startsWith('uni.')?-1:b.startsWith('uni.')?1:0);
 const css=files.map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n');
 const out='<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>校园家教 · 校园学习手册设计预览</title><style>'+css+'</style></head><body><div id="app"></div><script>'+js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
 fs.writeFileSync(path.join(__dirname,'preview.html'),out);
 console.log('Created self-contained preview.html');
}
main().catch(e=>{console.error(e);process.exit(1)});
