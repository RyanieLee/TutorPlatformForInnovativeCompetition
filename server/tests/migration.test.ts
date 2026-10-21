import { expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { closeSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)

it('旧家教资料迁移后可按原有科目查询，JSON 资料保留', async () => {
 const dir=mkdtempSync(join(tmpdir(),'tutor-subject-migration-'))
 const schema=join(dir,'prisma','schema.prisma')
 const migrations=join(dir,'prisma','migrations')
 const source=resolve('prisma')
 const url=`file:${join(dir,'legacy.db')}`
 const migrate=()=>{
  const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema',schema],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:url},encoding:'utf8'})
  if(result.status!==0)throw new Error(`Prisma migration failed (${result.status}): ${result.stdout}\n${result.stderr}`)
 }
 try {
  closeSync(openSync(join(dir,'legacy.db'),'w'))
  mkdirSync(migrations,{recursive:true})
  copyFileSync(join(source,'schema.prisma'),schema)
  copyFileSync(join(source,'migrations','migration_lock.toml'),join(migrations,'migration_lock.toml'))
  cpSync(join(source,'migrations','20261015000000_init'),join(migrations,'20261015000000_init'),{recursive:true})
  migrate()
  const db=new PrismaClient({datasources:{db:{url}}})
  try {
   await db.$executeRaw`INSERT INTO "User" ("id","loginId","displayName","role","passwordHash","updatedAt") VALUES ('legacy-user','legacy-tutor','虚构旧家教','tutor','unused-hash',CURRENT_TIMESTAMP)`
   await db.$executeRaw`INSERT INTO "TutorProfile" ("id","userId","displayName","university","major","subjectsJson","teachingMode","area","pricePerHour","introduction","availability","published","updatedAt") VALUES ('legacy-profile','legacy-user','虚构旧家教','示例大学','数学专业','["数学","物理"]','线上','示例地区',80,'虚构资料','周末',true,CURRENT_TIMESTAMP)`
  } finally { await db.$disconnect() }
  cpSync(join(source,'migrations','20261018000000_tutor_subject'),join(migrations,'20261018000000_tutor_subject'),{recursive:true})
  cpSync(join(source,'migrations','20261021000000_teaching'),join(migrations,'20261021000000_teaching'),{recursive:true})
  cpSync(join(source,'migrations','20261021010000_tutor_evidence_photo'),join(migrations,'20261021010000_tutor_evidence_photo'),{recursive:true})
  migrate()
  const upgraded=new PrismaClient({datasources:{db:{url}}})
  try {
   const profile=await upgraded.tutorProfile.findUniqueOrThrow({where:{id:'legacy-profile'},include:{subjects:true}})
   expect(profile.subjectsJson).toBe('["数学","物理"]')
   expect(profile.subjects.map(row=>row.subject).sort()).toEqual(['数学','物理'])
   expect(profile.photoKey).toBeNull()
   expect(profile.experienceMonths).toBeNull()
   expect(await upgraded.tutorProfile.count({where:{subjects:{some:{subject:'数学'}}}})).toBe(1)
  } finally { await upgraded.$disconnect() }
 } finally { rmSync(dir,{recursive:true,force:true}) }
},30000)
