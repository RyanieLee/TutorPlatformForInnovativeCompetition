import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import net from 'node:net'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const server = join(root, 'server')
const require = createRequire(join(server, 'package.json'))
const children = new Set()
let stopping = false
const env = { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const webUrl = 'http://127.0.0.1:5173'
const apiUrl = 'http://127.0.0.1:3001'

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (process.platform === 'win32') {
      // Only terminate trees belonging to children created by this launcher.
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 })
    } else child.kill('SIGTERM')
  }
  process.exit(code)
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => stop())

function start(args, cwd, extra = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...extra }, stdio: 'inherit', windowsHide: true })
  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}
function run(args, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = start(args, cwd)
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolveRun() : reject(new Error(`初始化步骤失败（退出码 ${code}），请查看上方提示。`)))
  })
}
async function freePort(port) {
  await new Promise((ok, reject) => {
    const listener = net.createServer()
    listener.once('error', () => reject(new Error(`端口 ${port} 已被占用。请关闭此前的预览/后端窗口，再双击启动文件；本工具不会关闭其他程序。`)))
    listener.listen(port, '127.0.0.1', () => listener.close(ok))
  })
}
function watch(child, label) {
  child.once('error', error => { console.error(`${label}启动失败：${error.message}`); stop(1) })
  child.once('exit', code => { if (!stopping) { console.error(`${label}已退出（${code}），正在停止本次预览。`); stop(1) } })
}
async function ready(url, timeout = 120000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return } catch {}
    await new Promise(ok => setTimeout(ok, 600))
  }
  throw new Error(`等待服务超时：${url}，请查看上方报错。`)
}
function openProgram(program, args) {
  const child = spawn(program, args, { detached: true, stdio: 'ignore', windowsHide: true })
  child.once('error', () => console.log('未能自动打开窗口，请按上方地址和路径手动打开。'))
  child.unref()
}

try {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('请安装 Node.js 20 或更新版本。')
  if (!existsSync(npm)) throw new Error('找不到 npm，请安装完整版 Node.js 后再启动。')
  if (process.argv.includes('--check')) {
    console.log('启动器检查通过：Node.js / npm / 项目路径有效。')
    console.log(`前端依赖：${existsSync(join(root, 'node_modules/@dcloudio/vite-plugin-uni')) ? '已安装' : '启动时安装'}`)
    console.log(`后端依赖：${existsSync(join(server, 'node_modules/dotenv')) ? '已安装' : '启动时安装'}`)
    console.log(`后端配置：${existsSync(join(server, '.env')) ? '将保留' : '首次启动时生成'}`)
    process.exit(0)
  }
  console.log('领航云学堂 · 真实 AI 测试一键启动（仅本机）')
  await freePort(3001)
  await freePort(5173)
  if (!existsSync(join(root, 'node_modules/@dcloudio/vite-plugin-uni'))) await run([npm, 'ci', '--no-audit', '--no-fund'], root)
  if (!existsSync(join(server, 'node_modules/dotenv')) || !existsSync(join(server, 'node_modules/prisma'))) await run([npm, 'ci', '--no-audit', '--no-fund'], server)
  for (const [name, binary] of [['PRISMA_QUERY_ENGINE_LIBRARY', 'query_engine-windows.dll.node'], ['PRISMA_SCHEMA_ENGINE_BINARY', 'schema-engine-windows.exe']]) {
    const path = join(server, 'node_modules/@prisma/engines', binary)
    if (process.platform === 'win32' && !env[name] && existsSync(path)) env[name] = path
  }
  await run([npm, 'run', 'demo:setup'], server)
  const settings = require('dotenv').parse(readFileSync(join(server, '.env')))
  if (settings.NODE_ENV && settings.NODE_ENV !== 'development') throw new Error('此启动器仅用于本地开发，请勿使用生产或测试环境配置。')
  Object.assign(env, settings, { NODE_ENV: 'development', PORT: '3001', HOST: '127.0.0.1', CORS_ORIGINS: 'http://127.0.0.1:5173,http://localhost:5173' })
  console.log('正在生成客户端、应用数据库迁移并准备三个本地测试账户；保留已有业务记录。')
  await run([npm, 'run', 'db:init'], server)
  await run([npm, 'run', 'build'], server)
  const api = start(['dist/src/main.js'], server)
  watch(api, '后端')
  await ready(apiUrl + '/health')
  // Resolve from the frontend rather than accidentally using backend dependencies.
  const frontRequire = createRequire(join(root, 'package.json'))
  const web = start([frontRequire.resolve('@dcloudio/vite-plugin-uni/bin/uni.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], root, { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: apiUrl })
  watch(web, '网页')
  await ready(webUrl)
  const accountFile = join(server, '.ai-config/local-test-accounts.txt')
  mkdirSync(dirname(accountFile), { recursive: true, mode: 0o700 })
  writeFileSync(accountFile, '\uFEFF' + [
    '仅本机测试账户，请勿分享此文件或提交到 Git。', '',
    `管理员：demo.admin    密码：${settings.SEED_ADMIN_PASSWORD}`,
    `学生/家长：demo.parent    密码：${settings.SEED_PARENT_PASSWORD}`,
    `家教：demo.tutor    密码：${settings.SEED_TUTOR_PASSWORD}`, '',
    '1. 使用管理员账户登录 → 我的工作台 → 模型接入。',
    '2. 填写服务地址、可用模型及自己的 API Key，保存 → 测试连接。',
    '3. 打开启用模型服务并保存，再切换家长/家教账户测试聊天和 AI 批改。',
    'API Key 只在管理员页面填写；测试连接和问答会产生供应商用量。',
    '关闭启动器前请按 Ctrl+C；不清空数据库或模型配置。'
  ].join('\r\n'), { mode: 0o600 })
  console.log(`\n启动完成！网页：${webUrl}`)
  console.log(`本地账户说明：${accountFile}`)
  console.log('请保持此窗口开启，按 Ctrl+C 同时停止本次启动的前后端。')
  if (!process.argv.includes('--no-open') && process.platform === 'win32') {
    openProgram('notepad.exe', [accountFile])
    openProgram('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${webUrl}/#/pages/auth/login?role=admin'`])
  }
} catch (error) {
  console.error(`\n启动失败：${error.message}`)
  stop(1)
}
