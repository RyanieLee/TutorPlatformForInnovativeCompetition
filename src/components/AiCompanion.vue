<script setup lang="ts">
import {computed,ref,toRefs,watch,nextTick,getCurrentInstance,onBeforeUnmount} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import {apiMode} from '../config/runtime'
import {currentSession,restoreSession} from '../utils/session'
import {errorMessage,BusinessError} from '../services/errors'
import {companionStatus,localChat,remoteChat,pendingCompanionBrief,pendingCompanionAuto} from '../services/assistant'
import {companionState,clearCompanion,ownCompanion} from '../services/companion-state'
import {createVoiceInput,speakReply,stopVoiceOutput,voiceOutputSupported} from '../services/voice'
import {matchingCommand} from '../services/assistant-command'
const props=withDefaults(defineProps<{page?:boolean}>(),{page:false})
const listening=ref(false),readAloud=ref(false),voiceError=ref('')
const voice=createVoiceInput({text:text=>{listening.value=false;draft.value=text;void send()},error:message=>{listening.value=false;voiceError.value=message},end:()=>{listening.value=false}})
function microphone(){voiceError.value='';if(listening.value){voice.stop();listening.value=false;return}listening.value=true;voice.start();if(!voice.supported)listening.value=false}
function toggleRead(){readAloud.value=!readAloud.value;if(!readAloud.value)stopVoiceOutput()}
const {messages,history,draft,mode,busy,error,paused}=toRefs(companionState)
const open=ref(props.page),visible=ref(true),status=ref<'checking'|'enabled'|'disabled'|'error'>('checking'),loginNeeded=ref(false)
const instance='companion-'+getCurrentInstance()!.uid
const last=ref('');let statusVersion=0,running:number|null=null
const useModel=computed(()=>apiMode&&status.value==='enabled'&&mode.value==='auto')
watch(()=>currentSession.value?.user.id,id=>{ownCompanion(id??'guest');loginNeeded.value=false},{immediate:true})
async function checkStatus(){const v=++statusVersion;status.value='checking';try{const s=await companionStatus();if(v===statusVersion)status.value=s.enabled?'enabled':'disabled'}catch{if(v===statusVersion)status.value='error'}}
function stop(){voice.stop();stopVoiceOutput();listening.value=false;visible.value=false;open.value=false;statusVersion++;if(running!==null&&running===companionState.version){companionState.version++;busy.value=false;error.value='上一条答复已中止，可重新发送';if(messages.value[messages.value.length-1]?.role==='user')messages.value.pop()}running=null}
onShow(()=>{visible.value=true;if(props.page){open.value=true;void checkStatus()}})
onHide(stop);onBeforeUnmount(stop)
async function toggle(){if(!props.page){uni.navigateTo({url:'/pages/assistant/index'});return}open.value=!open.value;if(open.value)await checkStatus()}
async function bottom(){await nextTick();const lastMessage=messages.value[messages.value.length-1];last.value=instance+'-'+lastMessage.id}
function reset(){voice.stop();stopVoiceOutput();listening.value=false;clearCompanion();loginNeeded.value=false}
function modelMode(){const text=draft.value;reset();mode.value='auto';draft.value=text}
function localMode(){const text=draft.value;reset();mode.value='local';draft.value=text}
async function send(){
 const text=draft.value.trim();if(!text||busy.value)return
 if(text.length>500){error.value='每条消息最多500字';return}
 if(apiMode&&status.value==='checking'&&mode.value==='auto')return
 if(apiMode&&status.value==='error'&&mode.value==='auto'){error.value='模型状态暂不可读取，可主动切换本机演示';return}
 error.value='';loginNeeded.value=false
 const token=++companionState.version;running=token;busy.value=true
 const bubbleId=token*2;messages.value.push({role:'user',content:text,source:'guide',id:bubbleId});void bottom()
 try{
  let result
  const command=matchingCommand(text,history.value.filter(m=>m.role==='user').map(m=>m.content))
  if(command){
   if(command.error)result={source:'local' as const,reply:'可以帮你生成推荐，还需要补充：'+command.error+'。例如：请帮我匹配初中数学，预算100元，线上，周六下午。'}
   else{
    result={source:'local' as const,reply:'已整理条件，正在按你的指令打开智能匹配并查询公开老师。'+command.input.subject+'，'+command.input.grade+'，预算'+command.input.budget+'元，'+command.input.mode+'；'+(command.input.desiredTime||'时间待补充')+'。未提交预约。'}
    pendingCompanionBrief.value=command.brief;pendingCompanionAuto.value=true
   }
  }else if(useModel.value){
   const session=await restoreSession();if(token!==companionState.version)return
   if(!session){loginNeeded.value=true;throw new BusinessError('UNAUTHORIZED','请先登录开发账户，再使用模型对话')}
   result=await remoteChat([...history.value.slice(-8),{role:'user',content:text}])
  }else result=localChat(text)
  if(token!==companionState.version)return
  messages.value.push({role:'assistant',content:result.reply,source:result.source,matchBrief:result.matchBrief,id:bubbleId+1})
  history.value=[...history.value.slice(-6),{role:'user',content:text},{role:'assistant',content:result.reply.slice(0,500)}]
  if(messages.value.length>30)messages.value=messages.value.slice(-30)
  draft.value='';if(readAloud.value)speakReply(result.reply);void bottom()
  if(command&&!command.error)uni.navigateTo({url:'/pages/match/index'})
 }catch(cause){if(token===companionState.version){error.value=cause instanceof Error?errorMessage(cause):'对话失败，请重试';if(messages.value[messages.value.length-1]?.id===bubbleId)messages.value.pop()}}
 finally{if(token===companionState.version)busy.value=false;running=null}
}
function ask(text:string){draft.value=text;void send()}
function go(where:'match'|'learning'|'map',brief?:string){
 if(brief){pendingCompanionBrief.value=brief;pendingCompanionAuto.value=false}
 const url=where==='match'?'/pages/match/index':where==='learning'?'/pages/learning/index':'/pages/order-map/index'
 const pages=getCurrentPages(),route=pages[pages.length-1]?.route
 open.value=false
 if(route===url.slice(1)){if(brief)uni.redirectTo({url});return}
 uni.navigateTo({url})
}
function login(){open.value=false;uni.navigateTo({url:'/pages/auth/login'})}
</script>
<template>
 <view v-if="visible" class="companion-root" :class="{'motion-off':paused,'companion-fullpage':props.page}" @keydown.esc="!props.page&&(open=false)">
  <view v-if="open" class="companion-panel" role="dialog" aria-label="小书灵 AI 对话">
   <view class="companion-head"><view v-if="props.page" class="book-pet" aria-hidden="true"><view class="pet-leaf"/><view class="pet-body"><view class="pet-eyes"><view/><view/></view><view class="pet-mouth"/><view class="pet-pages"/></view></view><view><text class="companion-title">小书灵 · 学习陪伴</text><text class="companion-source">{{useModel?'服务端模型对话':status==='checking'&&mode==='auto'?'检查模型配置中':'本机演示 · 非大模型'}}</text></view><button v-if="!props.page" aria-label="关闭AI对话" class="companion-close" @click="open=false">×</button></view>
   <text class="companion-notice">{{useModel?'发送你输入的对话，不自动发送账户、订单或定位。':'本机答复仅支持需求整理、本站笔记与页面指引。'}} 请勿输入私人信息；对话不会执行预约或改动订单。</text>
   <scroll-view scroll-y class="companion-log" :scroll-into-view="last" role="log" aria-live="polite">
    <view v-for="m in messages" :id="instance+'-'+m.id" :key="m.id" class="companion-message" :class="m.role"><text class="message-label">{{m.role==='user'?'你':m.source==='model'?'模型答复':m.source==='local'?'本机演示答复':'小书灵'}}</text><text class="message-text">{{m.content}}</text><button v-if="m.matchBrief" class="message-action" @click="go('match',m.matchBrief)">带入匹配需求 →</button></view>
    <view v-if="busy" class="thinking" role="status">正在整理答复…</view>
   </scroll-view>
   <view class="companion-shortcuts"><button :disabled="busy" @click="ask('初中数学，预算100元，线上耐心讲解')">帮我找老师</button><button :disabled="busy" @click="ask('怎么查看订单地图')">怎么看订单</button><button :disabled="busy" @click="ask('一元一次方程怎么学习')">学习小问题</button></view>
   <view v-if="error" class="companion-error" role="alert">{{error}}<button v-if="loginNeeded" @click="login">登录后继续</button><button v-if="apiMode&&mode!=='local'&&(status==='enabled'||status==='error')" @click="localMode">改用本机演示</button></view>
   <view class="voice-tools"><button :disabled="busy" @click="microphone">{{listening?'停止收音':'语音提问'}}</button><button :disabled="!voiceOutputSupported()" @click="toggleRead">{{readAloud?'关闭语音朗读':'开启语音朗读'}}</button><text v-if="listening" role="status">正在听，请说话…</text></view>
   <text class="voice-note">点击语音提问后请求麦克风权限，识别文字后发送。浏览器语音服务可能联网处理音频；不支持时请打字。说“请帮我匹配初中数学，预算100元，线上，周六下午”可直接生成推荐。</text><text v-if="voiceError" class="companion-error" role="alert">{{voiceError}}</text>
   <view class="companion-compose"><textarea v-model="draft" :disabled="busy" maxlength="500" placeholder="和小书灵聊学习，或整理找家教的需求…" aria-label="对话内容"/><button :disabled="busy||!draft.trim()||(status==='checking'&&mode==='auto')" :loading="busy" @click="send">发送</button></view>
   <view class="companion-tools"><button v-if="apiMode&&status==='enabled'&&mode==='local'" :disabled="busy" @click="modelMode">使用模型对话</button><button @click="go('learning')">学习中心</button><button @click="go('map')">订单地图</button><button :disabled="busy" @click="reset">清空对话</button><button :aria-pressed="paused" @click="paused=!paused">{{paused?'恢复动作':'暂停动作'}}</button></view>
   <text class="companion-memory">对话仅保存在当前应用内存，刷新或切换账户会清空。</text>
  </view>
  <button v-if="!props.page" class="companion-launcher" :aria-expanded="open" aria-label="打开小书灵 AI 对话" @click="toggle">
   <view class="book-pet" aria-hidden="true"><view class="pet-leaf"/><view class="pet-wing left"/><view class="pet-wing right"/><view class="pet-body"><view class="pet-eyes"><view/><view/></view><view class="pet-mouth"/><view class="pet-pages"/></view><text class="pet-ai">AI</text></view><text class="pet-label">小书灵</text>
  </button>
 </view>
