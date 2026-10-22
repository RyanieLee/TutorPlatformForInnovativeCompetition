<script setup lang="ts">
import {computed,ref,toRefs,watch,nextTick,getCurrentInstance,onBeforeUnmount} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import {apiMode} from '../config/runtime'
import {currentSession,restoreSession} from '../utils/session'
import {errorMessage,BusinessError} from '../services/errors'
import {companionStatus,localChat,remoteChat,pendingCompanionBrief,pendingCompanionAuto,homeworkImageReviewStatus,reviewHomeworkImage as requestHomeworkImage} from '../services/assistant'
import {companionState,clearCompanion,ownCompanion} from '../services/companion-state'
import {createVoiceInput,speakReply,stopVoiceOutput,voiceOutputSupported} from '../services/voice'
import {matchingCommand} from '../services/assistant-command'
const props=withDefaults(defineProps<{page?:boolean;starter?:'match'|'guide'|''}>(),{page:false,starter:''})
const advancedOpen=ref(false)
let starterApplied=false
const listening=ref(false),readAloud=ref(false),voiceError=ref('')
const voice=createVoiceInput({text:text=>{listening.value=false;draft.value=text;void send()},error:message=>{listening.value=false;voiceError.value=message},end:()=>{listening.value=false}})
function microphone(){if(busy.value||(status.value==='checking'&&mode.value==='auto'))return;voiceError.value='';if(listening.value){voice.stop();listening.value=false;return}stopVoiceOutput();listening.value=true;voice.start();if(!voice.supported)listening.value=false}
function toggleRead(){readAloud.value=!readAloud.value;if(!readAloud.value)stopVoiceOutput()}
const {messages,history,draft,mode,busy,error,paused}=toRefs(companionState)
const open=ref(props.page),visible=ref(true),status=ref<'checking'|'enabled'|'disabled'|'error'>('checking'),loginNeeded=ref(false)
const homeworkStatus=ref<'checking'|'enabled'|'disabled'|'error'>('checking'),homeworkEnabled=ref(false),imagePath=ref(''),imageConsent=ref(false)
const instance='companion-'+getCurrentInstance()!.uid
const last=ref('');let statusVersion=0,running:number|null=null,lastPendingUserId:number|null=null
const useModel=computed(()=>apiMode&&status.value==='enabled'&&mode.value==='auto')
watch(()=>currentSession.value?.user.id,id=>{ownCompanion(id??'guest');loginNeeded.value=false;imagePath.value='';imageConsent.value=false},{immediate:true})
async function checkStatus(){const v=++statusVersion;status.value='checking';homeworkStatus.value='checking';try{const s=await companionStatus();if(v===statusVersion)status.value=s.enabled?'enabled':'disabled'}catch{if(v===statusVersion)status.value='error'}try{const h=await homeworkImageReviewStatus();if(v===statusVersion){homeworkEnabled.value=h.enabled;homeworkStatus.value=h.enabled?'enabled':'disabled'}}catch{if(v===statusVersion){homeworkEnabled.value=false;homeworkStatus.value='error'}}}
function stop(){voice.stop();stopVoiceOutput();listening.value=false;visible.value=false;open.value=false;statusVersion++;if(running!==null&&running===companionState.version){companionState.version++;busy.value=false;error.value='上一条答复已中止，可重新发送';if(lastPendingUserId!==null&&messages.value[messages.value.length-1]?.id===lastPendingUserId)messages.value.pop()}lastPendingUserId=null;imagePath.value='';imageConsent.value=false;running=null}
onShow(()=>{visible.value=true;if(props.page){open.value=true;if(props.starter&&!starterApplied){starterApplied=true;if(!draft.value.trim())draft.value=props.starter==='match'?'请帮我匹配初中数学，预算100元，线上，周六下午':'平台怎么使用？'}void checkStatus()}})
onHide(stop);onBeforeUnmount(stop)
async function toggle(){if(!props.page){uni.navigateTo({url:'/pages/assistant/index'});return}open.value=!open.value;if(open.value)await checkStatus()}
async function bottom(){await nextTick();const lastMessage=messages.value[messages.value.length-1];last.value=instance+'-'+lastMessage.id}
function reset(){voice.stop();stopVoiceOutput();listening.value=false;clearCompanion();loginNeeded.value=false;clearHomeworkImage()}
function modelMode(){const text=draft.value;reset();mode.value='auto';draft.value=text}
function localMode(){const text=draft.value;reset();mode.value='local';draft.value=text}
async function send(){
 const text=draft.value.trim();if(!text||busy.value)return
 if(text.length>500){error.value='每条消息最多500字';return}
 if(apiMode&&status.value==='checking'&&mode.value==='auto')return
 if(apiMode&&status.value==='error'&&mode.value==='auto'){error.value='模型状态暂不可读取，可主动切换本机演示';return}
 error.value='';loginNeeded.value=false
 const token=++companionState.version;running=token;busy.value=true
 const bubbleId=token*2;lastPendingUserId=bubbleId;messages.value.push({role:'user',content:text,source:'guide',id:bubbleId});void bottom()
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
 }catch(cause){if(token===companionState.version){error.value=cause instanceof Error?errorMessage(cause):'对话失败，请重试';if(messages.value[messages.value.length-1]?.id===bubbleId)messages.value.pop();if(lastPendingUserId===bubbleId)lastPendingUserId=null}}
 finally{if(token===companionState.version)busy.value=false;if(lastPendingUserId===bubbleId)lastPendingUserId=null;if(running===token)running=null}
}
function ask(text:string){draft.value=text;void send()}
function startHomeworkReview(){draft.value='请帮我批改下面的作业，指出错误、解释理由并给修改建议：\n题目：\n我的答案：\n（选填）参考答案：'}
function selectHomeworkImage(){
 const version=companionState.version,owner=currentSession.value?.user.id??'guest'
 uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera'],success:result=>{
  if(!visible.value||version!==companionState.version||owner!==(currentSession.value?.user.id??'guest'))return
  const path=result.tempFilePaths?.[0]
  if(path){imagePath.value=path;imageConsent.value=false;error.value='';loginNeeded.value=false}
 },fail:result=>{if(!String(result.errMsg??'').toLowerCase().includes('cancel'))error.value='无法选择图片，请检查浏览器或设备的图片权限'}})
}
function clearHomeworkImage(){imagePath.value='';imageConsent.value=false}
async function reviewSelectedImage(){
 if(busy.value)return
 if(!imagePath.value){error.value='请先选择一张作业图片';return}
 if(!imageConsent.value){error.value='请先确认图片已脱敏，并同意发送给模型服务处理';return}
 if(!apiMode){error.value='当前为本机演示模式，图片批改需要启动开发 API 并配置支持图片输入的模型。你可以粘贴文字版题目与答案。';return}
 if(homeworkStatus.value==='checking'){error.value='正在检查图片批改服务配置，请稍后再试';return}
 if(!homeworkEnabled.value){error.value='服务端尚未配置支持图片输入的模型。请配置视觉模型，或粘贴文字版题目与答案。';return}
 error.value='';loginNeeded.value=false
 const path=imagePath.value,token=++companionState.version;running=token;busy.value=true
 try{
  const session=await restoreSession()
  if(token!==companionState.version||!visible.value||imagePath.value!==path||!imageConsent.value)return
  if(!session){loginNeeded.value=true;throw new BusinessError('UNAUTHORIZED','请先登录家长或大学生家教演示账户，再使用图片批改')}
  if(session.user.id!==currentSession.value?.user.id)return
  if(!['parent','tutor'].includes(session.user.role))throw new BusinessError('FORBIDDEN','当前身份不能使用图片批改，请切换家长或大学生家教身份')
  const result=await requestHomeworkImage(path)
  if(token!==companionState.version)return
  const bubbleId=token*2
  messages.value.push({role:'user',content:'【作业图片】已提交一张经确认脱敏的图片，请求逐题讲解。',source:'guide',id:bubbleId})
  messages.value.push({role:'assistant',content:result.reply,source:result.source,id:bubbleId+1})
  if(messages.value.length>30)messages.value=messages.value.slice(-30)
  clearHomeworkImage();void bottom()
 }catch(cause){
  if(token===companionState.version){error.value=errorMessage(cause);if(cause instanceof BusinessError&&cause.code==='UNAUTHORIZED')loginNeeded.value=true}
 }finally{if(token===companionState.version)busy.value=false;if(running===token)running=null}
}
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
   <view class="companion-head"><image v-if="props.page" class="mascot-img" src="/static/linghang-mascot.svg" mode="aspectFit" aria-hidden="true"/><view><text class="companion-title">小书灵 · 学习与平台助手</text><text class="companion-source">{{useModel?'服务端模型对话':status==='checking'&&mode==='auto'?'检查模型配置中':'本机演示 · 非大模型'}}</text></view><button v-if="!props.page" aria-label="关闭AI对话" class="companion-close" @click="open=false">×</button></view>
   <text class="companion-notice">{{useModel?'已连接服务端模型：可问学科知识、分步讲题、检查文字作业和修改作文。':'本机演示可查平台说明、整理找老师需求和检索固定笔记；新题答疑、文字批改与作文修改需要模型配置。'}} 图片批改需单独选择图片、配置视觉模型并同意发送。不会自动读取账户或操作预约。</text>
   <scroll-view scroll-y class="companion-log" :scroll-into-view="last" role="log" aria-live="polite">
    <view v-for="m in messages" :id="instance+'-'+m.id" :key="m.id" class="companion-message" :class="m.role"><text class="message-label">{{m.role==='user'?'你':m.source==='model'?'模型答复':m.source==='local'?'本机演示答复':'小书灵'}}</text><text class="message-text">{{m.content}}</text><button v-if="m.matchBrief" class="message-action" @click="go('match',m.matchBrief)">带入匹配需求 →</button></view>
    <view v-if="busy" class="thinking" role="status">正在整理答复…</view>
   </scroll-view>
   <view class="companion-shortcuts">
    <button :disabled="busy" @click="ask('平台怎么用')">使用指南</button>
    <button :disabled="busy" @click="ask('请解释一元一次方程的解题步骤')">解题答疑</button>
    <button :disabled="busy" @click="startHomeworkReview">作业批改</button>
    <button :disabled="busy" @click="ask('怎样批改作文、找出错别字？')">作文修改</button>
    <button :disabled="busy" @click="ask('初中数学，预算100元，线上耐心讲解')">帮我找老师</button>
    <button :disabled="busy" @click="ask('家长怎样使用平台？')">家长使用</button>
   </view>
   <view v-if="error" class="companion-error" role="alert">{{error}}<button v-if="loginNeeded" @click="login">登录后继续</button><button v-if="apiMode&&mode!=='local'&&(status==='enabled'||status==='error')" @click="localMode">改用本机演示</button></view>
   <view class="voice-tools"><button role="button" tabindex="0" :aria-disabled="busy||(status==='checking'&&mode==='auto')" :disabled="busy||(status==='checking'&&mode==='auto')" @keydown.enter.prevent="microphone" @click="microphone">{{listening?'停止收音':'语音提问'}}</button><button :disabled="!voiceOutputSupported()" @click="toggleRead">{{readAloud?'关闭语音朗读':'开启语音朗读'}}</button><text v-if="listening" role="status">正在听，请说话…</text></view>
   <text class="voice-note">点击语音后请求麦克风权限，识别文字后发送；浏览器语音服务可能联网处理音频，不支持时可打字。</text><text v-if="voiceError" class="companion-error" role="alert">{{voiceError}}</text>
   <view class="companion-compose"><textarea v-model="draft" :disabled="busy" maxlength="500" placeholder="问知识点、贴文字题目与答案，或咨询平台怎么用…" aria-label="对话内容"/><button :disabled="busy||!draft.trim()||(status==='checking'&&mode==='auto')" :loading="busy" @click="send">发送</button></view>
   <view class="companion-tools"><button :aria-expanded="advancedOpen" @click="advancedOpen=!advancedOpen">{{advancedOpen?'收起更多工具':'图片与学习工具'}}</button><button v-if="apiMode&&status==='enabled'&&mode==='local'" :disabled="busy" @click="modelMode">使用模型对话</button><button @click="go('learning')">学习中心</button><button @click="go('map')">订单地图</button><button :disabled="busy" @click="reset">清空对话</button><button :aria-pressed="paused" @click="paused=!paused">{{paused?'恢复动作':'暂停动作'}}</button></view>
   <view v-if="advancedOpen" class="companion-advanced">   <view class="homework-image-tools">
    <view class="homework-image-heading"><text>作业图片批改</text><text class="homework-image-status">{{homeworkStatus==='enabled'?'模型已配置（需支持图片）':homeworkStatus==='checking'?'检查图片服务…':homeworkStatus==='error'?'服务状态暂不可读取':'需要配置视觉模型'}}</text></view>
    <view class="homework-image-row">
     <button :disabled="busy" class="homework-image-pick" @click="selectHomeworkImage">选择图片</button>
     <image v-if="imagePath" class="homework-image-preview" :src="imagePath" mode="aspectFit" aria-label="待批改作业图片预览"/>
     <button v-if="imagePath" :disabled="busy" class="homework-image-remove" @click="clearHomeworkImage">移除</button>
    </view>
    <button class="homework-image-consent" :disabled="busy" :aria-pressed="imageConsent" @click="imageConsent=!imageConsent">{{imageConsent?'☑':'□'}} 我已遮挡姓名、学校等个人信息，并同意将图片发送给已配置的模型服务处理。</button>
    <text class="homework-image-note">{{!apiMode?'本机演示不支持图片识别；可粘贴文字题目。':homeworkEnabled?'支持 JPG、PNG、WebP，单张不超过3 MiB。图片不会保存到本平台数据库，但会发送给模型服务。':'需要在服务端配置支持图片输入的视觉模型；普通文字模型可能不支持。'}}</text>
    <button class="homework-image-submit" role="button" :aria-disabled="busy||!imagePath||!imageConsent||!homeworkEnabled" :disabled="busy||!imagePath||!imageConsent||!homeworkEnabled" :loading="busy" @click="reviewSelectedImage">上传并批改</button>
   </view>
   <view class="companion-shortcuts">
    <button :disabled="busy" @click="ask('学生如何使用平台学习和练习？')">学生学习</button>
    <button :disabled="busy" @click="ask('一元一次方程怎么学习')">学习小问题</button>
    <button :disabled="busy" @click="ask('请帮我制定一周的复习计划，每天30分钟')">学习规划</button>
    <button :disabled="busy" @click="ask('语音提问和语音朗读怎么使用？')">语音帮助</button>
   </view>
