import {PrismaClient} from '@prisma/client'
import {resolve} from 'node:path'
import {cleanupUploads} from './cleanup'
const db=new PrismaClient()
async function main(){
 if(!process.env.TEACHING_UPLOAD_ROOT)throw new Error('必须指定审核上传目录')
 console.log(await cleanupUploads(db,{uploadRoot:resolve(process.env.TEACHING_UPLOAD_ROOT),now:()=>new Date()}))
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect())
