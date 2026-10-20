import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
// 多个隔离 API 实例共用同一份生成客户端，启动前只生成一次。
const generated = spawnSync('npm', ['run', 'db:generate'], {cwd:'server',stdio:'inherit'})
if (generated.status !== 0) process.exit(generated.status ?? 1)
// Only the ephemeral local test database receives this password; never print it.
const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio:'inherit', env:{...process.env,E2E_PASSWORD:randomBytes(24).toString('hex')}
})
child.on('exit', code => { process.exitCode=code ?? 1 })
