import 'dotenv/config'
import { spawnSync } from 'node:child_process'
// Preflight before migration/seed. Never erase an existing database or print passwords.
if (process.env.NODE_ENV === 'production') throw new Error('演示初始化不允许在 production 环境运行')
if (!process.env.DATABASE_URL?.startsWith('file:')) throw new Error('请配置演示 SQLite DATABASE_URL（file:...）')
for (const key of ['SEED_PARENT_PASSWORD','SEED_TUTOR_PASSWORD','SEED_ADMIN_PASSWORD']) {
  if (!process.env[key] || process.env[key].length < 12) throw new Error(`请在环境中配置至少 12 位的 ${key}`)
}
for (const task of ['db:generate','db:migrate','db:seed']) {
  const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',task],{stdio:'inherit',env:process.env})
  if(result.error)throw result.error
  if(result.status!==0)process.exit(result.status||1)
}
console.log('演示初始化完成：已应用迁移与种子，保留已有申请、预约和举报记录。')
