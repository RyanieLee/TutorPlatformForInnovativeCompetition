export function createTeachingScope(readIdentity:()=>string|null,releaseObjectUrl:(url:string)=>void=url=>URL.revokeObjectURL(url)){
 let version=0
 const aborters=new Set<()=>void>(),urls=new Set<string>()
 return{
  begin(){const key=readIdentity(),stamp=++version;return{isCurrent:()=>key!==null&&key===readIdentity()&&stamp===version}},
  trackAbort(abort:()=>void){aborters.add(abort);return()=>{aborters.delete(abort)}},
  trackUrl(url:string){urls.add(url);return()=>{if(urls.delete(url))releaseObjectUrl(url)}},
  invalidate(){version++;for(const abort of aborters){try{abort()}catch{}}aborters.clear();for(const url of urls)releaseObjectUrl(url);urls.clear()}
 }
}

