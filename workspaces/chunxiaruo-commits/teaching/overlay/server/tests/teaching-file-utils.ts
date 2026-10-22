import {randomUUID} from 'node:crypto'
import {deflateRawSync} from 'node:zlib'
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9e8AAAAASUVORK5CYII=','base64')
export function multipart(bytes:Buffer,name='作业.png'){
 const boundary='test-'+randomUUID()
 return{headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="'+name+'"\r\nContent-Type: application/octet-stream\r\n\r\n'),bytes,Buffer.from('\r\n--'+boundary+'--\r\n')])}
}
export async function upload(h:any,lessonId:string,purpose:string,who:any,bytes=png,name='作业.png'){
 const body=multipart(bytes,name)
 return h.app.inject({method:'POST',url:'/api/lessons/'+lessonId+'/attachments?purpose='+purpose,headers:{...body.headers,authorization:'Bearer '+who.token},payload:body.payload})
}
function crc32(data:Buffer){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
export function officeFixture(kind:'docx'|'pptx'='docx') {
 const part=kind==='docx'?'word/document.xml':'ppt/presentation.xml'
 const type=kind==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml':'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
 const files=[['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/'+part+'" ContentType="'+type+'"/></Types>'],[part,'<?xml version="1.0"?><document>虚构测试作业</document>']]
 const locals:Buffer[]=[],central:Buffer[]=[];let offset=0
 for(const [name,body]of files){
  const n=Buffer.from(name),raw=Buffer.from(body),data=deflateRawSync(raw),crc=crc32(raw)
  const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(8,8);head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(raw.length,22);head.writeUInt16LE(n.length,26)
  locals.push(head,n,data);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=head.length+n.length+data.length
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
 return Buffer.concat([...locals,directory,end])
}