</view>
   <text class="companion-memory">聊天只保存当前应用内存；作业批改意见仅供参考，需要老师再核对。</text>
  </view>
  <button v-if="!props.page" class="companion-launcher" :aria-expanded="open" aria-label="打开小书灵 AI 对话" @click="toggle">
   <image class="mascot-img" src="/static/linghang-mascot.svg" mode="aspectFit" aria-hidden="true"/><text class="pet-label">小书灵</text>
  </button>
 </view>
</template>
<style scoped>
.companion-root{position:fixed;right:18px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2200;font-size:14px;color:#294733;line-height:1.6}.companion-launcher{width:82px;min-height:92px;display:flex;flex-direction:column;align-items:center;padding:0;margin:0;background:transparent;line-height:1.2;border-radius:20px;overflow:visible}.book-pet{position:relative;width:68px;height:64px;animation:pet-float 4s ease-in-out infinite}.pet-body{position:absolute;inset:10px 8px 3px;background:#366449;border:2px solid #244e36;border-radius:21px 21px 14px 14px;box-shadow:0 5px 12px #23492f26}.pet-leaf{position:absolute;width:17px;height:13px;background:#94ba76;border-radius:2px 12px 2px 12px;top:0;left:32px;transform:rotate(-18deg)}.pet-wing{position:absolute;width:13px;height:25px;background:#6a9466;border:2px solid #315a3d;border-radius:12px;top:28px}.pet-wing.left{left:2px;transform:rotate(24deg)}.pet-wing.right{right:2px;transform:rotate(-24deg)}.pet-eyes{display:flex;justify-content:space-between;padding:12px 8px 0}.pet-eyes view{width:12px;height:14px;background:#fff9de;border-radius:50%;position:relative;animation:pet-blink 6s infinite}.pet-eyes view:after{content:'';position:absolute;background:#244e36;inset:4px 3px 3px 5px;border-radius:50%}.pet-mouth{width:9px;height:5px;border-bottom:2px solid #e9ce86;border-radius:50%;margin:0 auto}.pet-pages{height:7px;background:repeating-linear-gradient(#fffae8 0 2px,#a3b28d 2px 3px);border-radius:0 0 6px 6px;position:absolute;bottom:3px;left:7px;right:7px}.pet-ai{position:absolute;right:-3px;top:7px;border-radius:10px;background:#f2d994;color:#365034;padding:2px 5px;font-size:10px;font-weight:800}.pet-label{display:block;font-size:12px;background:#fffdf4;border:1px solid #bdcdb4;padding:4px 10px;border-radius:12px;box-shadow:0 3px 9px #2a4a3422}.companion-panel{position:absolute;right:0;bottom:102px;width:370px;max-width:calc(100vw - 28px);max-height:calc(100vh - 195px);display:flex;flex-direction:column;background:#fffef9;border:1px solid #adc3a8;border-radius:20px;box-shadow:0 14px 50px #263e3440;overflow:hidden}.companion-head{display:flex;justify-content:space-between;align-items:center;background:#eaf1e4;padding:13px 16px}.companion-title{display:block;font-size:17px;font-weight:700}.companion-source{display:block;font-size:11px;color:#657a60}.companion-close{margin:0;background:transparent;font-size:25px;padding:0 9px;line-height:1.6;color:#3b5d43}.companion-notice{font-size:11px;color:#66745e;line-height:1.6;padding:9px 14px;border-bottom:1px solid #e4ebdc}.companion-log{height:235px;min-height:95px;flex:1;overflow:hidden}.companion-message{margin:10px 12px;padding:10px 12px;border-radius:12px;background:#edf3e8;overflow-wrap:anywhere}.companion-message.user{background:#e5eee8;margin-left:44px}.message-label{display:block;font-size:10px;color:#6b7f65;margin-bottom:4px}.message-text{display:block;font-size:13px;white-space:pre-wrap;line-height:1.7}.message-action{margin:9px 0 0;font-size:12px;color:#2b633d;line-height:2.4;background:#fffdf2;border-radius:8px;padding:0 10px}.thinking{font-size:12px;padding:10px 16px;color:#718269}.companion-shortcuts,.companion-tools{display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px}.companion-shortcuts button,.companion-tools button{font-size:11px;line-height:2.5;margin:0;background:#eff3e9;color:#476844;border-radius:8px;padding:0 8px}.companion-compose{display:flex;align-items:flex-end;gap:8px;padding:8px 12px;border-top:1px solid #e1eadc}.companion-compose textarea{height:62px;width:0;flex:1;min-width:0;padding:8px;background:#f3f5ef;border-radius:9px;font-size:13px;box-sizing:border-box}.companion-compose button{margin:0;background:#365f40;color:white;font-size:13px;line-height:2.8;padding:0 12px;border-radius:9px}.companion-compose button[disabled]{opacity:.5}.companion-tools{padding-top:0}.companion-error{font-size:12px;line-height:1.6;color:#964b34;background:#fff0e8;padding:8px 12px}.companion-error button{display:inline-block;font-size:11px;line-height:2.3;margin:4px 5px 0 0;background:#f3dfc8;color:#705130;padding:0 8px}.companion-memory{font-size:10px;color:#78806f;padding:0 12px 9px}.motion-off .book-pet,.motion-off .pet-eyes view{animation:none}@keyframes pet-float{50%{transform:translateY(-5px) rotate(3deg)}}@keyframes pet-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.1)}}@media(max-width:700px){.companion-root{right:10px;bottom:calc(68px + env(safe-area-inset-bottom))}.companion-launcher{width:70px;min-height:84px}.companion-panel{bottom:92px;max-height:calc(100dvh - 180px);width:360px}.companion-log{height:200px}.companion-notice{padding:7px 12px}}@media(prefers-reduced-motion:reduce){.book-pet,.pet-eyes view{animation:none}}
.voice-tools{display:flex;align-items:center;gap:8px;padding:8px 12px}.voice-tools button{font-size:12px;margin:0;background:#e9f1e3;color:#345b3b;line-height:2.6;padding:0 10px}.voice-note{font-size:11px;color:#65775f;padding:0 14px 8px;line-height:1.6}.companion-fullpage{position:relative;right:auto;bottom:auto;max-width:850px;margin:auto;padding:18px 12px;z-index:1}.companion-fullpage .companion-panel{position:relative;right:auto;bottom:auto;width:100%;max-width:none;max-height:none;min-height:75vh;box-sizing:border-box}.companion-fullpage .companion-log{height:38vh;min-height:250px;flex:auto}.companion-fullpage .message-text{font-size:15px}.companion-fullpage .companion-compose textarea{height:80px}

.homework-image-tools{margin:6px 12px 4px;padding:11px 12px;border:1px solid #d9eae7;border-radius:16px;background:rgba(239,250,248,.84)}
.homework-image-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#285d69;font-size:12px;font-weight:700}
.homework-image-status{font-size:10px;font-weight:500;color:#5b8a8b;text-align:right}
.homework-image-row{display:flex;align-items:center;gap:8px;margin-top:8px}
.homework-image-pick,.homework-image-remove,.homework-image-submit{margin:0;border-radius:100px;font-size:11px;line-height:2.5;padding:0 12px}
.homework-image-pick{background:#e1f4f1;color:#246c75}
.homework-image-remove{background:#fff0e9;color:#945c4a}
.homework-image-preview{width:64px;height:64px;border:1px solid #fff;border-radius:10px;background:#fff}
.homework-image-consent{margin:8px 0 0!important;padding:5px 0!important;text-align:left!important;white-space:normal;font-size:10px!important;line-height:1.55!important;background:transparent!important;color:#587b81!important}
.homework-image-note{display:block;margin-top:4px;font-size:10px;line-height:1.55;color:#68868d}
.homework-image-submit{width:100%;margin-top:7px!important;background:linear-gradient(110deg,#59bda9,#14828b)!important;color:#fff!important}
.homework-image-submit[disabled]{opacity:.45}

.companion-fullpage{padding:8px 12px 20px}.companion-fullpage .companion-head{padding:10px 14px;gap:12px}.companion-fullpage .companion-head .mascot-img{width:46px;height:46px;flex-shrink:0}.companion-fullpage .companion-title{font-size:17px}.companion-fullpage .companion-panel{min-height:0;animation:none}.companion-fullpage .companion-log{height:clamp(120px,23vh,230px);min-height:120px;flex:none}.companion-fullpage .companion-compose textarea{height:72px}.companion-shortcuts button,.companion-tools button,.voice-tools button{min-height:44px;display:flex;align-items:center;line-height:1.4}.companion-notice{color:#506b78}.companion-memory{color:#597078}.companion-advanced{border-top:1px solid #dbe8ed;padding-top:8px}.companion-fullpage .companion-compose button{min-height:44px}
@media(max-width:700px){.companion-fullpage .companion-message{margin:7px 10px;padding:8px 10px}.companion-fullpage .message-text{font-size:14px}.companion-fullpage .companion-source{font-size:11px}.companion-fullpage .companion-notice{font-size:11px;padding:7px 12px}.companion-fullpage .companion-shortcuts,.companion-fullpage .companion-tools{padding-top:5px;padding-bottom:5px}.companion-fullpage .voice-note{font-size:10px;padding-bottom:4px}.companion-fullpage .companion-tools{gap:4px}.companion-fullpage .companion-tools button{font-size:10px;padding:0 6px}}

/* Glass visual refinements for the current voice-enabled companion; keep all handlers intact. */
.companion-root .companion-panel{
 background:rgba(250,254,255,.95);border:1px solid #ffffff;
 border-radius:26px;box-shadow:0 24px 66px #356e8938;
 backdrop-filter:blur(25px);-webkit-backdrop-filter:blur(25px);
}
.companion-root .companion-head{
 background:linear-gradient(112deg,rgba(225,248,242,.98),rgba(228,241,255,.97));
 border-bottom:1px solid #ffffffd9;
}
.companion-root .companion-title{color:#1b4d61;font-weight:800;letter-spacing:.01em}
.companion-root .companion-source{color:#658592}
.companion-root .companion-close{background:rgba(255,255,255,.78);border:1px solid #fff;color:#3b7080;border-radius:12px}
.companion-root .companion-notice{
 color:#597d8b;background:rgba(246,252,255,.82);border-bottom-color:#e3f0f2;
}
.companion-root .companion-message{
 background:rgba(229,248,244,.94);border:1px solid #ffffffd9;border-radius:16px;
 box-shadow:0 5px 14px #5b9b9a0c;
}
.companion-root .companion-message.user{background:rgba(231,241,255,.96);border-color:#ffffffd9}
.companion-root .message-label{color:#658592;font-weight:650}
.companion-root .message-text{color:#284e60;line-height:1.75}
.companion-root .message-action,.companion-root .companion-compose button{
 background:linear-gradient(110deg,#59bda9,#14858f);color:#fff;border-radius:100px;
 box-shadow:0 7px 16px #368e9225;
}
.companion-root .companion-shortcuts{
 display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:9px 12px;
}
.companion-root .companion-shortcuts button,.companion-root .companion-tools button{
 min-width:0;white-space:normal;font-size:11px;line-height:1.45;min-height:38px;
 margin:0;background:rgba(231,247,247,.95);border:1px solid #ffffff;
 color:#307582;border-radius:100px;padding:7px 8px;transition:transform .2s ease,background .2s ease;
}
.companion-root .voice-tools{display:flex;align-items:center;gap:8px;padding:8px 12px}
.companion-root .voice-tools button{
 margin:0;min-height:44px;display:flex;align-items:center;background:rgba(231,247,247,.95);border:1px solid #fff;
 color:#307582;border-radius:100px;padding:0 13px;font-size:12px;
}
.companion-root .voice-tools text,.companion-root .voice-note{color:#688692}
.companion-root .companion-compose{
 border-top:1px solid #e0eef1;background:rgba(255,255,255,.64);
}
.companion-root .companion-compose textarea{
 background:rgba(241,249,251,.96);border:1px solid #d9eaef;border-radius:15px;color:#244b5d;
}
.companion-root .companion-error{
 color:#8c4b3b;background:rgba(255,241,234,.95);border:1px solid #fff;border-radius:14px;
}
.companion-root .companion-error button{background:#f7e2d4;color:#784d3c;border-radius:100px}
.companion-root .companion-memory{color:#77909a}
.companion-root .companion-advanced{
 border-top:1px solid #e0eef1;padding-top:8px;max-height:38vh;overflow-y:auto;overscroll-behavior:contain;
}
.companion-root .homework-image-tools{
 margin:6px 12px 4px;padding:12px;border:1px solid #ffffff;border-radius:18px;
 background:linear-gradient(118deg,rgba(235,250,247,.94),rgba(239,247,255,.94));
 box-shadow:0 8px 20px #6395a313;
}
.companion-root .homework-image-heading{color:#285d69}
.companion-root .homework-image-status,.companion-root .homework-image-note{color:#68868d}
.companion-root .homework-image-pick,.companion-root .homework-image-remove{
 border:1px solid #fff;border-radius:100px;padding:0 13px;
}
.companion-root .homework-image-pick{background:#dff4ef;color:#246c75}
.companion-root .homework-image-remove{background:#fff0e9;color:#945c4a}
.companion-root .homework-image-consent{color:#587b81!important}
.companion-root .homework-image-submit{
 background:linear-gradient(110deg,#59bda9,#14858f)!important;color:#fff!important;
 border:0!important;border-radius:100px;box-shadow:0 7px 15px #368e9220;
}
.companion-root .mascot-img{filter:drop-shadow(0 11px 16px #4a8ca42b)}
.companion-root .pet-label{
 color:#276879;background:rgba(255,255,255,.92);border:1px solid #fff;border-radius:100px;
 box-shadow:0 7px 18px #527e9420;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
}
.companion-root button:focus-visible,.companion-root textarea:focus-visible{outline:3px solid #268aaf;outline-offset:2px}
@media(hover:hover) and (pointer:fine){
 .companion-root .companion-shortcuts button:hover,.companion-root .companion-tools button:hover,.companion-root .voice-tools button:hover{transform:translateY(-1px);background:#dff3f1}
 .companion-root .companion-launcher:hover{transform:translateY(-3px)}
}
@media(max-width:700px){
 .companion-root .companion-shortcuts,.companion-root .companion-tools{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px 10px}
 .companion-root .companion-shortcuts button,.companion-root .companion-tools button{font-size:11px;min-height:40px}
 .companion-root .companion-advanced{max-height:35dvh}
 .companion-root .homework-image-tools{margin:5px 10px;padding:10px}
 .companion-root .voice-tools{flex-wrap:wrap}
}
@media(prefers-reduced-motion:reduce){
 .companion-root .mascot-img,.companion-root .companion-panel{animation:none!important;transition:none!important;transform:none!important}
 .companion-root .companion-shortcuts button,.companion-root .companion-tools button,.companion-root .companion-launcher{transition:none!important}
}
@media(prefers-reduced-transparency:reduce),(prefers-contrast:more){
 .companion-root .companion-panel,.companion-root .companion-head,.companion-root .companion-notice,.companion-root .companion-message,.companion-root .homework-image-tools{background:#fff!important;backdrop-filter:none!important;border-color:#8db5be!important}
}

@media(max-width:700px){
 .companion-root.companion-fullpage .companion-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:6px 10px}
 .companion-root.companion-fullpage .companion-shortcuts button{min-height:34px;font-size:10px;padding:5px 4px}
 .companion-root.companion-fullpage .companion-tools{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:5px 10px}
 .companion-root.companion-fullpage .companion-tools button{min-height:34px;font-size:10px;padding:5px 4px}
 .companion-root.companion-fullpage .companion-log{height:clamp(100px,18vh,145px);min-height:100px}
 .companion-root.companion-fullpage .companion-compose textarea{height:60px}
 .companion-root.companion-fullpage .voice-note{max-height:30px;overflow:hidden}
}
</style>
