import {ApiError} from '../core'
import {containsPersonalInfo} from '../match-model'
import {validateCourse,makePresetFeedback,makePresetRevision,applyCommand,type LoopState,type Command} from './engine'
import preset from './course.json'
export interface TeachingModel{enabled:boolean;generate(kind:'course'|'feedback'|'revision',state:LoopState,now:string):Promise<Command>}
function sameQuestionBank(course:any){
 for(let i=0;i<4;i++)for(const key of ['examples','exercises']as const)if(JSON.stringify(course.lessons[i][key])!==JSON.stringify(preset.lessons[i][key]))throw new Error('模型改变了已经核验的题目与答案')
 if(JSON.stringify(course.diagnostic)!==JSON.stringify(preset.diagnostic))throw new Error('模型改变了预诊断题')
}
const bad=()=>new ApiError('MODEL_UPSTREAM',502,'教学模型返回无效或未经核验的内容，请改用样例或手工编辑')
export function createTeachingModel(env:Record<string,string|undefined>=process.env,transport:typeof fetch=fetch):TeachingModel{
 const base=env.MATCH_MODEL_BASE_URL?.trim(),name=env.MATCH_MODEL_NAME?.trim(),key=env.MATCH_MODEL_API_KEY?.trim()
 if(!base||!name)return{enabled:false,async generate(){throw new ApiError('MODEL_UNAVAILABLE',503,'教学模型尚未配置')}}
 let url:URL;try{url=new URL(base)}catch{throw new Error('模型地址无效')}
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname)
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&local))||url.username||url.password||url.search||url.hash)throw new Error('模型地址必须使用HTTPS或本机HTTP，不能含凭据或查询参数')
 if(!local&&!key)return{enabled:false,async generate(){throw new ApiError('MODEL_UNAVAILABLE',503,'教学模型尚未配置')}}
 const endpoint=new URL(url.pathname.replace(/\/+$/,'')+'/chat/completions',url.origin).toString()
 return{enabled:true,async generate(kind,state,now){
  let template:any,record:any
  if(kind==='course')template=preset
  else{
   const r=state.records.filter(r=>r.lessonId==='L2').at(-1);if(!r)throw new ApiError('INVALID',400,'请先记录第二课课堂事实')
   record={lessonId:r.lessonId,date:r.date,completed:r.completed,goalMet:r.goalMet,results:r.results,errorTypes:r.errorTypes,observation:r.observation,questions:r.questions,consolidation:r.consolidation}
   if(kind==='feedback'){const f=makePresetFeedback(state,r.id,now);template={strengths:f.strengths,consolidation:f.consolidation,next:f.next,report:f.report}}
   else {const p=makePresetRevision(state,now);template={lesson:p.course.lessons[2],why:p.why,changes:p.changes}}
  }
  const context={kind,template,...(record?{record}:{})}
  if(containsPersonalInfo(JSON.stringify(context)))throw new ApiError('INVALID',400,'课堂观察请勿填写姓名、联系方式或详细地址')
  const controller=new AbortController(),timeout=Math.min(15000,Math.max(1000,Number(env.MATCH_MODEL_TIMEOUT_MS)||12000)),timer=setTimeout(()=>controller.abort(),timeout)
  try{
   const response=await transport(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify({model:name,temperature:0,max_tokens:6500,messages:[{role:'system',content:'你是教师备课辅助工具。只输出与template相同结构的JSON，不添加字段。仅依据record中的事实给建议，不推断人格、注意力或提分效果。不改变题号、题干、答案、解析和课次ID。每节45分钟。每条反馈/修订须引用实际题目ID或teacher-observation。建议由教师审核后发布。课程用DEMO-STUDENT-01匿名代号。不得把模板来源描述成已发生的真实教学。'},{role:'user',content:JSON.stringify(context)}]})})
   if(!response.ok||Number(response.headers.get('content-length'))>180000||!response.body)throw bad()
   const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,raw=''
   try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>180000){await reader.cancel();throw bad()}raw+=decoder.decode(part.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
   const envelope=JSON.parse(raw),content=envelope?.choices?.[0]?.message?.content;if(typeof content!=='string'||content.length>100000)throw bad()
   const out=JSON.parse(content);let command:Command={requestId:'generated-candidate',expectedRevision:state.revision,type:'saveDraft',payload:{}}
   if(kind==='course'){validateCourse(out);sameQuestionBank(out);command.payload={course:out,source:'model'}}
   else if(kind==='feedback'){
    if(Object.keys(out).sort().join(',')!=='consolidation,next,report,strengths')throw bad()
    const r=state.records.filter(r=>r.lessonId==='L2').at(-1)!,f=makePresetFeedback(state,r.id,now)
    command={...command,type:'feedback',payload:{recordId:r.id,feedback:{...f,...out,source:'model',promptVersion:'teaching-evidence-v1'}}}
   }else{
    if(Object.keys(out).sort().join(',')!=='changes,lesson,why')throw bad()
    const p=makePresetRevision(state,now);p.course.lessons[2]=out.lesson;p.why=out.why;p.changes=out.changes;p.source='model';sameQuestionBank(p.course)
    command={...command,type:'suggest',payload:{suggestion:p}}
   }
   applyCommand(state,command,now)
   return command
  }catch(error){if(error instanceof ApiError)throw error;if(controller.signal.aborted)throw new ApiError('MODEL_UPSTREAM',504,'教学模型超时，可重试或使用明确标注的演示样例');throw bad()}finally{clearTimeout(timer)}
 }}
}
