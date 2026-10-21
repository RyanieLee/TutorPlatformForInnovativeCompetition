import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, chmodSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

// VACUUM INTO creates a consistent standalone SQLite snapshot, including committed WAL data.
if (process.env.NODE_ENV === 'production') throw new Error('此命令仅用于开发演示数据库')
const url = process.env.DATABASE_URL
if (!url?.startsWith('file:')) throw new Error('请配置 SQLite DATABASE_URL')
const source = isAbsolute(url.slice(5)) ? url.slice(5) : resolve('prisma', url.slice(5))
if (!existsSync(source)) throw new Error('演示数据库不存在，请先 db:init')
const args = process.argv.slice(2)
if (args.length && (args.length !== 2 || args[0] !== '--output' || !args[1])) throw new Error('用法：npm run db:backup -- --output 备份路径')
const output = resolve(args[1] || `backups/demo-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
if (output === resolve(source)) throw new Error('备份路径不能是当前数据库')
mkdirSync(dirname(output), { recursive: true })
// Reserve a new empty file atomically; never overwrite an existing snapshot.
closeSync(openSync(output, 'wx', 0o600))
const db = new PrismaClient()
try {
  await db.$executeRawUnsafe('VACUUM INTO ?', output)
  chmodSync(output, 0o600)
  console.log(`演示数据库备份完成：${output}`)
} catch (error) {
  unlinkSync(output)
  throw error
} finally {
  await db.$disconnect()
}
