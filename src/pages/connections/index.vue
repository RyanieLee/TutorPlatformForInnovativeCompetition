<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {onLoad,onShow,onHide,onUnload} from '@dcloudio/uni-app'
import TeachingShell from '../teaching/shared/TeachingShell.vue'
import {currentSession,restoreSession} from '../../utils/session'
import {apiMode} from '../../config/runtime'
import {bookingConnectionService,commuteReference,type BookingConnectionPage,type BookingMessageInput} from '../../services/booking-connection'
import {xianPlaces} from '../../services/location'
import {errorMessage} from '../../services/errors'
import {bookingStatusLabels} from '../../services/rules'
import type {BookingStatus} from '../../types/tutor'

const bookingId=ref(''),page=ref<BookingConnectionPage|null>(null),text=ref(''),error=ref(''),notice=ref(''),busy=ref(false),ready=ref(false)
const fromLabel=ref(''),toLabel=ref('')
const role=computed(()=>currentSession.value?.user.role)
const allowed=computed(()=>role.value==='parent'||role.value==='tutor')
const commute=computed(()=>commuteReference(fromLabel.value,toLabel.value))
const messages=computed(()=>[...(page.value?.messages??[])].reverse())
let active=false,generation=0,pending:BookingMessageInput|null=null
const owner=()=>currentSession.value
function clear(){generation++;page.value=null;text.value='';pending=null;error.value='';notice.value='';ready.value=false;busy.value=false;fromLabel.value='';toLabel.value=''}
function leave(){active=false;clear()}
watch(owner,()=>clear(),{flush:'sync'})
onLoad(options=>{bookingId.value=String(options?.bookingId??'')})
onShow(async()=>{
 active=true
 const token=++generation
 try{await restoreSession();if(active&&token===generation)await refresh()}
 catch(cause){if(active&&token===generation){error.value=errorMessage(cause);ready.value=true}}
 // restoreSession changes the session ref once; its identity watcher invalidates token.
 if(active&&!ready.value&&!busy.value)await refresh()
})
onHide(leave);onUnload(leave)
async function refresh(older=false){
 if(!active||busy.value||!allowed.value)return
 if(!bookingId.value){error.value='缺少预约编号，请从预约页进入沟通。';ready.value=true;return}
 const identity=owner(),token=++generation,cursor=older?page.value?.nextBeforeId:undefined
 if(older&&!cursor)return
 busy.value=true;error.value=''
 try{
  const result=await bookingConnectionService.list(bookingId.value,{pageSize:20,...(cursor?{beforeId:cursor}:{})})
  if(!active||token!==generation||identity!==owner())return
  page.value=older&&page.value?{...result,messages:[...page.value.messages,...result.messages]}:result
  if(!toLabel.value&&result.areaLabel)toLabel.value=result.areaLabel
  ready.value=true
 }catch(cause){if(active&&token===generation&&identity===owner()){error.value=errorMessage(cause);ready.value=true}}
 finally{if(token===generation)busy.value=false}
}
async function send(){
 if(!active||busy.value||!page.value?.canSend||!text.value.trim()||!allowed.value)return
 const identity=owner(),token=++generation
 const content=text.value.trim()
 if(!pending||pending.text!==content)pending={requestId:'msg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),text:content}
 busy.value=true;error.value='';notice.value=''
 try{
  const result=await bookingConnectionService.send(bookingId.value,pending)
  if(!active||token!==generation||identity!==owner())return
  if(page.value&&!page.value.messages.some(m=>m.id===result.id))page.value.messages=[result,...page.value.messages]
  text.value='';pending=null;notice.value=apiMode?'消息已发送。对方需要刷新才能看到。':'已保存在本机演示记录中。'
 }catch(cause){if(active&&token===generation&&identity===owner())error.value=errorMessage(cause)}
 finally{if(token===generation)busy.value=false}
}
function choose(which:'from'|'to',event:any){const point=xianPlaces[Number(event.detail.value)];if(point){if(which==='from')fromLabel.value=point.label;else toLabel.value=point.label}}
function openMap(){
 const value=commute.value
 if(!value)return
 // #ifdef H5
 window.open(value.mapUrl,'_blank','noopener,noreferrer')
 // #endif
 // #ifndef H5
 uni.setClipboardData({data:value.mapUrl,success:()=>uni.showToast({title:'路线查询链接已复制',icon:'none'})})
 // #endif
}
const login=()=>uni.navigateTo({url:'/pages/auth/login'})
const formatTime=(value:string)=>new Date(value).toLocaleString('zh-CN',{hour12:false})
</script>
<template>
 <TeachingShell title="预约沟通与通勤参考" :role="role">
  <view class="ai-review connections-page">
   <view class="ai-intro"><text class="ai-kicker">预约 / 沟通</text><text class="ai-heading">好好沟通，从这一课开始。</text><text class="ai-description">预约双方交流上课安排，出发前再查询实际路线。</text></view>
   <view v-if="!allowed" class="ai-state"><text>{{role==='admin'?'管理员不能读取预约双方的私信。':'请登录预约对应的家长或家教账户。'}}</text><button v-if="!currentSession" class="ai-primary" @click="login">前往登录</button></view>
   <template v-else>
    <view class="ai-state"><text>{{apiMode?'站内文字沟通，手动刷新消息；不提供实时推送。':'本机沟通演示，仅当前设备保存；不会自动生成教师或家长回复，也不跨设备同步。'}}</text></view>
    <text v-if="error" class="ai-error" role="alert">{{error}}</text>
    <view class="ai-review-grid">
     <view class="ai-glass">
      <view class="ai-card-head"><text>预约消息</text><text v-if="page" class="ai-pill">{{bookingStatusLabels[page.status as BookingStatus]||page.status}}</text></view>
      <text class="ai-hint">请只交流必要的上课安排，勿填写住址、电话等私人信息。</text>
      <view class="ai-actions"><button class="ai-secondary" :disabled="busy" @click="refresh(false)">{{busy?'正在读取…':'刷新消息与预约状态'}}</button><button v-if="page?.nextBeforeId" class="ai-secondary" :disabled="busy" @click="refresh(true)">查看更早记录</button></view>
      <text v-if="!ready" class="ai-empty" role="status">正在读取预约消息…</text>
      <text v-else-if="page&&!messages.length" class="ai-empty">还没有消息，可以先确认上课时间和准备材料。</text>
      <view v-if="page" class="messages" aria-label="预约消息记录"><view v-for="message in messages" :key="message.id" class="message" :class="{own:message.senderRole===role}"><view class="message-caption"><text>{{message.senderRole==='parent'?'家长':'家教'}}{{message.senderRole===role?' · 我':''}}</text><text>{{formatTime(message.createdAt)}}</text></view><text class="message-text">{{message.text}}</text></view></view>
      <template v-if="page">
       <view v-if="!page.canSend" class="ai-state ended">预约已结束，消息记录仅可查看。</view>
       <label v-else class="ai-field"><text>发送文字消息</text><textarea v-model="text" aria-label="发送文字消息" :disabled="busy" maxlength="1000" placeholder="例如：周六上课前请准备教材与上一份练习。"/><text class="ai-hint">{{text.length}} / 1000 字</text></label>
       <view v-if="page.canSend" class="ai-actions"><button class="ai-primary" :disabled="busy||!text.trim()" :loading="busy" @click="send">发送消息</button></view>
      </template>
      <text v-if="notice" class="ai-success" role="status">{{notice}}</text>
     </view>
     <view v-if="page" class="ai-glass commute-card">
      <view class="ai-card-head"><text>通勤参考</text><text class="ai-pill">公共片区</text></view>
      <text class="ai-hint">沿用订单地图的西安公共片区参考点（WGS84），不是学生或教师住址。</text>
      <label class="ai-field"><text>出发片区参考点</text><picker :range="xianPlaces" range-key="label" :value="Math.max(0,xianPlaces.findIndex(p=>p.label===fromLabel))" @change="choose('from',$event)"><view class="point-picker">{{fromLabel||'请选择出发公共片区'}}</view></picker></label>
      <label class="ai-field"><text>目的片区参考点</text><picker :range="xianPlaces" range-key="label" :value="Math.max(0,xianPlaces.findIndex(p=>p.label===toLabel))" @change="choose('to',$event)"><view class="point-picker">{{toLabel||'请选择目的公共片区'}}</view></picker></label>
      <text v-if="page.areaLabel" class="ai-hint">预约标注片区：{{page.areaLabel}}。可以调整查询参考点。</text><text v-else class="ai-hint">该预约未标注片区，请手动选择公共参考点。</text>
      <view v-if="commute" class="distance"><text class="distance-number">{{commute.distanceKm.toFixed(1)}} <text class="distance-unit">公里</text></text><text>两点直线距离</text></view>
      <text class="ai-hint commute-disclaimer">直线距离不是实际通勤路程。这里没有路况、公交或耗时数据；出发前请在地图中确认实际路线与时间。点击后会将所选公共片区坐标交给百度地图。</text>
      <view class="ai-actions"><button class="ai-secondary" :disabled="!commute" @click="openMap">在百度地图查询路线</button></view>
     </view>
    </view>
   </template>
  </view>
 </TeachingShell>
</template>
<style scoped src="../../styles/ai-workspace.css"></style>
<style scoped>
.connections-page{padding-bottom:36px;overflow-wrap:anywhere}.messages{display:flex;flex-direction:column;gap:14px;margin-top:22px;max-height:480px;overflow:auto;padding:2px}.message{max-width:90%;padding:13px 16px;border:1px solid var(--ai-border);border-radius:14px;background:#f6f7ee;align-self:flex-start;box-sizing:border-box}.message.own{background:#e7eedf;align-self:flex-end}.message-caption{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:11px;color:var(--ai-muted);margin-bottom:7px}.message-text{white-space:pre-wrap;overflow-wrap:anywhere}.point-picker{padding:12px 14px;border:1px solid var(--ai-border);background:#fffefa;border-radius:12px;font-size:15px}.commute-card .ai-hint{margin-top:10px}.distance{display:flex;flex-direction:column;margin:24px 0 18px;color:var(--ai-green);font-size:13px}.distance-number{font-size:44px;line-height:1.4;font-weight:600}.distance-unit{font-size:16px}.commute-disclaimer{padding-top:18px;border-top:1px solid var(--ai-border)}.ended{margin-top:22px}.connections-page .ai-review-grid{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}@media(max-width:760px){.connections-page .ai-review-grid{grid-template-columns:minmax(0,1fr)}.message{max-width:96%}.message-caption{font-size:11px}.distance-number{font-size:36px}}
</style>
