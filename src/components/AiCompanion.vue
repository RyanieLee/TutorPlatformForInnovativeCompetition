<script setup lang="ts">
import {computed,ref,toRefs,watch,nextTick,getCurrentInstance,onBeforeUnmount} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import {apiMode} from '../config/runtime'
import {currentSession,restoreSession} from '../utils/session'
import {errorMessage,BusinessError} from '../services/errors'
import {companionStatus,localChat,remoteChat,pendingCompanionBrief} from '../services/assistant'
import {companionState,clearCompanion,ownCompanion} from '../services/companion-state'
const {messages,history,draft,mode,busy,error,paused}=toRefs(companionState)
const open=ref(false),visible=ref(true),status=ref<'checking'|'enabled'|'disabled'|'error'>('checking'),loginNeeded=ref(false)
const instance='companion-'+getCurrentInstance()!.uid
const last=ref('');let statusVersion=0,running:number|null=null
const useModel=computed(()=>apiMode&&status.value==='enabled'&&mode.value==='auto')
watch(()=>currentSession.value?.user.id,id=>{ownCompanion(id??'guest');loginNeeded.value=false},{immediate:true})
async function checkStatus(){const v=++statusVersion;status.value='checking';try{const s=await companionStatus();if(v===statusVersion)status.value=s.enabled?'enabled':'disabled'}catch{if(v===statusVersion)status.value='error'}}
function stop(){visible.value=false;open.value=false;statusVersion++;if(running!==null&&running===companionState.version){companionState.version++;busy.value=false;error.value='上一条答复已中止，可重新发送';if(messages.value[messages.value.length-1]?.role==='user')messages.value.pop()}running=null}
onShow(()=>{visible.value=true})
onHide(stop);onBeforeUnmount(stop)
async function toggle(){open.value=!open.value;if(open.value)await checkStatus()}
async function bottom(){await nextTick();const lastMessage=messages.value[messages.value.length-1];last.value=instance+'-'+lastMessage.id}
function reset(){clearCompanion();loginNeeded.value=false}
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
  if(useModel.value){
   const session=await restoreSession();if(token!==companionState.version)return
   if(!session){loginNeeded.value=true;throw new BusinessError('UNAUTHORIZED','请先登录开发账户，再使用模型对话')}
   result=await remoteChat([...history.value.slice(-8),{role:'user',content:text}])
  }else result=localChat(text)
  if(token!==companionState.version)return
  messages.value.push({role:'assistant',content:result.reply,source:result.source,matchBrief:result.matchBrief,id:bubbleId+1})
  history.value=[...history.value.slice(-6),{role:'user',content:text},{role:'assistant',content:result.reply.slice(0,500)}]
  if(messages.value.length>30)messages.value=messages.value.slice(-30)
  draft.value='';void bottom()
 }catch(cause){if(token===companionState.version){error.value=cause instanceof Error?errorMessage(cause):'对话失败，请重试';if(messages.value[messages.value.length-1]?.id===bubbleId)messages.value.pop()}}
 finally{if(token===companionState.version)busy.value=false;running=null}
}
function ask(text:string){draft.value=text;void send()}
function startHomeworkReview(){draft.value='请帮我批改下面的作业，指出错误、解释理由并给修改建议：\n题目：\n我的答案：\n（选填）参考答案：'}
function go(where:'match'|'learning'|'map',brief?:string){
 if(brief)pendingCompanionBrief.value=brief
 const url=where==='match'?'/pages/match/index':where==='learning'?'/pages/learning/index':'/pages/order-map/index'
 const pages=getCurrentPages(),route=pages[pages.length-1]?.route
 open.value=false
 if(route===url.slice(1)){if(brief)uni.redirectTo({url});return}
 uni.navigateTo({url})
}
function login(){open.value=false;uni.navigateTo({url:'/pages/auth/login'})}
</script>
<template>
 <view v-if="visible" class="companion-root" :class="{'motion-off':paused}" @keydown.esc="open=false">
  <view v-if="open" class="companion-panel" role="dialog" aria-label="小书灵 AI 对话">
   <view class="companion-head"><view><text class="companion-title">小书灵 · 学习与平台助手</text><text class="companion-source">{{useModel?'服务端模型对话':status==='checking'&&mode==='auto'?'检查模型配置中':'本机演示 · 非大模型'}}</text></view><button aria-label="关闭AI对话" class="companion-close" @click="open=false">×</button></view>
   <text class="companion-notice">{{useModel?'发送你输入的对话，不自动发送账户、订单或定位。':'本机答复仅提供页面指引、知识笔记与需求整理，不能批改新题。'}} 可粘贴文字版题目和学生答案咨询批改建议（仅模型已配置时）。请勿输入私人信息；对话不会执行预约或改动订单。</text>
   <scroll-view scroll-y class="companion-log" :scroll-into-view="last" role="log" aria-live="polite">
    <view v-for="m in messages" :id="instance+'-'+m.id" :key="m.id" class="companion-message" :class="m.role"><text class="message-label">{{m.role==='user'?'你':m.source==='model'?'模型答复':m.source==='local'?'本机演示答复':'小书灵'}}</text><text class="message-text">{{m.content}}</text><button v-if="m.matchBrief" class="message-action" @click="go('match',m.matchBrief)">带入匹配需求 →</button></view>
    <view v-if="busy" class="thinking" role="status">正在整理答复…</view>
   </scroll-view>
   <view class="companion-shortcuts">
    <button :disabled="busy" @click="ask('平台怎么用')">使用指南</button>
    <button :disabled="busy" @click="ask('请解释一元一次方程的解题步骤')">解题答疑</button>
    <button :disabled="busy" @click="startHomeworkReview">作业批改</button>
    <button :disabled="busy" @click="ask('初中数学，预算100元，线上耐心讲解')">帮我找老师</button>
    <button :disabled="busy" @click="ask('怎么查看订单地图')">怎么看订单</button>
    <button :disabled="busy" @click="ask('一元一次方程怎么学习')">学习小问题</button>
   </view>
   <view v-if="error" class="companion-error" role="alert">{{error}}<button v-if="loginNeeded" @click="login">登录后继续</button><button v-if="apiMode&&mode!=='local'&&(status==='enabled'||status==='error')" @click="localMode">改用本机演示</button></view>
   <view class="companion-compose"><textarea v-model="draft" :disabled="busy" maxlength="500" placeholder="问知识点、贴文字题目与答案，或咨询平台怎么用…" aria-label="对话内容"/><button :disabled="busy||!draft.trim()||(status==='checking'&&mode==='auto')" :loading="busy" @click="send">发送</button></view>
   <view class="companion-tools"><button v-if="apiMode&&status==='enabled'&&mode==='local'" :disabled="busy" @click="modelMode">使用模型对话</button><button @click="go('learning')">学习中心</button><button @click="go('map')">订单地图</button><button :disabled="busy" @click="reset">清空对话</button><button :aria-pressed="paused" @click="paused=!paused">{{paused?'恢复动作':'暂停动作'}}</button></view>
   <text class="companion-memory">聊天只保存当前应用内存；作业批改意见仅供参考，需要老师再核对。</text>
  </view>
  <button class="companion-launcher" :aria-expanded="open" aria-label="打开小书灵 AI 对话" @click="toggle">
   <image class="mascot-img" src="/static/linghang-mascot.svg" mode="aspectFit" aria-hidden="true"/><text class="pet-label">小书灵</text>
  </button>
 </view>
