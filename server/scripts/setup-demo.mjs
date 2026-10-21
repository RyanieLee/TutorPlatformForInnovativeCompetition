import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

if (process.env.NODE_ENV === 'production') throw new Error('此命令仅用于本机演示配置')
let content = readFileSync('.env.example', 'utf8')
for (const key of ['SEED_PARENT_PASSWORD', 'SEED_TUTOR_PASSWORD', 'SEED_ADMIN_PASSWORD']) {
  content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${randomBytes(24).toString('hex')}`)
}
try {
  writeFileSync('.env', content, { flag: 'wx', mode: 0o600 })
  console.log('已创建本机 .env，并生成三个独立随机演示密码。请在本机打开 .env 查看；下一步 npm run demo:serve。')
} catch (error) {
  if (error?.code !== 'EEXIST') throw error
  console.log('已有 .env，已保留原配置与密码；请确认三个 SEED_*_PASSWORD 均已填写。')
}
