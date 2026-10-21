import {computed,ref,watch} from 'vue'
import {onHide,onUnload} from '@dcloudio/uni-app'
import {currentSession,restoreSession,canAccess} from '../../../utils/session'
import {BusinessError,errorMessage} from '../../../services/errors'
import {createTeachingScope} from './request-state'
export const teachingIdentity=()=>currentSession.value?[currentSession.value.mode,currentSession.value.user.id,currentSession.value.user.role].join(':'):null
export const formatTime=(value:string|null)=>value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'未设置'
export function localTime(value:string){const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
export function inputTime(value:string,optional=false):string|null{
 if(optional&&!value.trim())return null
 const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value.trim())
 if(!m)throw new BusinessError('INVALID','请按 YYYY-MM-DD HH:mm 填写时间')
 const [year,month,day,hour,minute]=m.slice(1).map(Number),date=new Date(year,month-1,day,hour,minute)
 if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date.getHours()!==hour||date.getMinutes()!==minute)throw new BusinessError('INVALID','日期或时间无效，请检查')
 return date.toISOString()
}
export function useTeachingPage(clear:()=>void){
 const ready=ref(false),error=ref(''),busy=ref(false),feedback=ref(''),failed=ref(false)
 const authorized=computed(()=>canAccess(['parent','tutor'])),role=computed(()=>currentSession.value?.user.role)
 const scope=createTeachingScope(teachingIdentity)
 let loadVersion=0
 watch(teachingIdentity,()=>{scope.invalidate();clear();error.value='';feedback.value='';ready.value=false},{flush:'sync'})
 onHide(()=>{loadVersion++;scope.invalidate()});onUnload(()=>{loadVersion++;scope.invalidate()})
 async function load<T>(fetcher:()=>Promise<T>,apply:(data:T)=>void){
  const version=++loadVersion
  ready.value=false;error.value=''
  try{await restoreSession();if(version!==loadVersion||!authorized.value)return;const op=scope.begin();try{const data=await fetcher();if(op.isCurrent())apply(data)}catch(e){if(op.isCurrent())error.value=errorMessage(e)}}catch(e){if(version===loadVersion)error.value=errorMessage(e)}finally{if(version===loadVersion)ready.value=true}
 }
 async function act<T>(work:(guard:()=>void)=>Promise<T>,apply:(data:T)=>void){
  if(busy.value||!authorized.value)return
  const op=scope.begin();busy.value=true;feedback.value='';failed.value=false
  const guard=()=>{if(!op.isCurrent())throw new BusinessError('UNAUTHORIZED','操作已失效，请重新进入页面')}
  try{guard();const data=await work(guard);if(op.isCurrent())apply(data)}
  catch(e){if(op.isCurrent()){feedback.value=errorMessage(e);failed.value=true}}
  finally{busy.value=false}
 }
 const login=()=>uni.navigateTo({url:'/pages/auth/login'})
 return{ready,error,busy,feedback,failed,authorized,role,scope,load,act,login}
}

