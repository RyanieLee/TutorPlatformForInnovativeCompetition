import {BusinessError} from '../../../services/errors'
import type {SelectedFile,DownloadedFile} from '../../../types/teaching'
export const allowedExtensions=['jpg','jpeg','png','webp','pdf','docx','pptx']
export function validateSelected(files:SelectedFile[],count:number){
 if(files.length+count>5)throw new BusinessError('INVALID','每组最多选择5个文件')
 for(const file of files){
  if(!allowedExtensions.includes(file.name.split('.').pop()?.toLowerCase()||''))throw new BusinessError('INVALID','请选择 JPG、PNG、WebP、PDF、DOCX、PPTX 文件')
  if(file.size<=0||file.size>20*1024*1024)throw new BusinessError('INVALID','请选择非空且不超过20 MiB的文件')
 }
}
export function selectFiles(count:number):Promise<SelectedFile[]>{
 return new Promise((resolve,reject)=>{
  const success=(result:any)=>resolve(result.tempFiles.map((f:any,index:number)=>({path:f.path||result.tempFilePaths?.[index],name:f.name||('图片'+index+'.jpg'),size:f.size})))
  const fail=(error:any)=>{if(String(error?.errMsg).includes('cancel'))resolve([]);else reject(new BusinessError('STORAGE','无法打开文件选择，请重试'))}
  // #ifdef H5
  uni.chooseFile({count:Math.max(1,count),type:'all',extension:allowedExtensions.map(e=>'.'+e),success,fail})
  // #endif
  // #ifdef MP-WEIXIN
  uni.chooseMessageFile({count:Math.max(1,count),type:'all',success,fail})
  // #endif
 })
}
export function saveDownload(file:DownloadedFile){
 // #ifdef H5
 const a=document.createElement('a');a.href=file.url;a.download=file.name;document.body.appendChild(a);a.click();a.remove()
 // #endif
 // #ifndef H5
 uni.openDocument({filePath:file.url,showMenu:true})
 // #endif
}
export function formatSize(size:number){return size>=1024*1024?(size/1024/1024).toFixed(1)+' MiB':Math.max(1,Math.ceil(size/1024))+' KiB'}
