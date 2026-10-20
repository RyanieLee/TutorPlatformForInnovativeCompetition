import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
// Only the ephemeral local test database receives this password; never print it.
const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio:'inherit', env:{...process.env,E2E_PASSWORD:randomBytes(24).toString('hex')}
})
child.on('exit', code => { process.exitCode=code ?? 1 })
