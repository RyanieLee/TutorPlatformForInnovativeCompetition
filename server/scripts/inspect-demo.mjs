// Keep Prisma's native engine in a child process so Windows can regenerate it after inspection.
import {PrismaClient} from '@prisma/client'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const [action,database,backup,parentId,orderId,expectedCount]=process.argv.slice(2)
const db=new PrismaClient({datasources:{db:{url:'file:'+database}}})
const run=args=>{const r=spawnSync(process.execPath,[process.env.npm_execpath,'run','db:backup','--',...args],{env:{...process.env,DATABASE_URL:'file:'+database},encoding:'utf8'});if(r.error)throw r.error;return r}
try{
 if(action==='backup'){
  await db.$queryRawUnsafe('PRAGMA journal_mode=WAL')
  await db.auditLog.create({data:{actorId:parentId,action:'backup-check',entityType:'Booking',entityId:orderId}})
  const auditCount=await db.auditLog.count(),result=run(['--output',backup]);assert.equal(result.status,0,result.stderr)
  const digest=()=>createHash('sha256').update(readFileSync(backup)).digest('hex'),before=digest()
  assert.notEqual(run(['--output',backup]).status,0,'must not overwrite backup');assert.equal(digest(),before)
  assert.notEqual(run(['--output',database]).status,0,'must not overwrite active database')
  console.log(JSON.stringify({auditCount}))
 }else if(action==='restore'){
  assert.equal((await db.$queryRawUnsafe('PRAGMA integrity_check'))[0].integrity_check,'ok')
  assert.equal(await db.auditLog.count(),Number(expectedCount))
  assert.equal(await db.auditLog.count({where:{action:'create',entityType:'Booking',entityId:orderId}}),1)
  console.log(JSON.stringify({ok:true}))
 }else throw new Error('unknown inspection')
}finally{await db.$disconnect()}
