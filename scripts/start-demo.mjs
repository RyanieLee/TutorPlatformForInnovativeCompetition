import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
console.log('启动领航云学堂本机演示（虚构资料，不需要后端或模型密钥）。')
console.log('终端显示地址后，打开首页“演示导航”，或访问默认 http://localhost:5173/#/pages/demo/index 。')
console.log('若端口被占用，以启动日志中的实际地址为准。按 Ctrl+C 退出；不清空已有演示记录。')
const child=spawn(process.execPath,[require.resolve('@dcloudio/vite-plugin-uni/bin/uni.js'),'--host','127.0.0.1',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,VITE_DATA_MODE:'mock',VITE_API_BASE_URL:''}})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
child.on('error',error=>{console.error('启动失败，请先在仓库根目录执行 npm ci。',error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??0})