</template>
<style scoped>
.companion-root{position:fixed;right:18px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2200;font-size:14px;color:#294733;line-height:1.6}.companion-launcher{width:82px;min-height:92px;display:flex;flex-direction:column;align-items:center;padding:0;margin:0;background:transparent;line-height:1.2;border-radius:20px;overflow:visible}.book-pet{position:relative;width:68px;height:64px;animation:pet-float 4s ease-in-out infinite}.pet-body{position:absolute;inset:10px 8px 3px;background:#366449;border:2px solid #244e36;border-radius:21px 21px 14px 14px;box-shadow:0 5px 12px #23492f26}.pet-leaf{position:absolute;width:17px;height:13px;background:#94ba76;border-radius:2px 12px 2px 12px;top:0;left:32px;transform:rotate(-18deg)}.pet-wing{position:absolute;width:13px;height:25px;background:#6a9466;border:2px solid #315a3d;border-radius:12px;top:28px}.pet-wing.left{left:2px;transform:rotate(24deg)}.pet-wing.right{right:2px;transform:rotate(-24deg)}.pet-eyes{display:flex;justify-content:space-between;padding:12px 8px 0}.pet-eyes view{width:12px;height:14px;background:#fff9de;border-radius:50%;position:relative;animation:pet-blink 6s infinite}.pet-eyes view:after{content:'';position:absolute;background:#244e36;inset:4px 3px 3px 5px;border-radius:50%}.pet-mouth{width:9px;height:5px;border-bottom:2px solid #e9ce86;border-radius:50%;margin:0 auto}.pet-pages{height:7px;background:repeating-linear-gradient(#fffae8 0 2px,#a3b28d 2px 3px);border-radius:0 0 6px 6px;position:absolute;bottom:3px;left:7px;right:7px}.pet-ai{position:absolute;right:-3px;top:7px;border-radius:10px;background:#f2d994;color:#365034;padding:2px 5px;font-size:10px;font-weight:800}.pet-label{display:block;font-size:12px;background:#fffdf4;border:1px solid #bdcdb4;padding:4px 10px;border-radius:12px;box-shadow:0 3px 9px #2a4a3422}.companion-panel{position:absolute;right:0;bottom:102px;width:370px;max-width:calc(100vw - 28px);max-height:calc(100vh - 195px);display:flex;flex-direction:column;background:#fffef9;border:1px solid #adc3a8;border-radius:20px;box-shadow:0 14px 50px #263e3440;overflow:hidden}.companion-head{display:flex;justify-content:space-between;align-items:center;background:#eaf1e4;padding:13px 16px}.companion-title{display:block;font-size:17px;font-weight:700}.companion-source{display:block;font-size:11px;color:#657a60}.companion-close{margin:0;background:transparent;font-size:25px;padding:0 9px;line-height:1.6;color:#3b5d43}.companion-notice{font-size:11px;color:#66745e;line-height:1.6;padding:9px 14px;border-bottom:1px solid #e4ebdc}.companion-log{height:235px;min-height:95px;flex:1;overflow:hidden}.companion-message{margin:10px 12px;padding:10px 12px;border-radius:12px;background:#edf3e8;overflow-wrap:anywhere}.companion-message.user{background:#e5eee8;margin-left:44px}.message-label{display:block;font-size:10px;color:#6b7f65;margin-bottom:4px}.message-text{display:block;font-size:13px;white-space:pre-wrap;line-height:1.7}.message-action{margin:9px 0 0;font-size:12px;color:#2b633d;line-height:2.4;background:#fffdf2;border-radius:8px;padding:0 10px}.thinking{font-size:12px;padding:10px 16px;color:#718269}.companion-shortcuts,.companion-tools{display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px}.companion-shortcuts button,.companion-tools button{font-size:11px;line-height:2.5;margin:0;background:#eff3e9;color:#476844;border-radius:8px;padding:0 8px}.companion-compose{display:flex;align-items:flex-end;gap:8px;padding:8px 12px;border-top:1px solid #e1eadc}.companion-compose textarea{height:62px;width:0;flex:1;min-width:0;padding:8px;background:#f3f5ef;border-radius:9px;font-size:13px;box-sizing:border-box}.companion-compose button{margin:0;background:#365f40;color:white;font-size:13px;line-height:2.8;padding:0 12px;border-radius:9px}.companion-compose button[disabled]{opacity:.5}.companion-tools{padding-top:0}.companion-error{font-size:12px;line-height:1.6;color:#964b34;background:#fff0e8;padding:8px 12px}.companion-error button{display:inline-block;font-size:11px;line-height:2.3;margin:4px 5px 0 0;background:#f3dfc8;color:#705130;padding:0 8px}.companion-memory{font-size:10px;color:#78806f;padding:0 12px 9px}.motion-off .book-pet,.motion-off .pet-eyes view{animation:none}@keyframes pet-float{50%{transform:translateY(-5px) rotate(3deg)}}@keyframes pet-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.1)}}@media(max-width:700px){.companion-root{right:10px;bottom:calc(68px + env(safe-area-inset-bottom))}.companion-launcher{width:70px;min-height:84px}.companion-panel{bottom:92px;max-height:calc(100dvh - 180px);width:360px}.companion-log{height:200px}.companion-notice{padding:7px 12px}}@media(prefers-reduced-motion:reduce){.book-pet,.pet-eyes view{animation:none}}
.voice-tools{display:flex;align-items:center;gap:8px;padding:8px 12px}.voice-tools button{font-size:12px;margin:0;background:#e9f1e3;color:#345b3b;line-height:2.6;padding:0 10px}.voice-note{font-size:11px;color:#65775f;padding:0 14px 8px;line-height:1.6}.companion-fullpage{position:relative;right:auto;bottom:auto;max-width:850px;margin:auto;padding:18px 12px;z-index:1}.companion-fullpage .companion-panel{position:relative;right:auto;bottom:auto;width:100%;max-width:none;max-height:none;min-height:75vh;box-sizing:border-box}.companion-fullpage .companion-log{height:38vh;min-height:250px;flex:auto}.companion-fullpage .message-text{font-size:15px}.companion-fullpage .companion-compose textarea{height:80px}
</style>
