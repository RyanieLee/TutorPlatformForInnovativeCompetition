import {existsSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'

/** 普通Node安装、npm脚本及Codex便携Node共用；只查找，不隐式下载或运行。 */
export function resolveNpmCli({root,execPath=process.execPath,env=process.env,exists=existsSync}){
 const candidates=[env.NPM_CLI_JS,env.npm_execpath,
  join(dirname(execPath),'node_modules/npm/bin/npm-cli.js'),
  resolve(dirname(execPath),'../node_modules/npm/bin/npm-cli.js'),
  join(root,'.local/npm/package/bin/npm-cli.js')]
 const found=candidates.find(path=>typeof path==='string'&&path.endsWith('npm-cli.js')&&exists(path))
 if(!found)throw new Error('找不到 npm。请安装完整版 Node.js，或通过 NPM_CLI_JS 指定 npm-cli.js；便携 npm 也可放在项目 .local/npm/package/。')
 return found
}