</template>
<style scoped>
.companion-root{position:fixed;right:18px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2200;font-size:14px;color:#294733;line-height:1.6}.companion-launcher{width:82px;min-height:92px;display:flex;flex-direction:column;align-items:center;padding:0;margin:0;background:transparent;line-height:1.2;border-radius:20px;overflow:visible}.book-pet{position:relative;width:68px;height:64px;animation:pet-float 4s ease-in-out infinite}.pet-body{position:absolute;inset:10px 8px 3px;background:#366449;border:2px solid #244e36;border-radius:21px 21px 14px 14px;box-shadow:0 5px 12px #23492f26}.pet-leaf{position:absolute;width:17px;height:13px;background:#94ba76;border-radius:2px 12px 2px 12px;top:0;left:32px;transform:rotate(-18deg)}.pet-wing{position:absolute;width:13px;height:25px;background:#6a9466;border:2px solid #315a3d;border-radius:12px;top:28px}.pet-wing.left{left:2px;transform:rotate(24deg)}.pet-wing.right{right:2px;transform:rotate(-24deg)}.pet-eyes{display:flex;justify-content:space-between;padding:12px 8px 0}.pet-eyes view{width:12px;height:14px;background:#fff9de;border-radius:50%;position:relative;animation:pet-blink 6s infinite}.pet-eyes view:after{content:'';position:absolute;background:#244e36;inset:4px 3px 3px 5px;border-radius:50%}.pet-mouth{width:9px;height:5px;border-bottom:2px solid #e9ce86;border-radius:50%;margin:0 auto}.pet-pages{height:7px;background:repeating-linear-gradient(#fffae8 0 2px,#a3b28d 2px 3px);border-radius:0 0 6px 6px;position:absolute;bottom:3px;left:7px;right:7px}.pet-ai{position:absolute;right:-3px;top:7px;border-radius:10px;background:#f2d994;color:#365034;padding:2px 5px;font-size:10px;font-weight:800}.pet-label{display:block;font-size:12px;background:#fffdf4;border:1px solid #bdcdb4;padding:4px 10px;border-radius:12px;box-shadow:0 3px 9px #2a4a3422}.companion-panel{position:absolute;right:0;bottom:102px;width:370px;max-width:calc(100vw - 28px);max-height:calc(100vh - 195px);display:flex;flex-direction:column;background:#fffef9;border:1px solid #adc3a8;border-radius:20px;box-shadow:0 14px 50px #263e3440;overflow:hidden}.companion-head{display:flex;justify-content:space-between;align-items:center;background:#eaf1e4;padding:13px 16px}.companion-title{display:block;font-size:17px;font-weight:700}.companion-source{display:block;font-size:11px;color:#657a60}.companion-close{margin:0;background:transparent;font-size:25px;padding:0 9px;line-height:1.6;color:#3b5d43}.companion-notice{font-size:11px;color:#66745e;line-height:1.6;padding:9px 14px;border-bottom:1px solid #e4ebdc}.companion-log{height:235px;min-height:95px;flex:1;overflow:hidden}.companion-message{margin:10px 12px;padding:10px 12px;border-radius:12px;background:#edf3e8;overflow-wrap:anywhere}.companion-message.user{background:#e5eee8;margin-left:44px}.message-label{display:block;font-size:10px;color:#6b7f65;margin-bottom:4px}.message-text{display:block;font-size:13px;white-space:pre-wrap;line-height:1.7}.message-action{margin:9px 0 0;font-size:12px;color:#2b633d;line-height:2.4;background:#fffdf2;border-radius:8px;padding:0 10px}.thinking{font-size:12px;padding:10px 16px;color:#718269}.companion-shortcuts,.companion-tools{display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px}.companion-shortcuts button,.companion-tools button{font-size:11px;line-height:2.5;margin:0;background:#eff3e9;color:#476844;border-radius:8px;padding:0 8px}.companion-compose{display:flex;align-items:flex-end;gap:8px;padding:8px 12px;border-top:1px solid #e1eadc}.companion-compose textarea{height:62px;width:0;flex:1;min-width:0;padding:8px;background:#f3f5ef;border-radius:9px;font-size:13px;box-sizing:border-box}.companion-compose button{margin:0;background:#365f40;color:white;font-size:13px;line-height:2.8;padding:0 12px;border-radius:9px}.companion-compose button[disabled]{opacity:.5}.companion-tools{padding-top:0}.companion-error{font-size:12px;line-height:1.6;color:#964b34;background:#fff0e8;padding:8px 12px}.companion-error button{display:inline-block;font-size:11px;line-height:2.3;margin:4px 5px 0 0;background:#f3dfc8;color:#705130;padding:0 8px}.companion-memory{font-size:10px;color:#78806f;padding:0 12px 9px}.motion-off .book-pet,.motion-off .pet-eyes view{animation:none}@keyframes pet-float{50%{transform:translateY(-5px) rotate(3deg)}}@keyframes pet-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.1)}}@media(max-width:700px){.companion-root{right:10px;bottom:calc(68px + env(safe-area-inset-bottom))}.companion-launcher{width:70px;min-height:84px}.companion-panel{bottom:92px;max-height:calc(100dvh - 180px);width:360px}.companion-log{height:200px}.companion-notice{padding:7px 12px}}@media(prefers-reduced-motion:reduce){.book-pet,.pet-eyes view{animation:none}}
</style>
