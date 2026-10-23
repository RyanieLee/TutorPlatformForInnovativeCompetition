import {test} from 'node:test'
import assert from 'node:assert/strict'
import {join,dirname} from 'node:path'
import {resolveNpmCli} from './npm-runtime.mjs'

const root=join(process.cwd(),'fixture-root'),execPath=join(root,'runtime','bin','node.exe')
const bundled=join(dirname(execPath),'node_modules/npm/bin/npm-cli.js')
const portable=join(root,'.local/npm/package/bin/npm-cli.js')
test('保留普通Node自带npm，兼容npm命令调用和独立便携npm',()=>{
 assert.equal(resolveNpmCli({root,execPath,env:{},exists:p=>p===bundled}),bundled)
 assert.equal(resolveNpmCli({root,execPath,env:{},exists:p=>p===portable}),portable)
 const explicit=join(root,'provided/npm-cli.js')
 assert.equal(resolveNpmCli({root,execPath,env:{npm_execpath:explicit},exists:p=>[explicit,bundled].includes(p)}),explicit)
})
test('忽略失效npm路径，缺失时返回明确诊断且不执行安装',()=>{
 assert.equal(resolveNpmCli({root,execPath,env:{npm_execpath:'missing/npm-cli.js'},exists:p=>p===portable}),portable)
 assert.throws(()=>resolveNpmCli({root,execPath,env:{},exists:()=>false}),/npm/)
})
