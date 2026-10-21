import {open} from 'node:fs/promises'
import {extname} from 'node:path'
import yauzl from 'yauzl'
import {fail} from '../core'
export type AllowedFileType={mediaType:string}
function office(path:string,kind:'docx'|'pptx'):Promise<void>{
 return new Promise((resolve,reject)=>{
  yauzl.open(path,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
   if(error||!zip){reject(error??new Error('ZIP不存在'));return}
   let count=0,total=0,xml='',hasPart=false,done=false
   const part=kind==='docx'?'word/document.xml':'ppt/presentation.xml'
   const type=kind==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml':'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
   const stop=(e:unknown)=>{if(!done){done=true;zip.close();reject(e)}}
   zip.on('error',stop)
   zip.on('entry',entry=>{
    count++;total+=entry.uncompressedSize
    if(count>4096||total>200*1024*1024||entry.generalPurposeBitFlag&1){stop(new Error('ZIP超限或加密'));return}
    if(entry.fileName===part)hasPart=true
    if(entry.fileName!=='[Content_Types].xml'){zip.readEntry();return}
    if(entry.uncompressedSize>512*1024){stop(new Error('类型描述超限'));return}
    zip.openReadStream(entry,(err,stream)=>{
     if(err||!stream){stop(err??new Error('读取失败'));return}
     const chunks:Buffer[]=[];let size=0
     stream.on('error',stop)
     stream.on('data',(c:Buffer)=>{size+=c.length;if(size>512*1024){stream.destroy();stop(new Error('类型描述超限'))}else chunks.push(c)})
     stream.on('end',()=>{xml=Buffer.concat(chunks).toString('utf8');if(!done)zip.readEntry()})
    })
   })
   zip.on('end',()=>{if(done)return;done=true;if(!hasPart||!xml.includes(type)||!xml.includes('/'+part))reject(new Error('Office类型不匹配'));else resolve()})
   zip.readEntry()
  })
 })
}
export async function detectFileType(path:string,originalName:string):Promise<AllowedFileType>{
 if(originalName.length>200||/[\\/\x00-\x1f\x7f]/.test(originalName))return fail('INVALID',400,'文件名无效，请重命名后上传')
 const ext=extname(originalName).toLowerCase(),file=await open(path,'r'),bytes=Buffer.alloc(16)
 let length:number
 try{length=(await file.read(bytes,0,16,0)).bytesRead}finally{await file.close()}
 const header=bytes.subarray(0,length)
 if(ext==='.png'&&header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return{mediaType:'image/png'}
 if(['.jpg','.jpeg'].includes(ext)&&header[0]===255&&header[1]===216&&header[2]===255)return{mediaType:'image/jpeg'}
 if(ext==='.webp'&&header.subarray(0,4).toString()==='RIFF'&&header.subarray(8,12).toString()==='WEBP')return{mediaType:'image/webp'}
 if(ext==='.pdf'&&header.subarray(0,5).toString()==='%PDF-')return{mediaType:'application/pdf'}
 if(['.docx','.pptx'].includes(ext)&&header.subarray(0,4).equals(Buffer.from([80,75,3,4]))){
  try{await office(path,ext.slice(1) as 'docx'|'pptx')}catch{return fail('INVALID',400,'文件内容与Office格式不匹配，或文件超出解析限制')}
  return{mediaType:ext==='.docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/vnd.openxmlformats-officedocument.presentationml.presentation'}
 }
 return fail('INVALID',400,'仅支持内容有效的 JPG、PNG、WebP、PDF、DOCX、PPTX 文件')
}

