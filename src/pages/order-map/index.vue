<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import {onLoad,onShow,onHide} from '@dcloudio/uni-app'
import ParentLayout from '../../components/ParentLayout.vue'
import XianLocationPicker from '../../components/XianLocationPicker.vue'
import {currentSession,restoreSession} from '../../utils/session'
import {businessService} from '../../services/business'
import {apiMode} from '../../config/runtime'
import {bookingStatusLabels} from '../../services/rules'
import {errorMessage} from '../../services/errors'
import {exampleMapOrders,orderStatusColors,groupedOrders} from '../../services/order-map'
import type {OrderMapItem} from '../../types/order-map'
import type {BookingStatus} from '../../types/tutor'
const mode=ref<'account'|'example'>('account'),items=ref<OrderMapItem[]>([]),total=ref(0),page=ref(1),pageSize=20
const status=ref<BookingStatus|undefined>(),selectedArea=ref(''),selectedId=ref(''),busy=ref(false),ready=ref(false),error=ref(''),updated=ref('')
const statuses:BookingStatus[]=['pending','accepted','completed','cancelled','rejected']
const shown=computed(()=>selectedArea.value?items.value.filter(b=>b.areaLabel===selectedArea.value):items.value)
const groups=computed(()=>groupedOrders(items.value)),unlocated=computed(()=>items.value.filter(b=>!b.areaLabel).length)
const pages=computed(()=>Math.max(1,Math.ceil(total.value/pageSize)))
const scope=computed(()=>mode.value==='example'?'静态虚构示例':currentSession.value?.user.role==='admin'?'管理员 · 全部订单':currentSession.value?.user.role==='tutor'?'家教 · 仅收到的订单':'家长 · 仅自己的订单')
let active=false,initialized=false,version=0,timer:ReturnType<typeof setInterval>|undefined
const owner=()=>currentSession.value?currentSession.value.user.id+':'+currentSession.value.user.role:'guest'
function clear(){version++;busy.value=false;items.value=[];total.value=0;error.value='';updated.value='';selectedArea.value='';selectedId.value='';ready.value=false}
function canPoll(){
 let allowed=active
 // #ifdef H5
 allowed=allowed&&document.visibilityState!=='hidden'
 // #endif
 return allowed
}
async function refresh(){
 if(!active||busy.value)return
 if(mode.value==='example'){
  const all=exampleMapOrders().filter(b=>!status.value||b.status===status.value)
  total.value=all.length;items.value=all.slice((page.value-1)*pageSize,page.value*pageSize);ready.value=true;return
 }
 const user=currentSession.value?.user
 if(!user){clear();ready.value=true;return}
 const token=++version,identity=owner();busy.value=true;error.value=''
 try{
  const data=await businessService.listMapBookings(user,{page:page.value,pageSize,status:status.value})
  if(token!==version||owner()!==identity||!active)return
  items.value=data.items;total.value=data.meta.total;updated.value=new Date(data.serverTime).toLocaleTimeString();ready.value=true
  if(selectedArea.value&&!items.value.some(b=>b.areaLabel===selectedArea.value))selectedArea.value=''
 }catch(cause){if(token===version&&owner()===identity){error.value=errorMessage(cause);ready.value=true}}
 finally{if(token===version)busy.value=false}
}
function chooseMode(value:'account'|'example'){clear();mode.value=value;page.value=1;void refresh()}
function chooseStatus(value:BookingStatus|undefined){clear();status.value=value;page.value=1;void refresh()}
function turn(value:number){if(busy.value||value<1||value>pages.value)return;clear();page.value=value;void refresh()}
function stop(){active=false;initialized=false;clearInterval(timer);timer=undefined;clear()}
onLoad(options=>{if(options?.example==='1')mode.value='example'})
onShow(async()=>{
 active=true;initialized=false
 try{await restoreSession()}catch(cause){if(active){error.value=errorMessage(cause);ready.value=true}return}
 if(!active)return
 initialized=true;void refresh();clearInterval(timer);timer=setInterval(()=>{if(canPoll()&&mode.value==='account')void refresh()},10000)
})
onHide(stop)
watch(owner,()=>{clear();page.value=1;if(active&&initialized)void refresh()})
function onVisibility(){if(canPoll()&&mode.value==='account')void refresh()}
onMounted(()=>{
 // #ifdef H5
 document.addEventListener('visibilitychange',onVisibility)
 // #endif
})
onBeforeUnmount(()=>{stop();
 // #ifdef H5
 document.removeEventListener('visibilitychange',onVisibility)
 // #endif
})
const login=()=>uni.navigateTo({url:'/pages/auth/login'})
const findTutor=()=>uni.navigateTo({url:'/pages/tutors/index'})
function details(b:OrderMapItem){selectedId.value=b.id}
function openBooking(b:OrderMapItem){if(mode.value==='example')return;if(currentSession.value?.user.role==='tutor')uni.navigateTo({url:'/pages/tutor/booking-detail?id='+encodeURIComponent(b.id)});else if(currentSession.value?.user.role==='parent')uni.switchTab({url:'/pages/orders/index'})}
</script>
<template>
 <ParentLayout title="西安订单地图 · 按权限查看动态" active="order-map">
  <view class="order-map-page">
   <view class="order-map-hero"><text class="map-kicker">ORDER MAP · 西安</text><text class="map-title">在地图上，看见每一份学习需求</text><text>选择片区圆点，查看对应预约、科目、家教和状态。</text></view>
   <view class="map-toolbar"><view class="map-tabs"><button :class="{current:mode==='account'}" @click="chooseMode('account')">账户订单</button><button :class="{current:mode==='example'}" @click="chooseMode('example')">虚构订单示例</button></view><button :disabled="busy" class="refresh-map" @click="refresh">{{busy?'正在刷新…':'刷新订单'}}</button></view>
   <view class="map-data-note" role="status"><text>{{scope}}</text><text v-if="mode==='example'">固定12条虚构示例，不会自动产生新订单，也不会混入账户订单。</text><text v-else>{{apiMode?'每10秒自动读取开发服务器订单，不代表正式交易。':'每10秒读取本机订单；Mock不跨设备同步。'}} {{updated?'上次成功更新 '+updated:'尚未成功更新'}}</text></view>
   <view v-if="mode==='account'&&!currentSession" class="map-empty"><text>请先登录，再查看属于当前账户的订单。</text><button class="map-primary" @click="login">登录查看账户订单</button><text>无需登录也可切换“虚构订单示例”体验地图。</text></view>
   <template v-else>
    <view class="map-status-filters"><button :class="{chosen:status===undefined}" @click="chooseStatus(undefined)">全部状态</button><button v-for="s in statuses" :key="s" :class="{chosen:status===s}" @click="chooseStatus(s)"><text class="legend-dot" :style="{background:orderStatusColors[s]}"/>{{bookingStatusLabels[s]}}</button></view>
    <view v-if="error" class="map-error" role="alert">更新失败：{{error}}。{{items.length?'以下保留上次数据，当前状态可能已变化。':'尚无可用订单数据。'}}<button @click="refresh">重试更新</button></view>
    <view v-if="!ready&&!error" class="map-empty">正在读取订单…</view>
    <view class="order-map-layout">
     <view class="map-surface"><XianLocationPicker :model-value="null" read-only :orders="items" :selected-area="selectedArea" @order-area-select="selectedArea=$event;selectedId=''"/><text class="map-caption">本页 {{items.length}} 条 / 共 {{total}} 条；地图仅标注本页中有公共片区的订单（{{groups.length}} 个片区，{{unlocated}} 条未标注）。聚合颜色优先显示待确认/已接受状态，其余取组内最新一条；不显示家长住址、学生称呼、联系方式或备注。</text><view class="area-orders"><button v-for="g in groups" :key="g.point.label" :class="{chosen:selectedArea===g.point.label}" @click="selectedArea=g.point.label;selectedId=''">{{g.point.label}} · {{g.items.length}}单</button><button v-if="selectedArea" @click="selectedArea='';selectedId=''">查看本页所有片区</button></view></view>
     <view class="order-map-list"><view class="list-heading"><text>{{selectedArea||'本页订单'}}</text><text>{{shown.length}} 条</text></view>
      <view v-if="ready&&!shown.length" class="map-empty"><text>{{selectedArea?'该片区当前页没有订单':'当前条件下暂无订单'}}</text><button v-if="mode==='account'" @click="findTutor">找老师并提交预约</button></view>
      <view v-for="b in shown" :key="b.id" class="map-order-card" :class="{selected:selectedId===b.id}" @click="details(b)">
       <view class="order-card-head"><text class="order-subject">{{b.subject}}辅导</text><text class="order-status" :style="{color:orderStatusColors[b.status]}">{{bookingStatusLabels[b.status]}}</text></view>
       <text class="order-area">{{b.areaLabel??'未选择公共片区 · 仅列表展示'}}</text><text>{{b.tutorName}} · {{b.teachingMode??'方式待确认'}}</text><text>期望时间：{{b.expectedTime}}</text><text v-if="b.referencePrice!==null">家教当前参考价：¥{{b.referencePrice}}/小时</text><text class="order-time">订单尾号 {{b.id.slice(-8)}} · 更新 {{new Date(b.updatedAt).toLocaleString()}}</text>
       <view v-if="selectedId===b.id" class="order-info"><text>状态来自{{mode==='example'?'固定虚构示例':apiMode?'开发服务器':'当前设备'}}；点位仅代表公共片区，参考价不是支付金额。</text><button v-if="mode==='account'&&currentSession?.user.role!=='admin'" @click.stop="openBooking(b)">{{currentSession?.user.role==='tutor'?'打开预约详情':'前往我的预约'}}</button></view>
       <text v-else class="order-expand">点击查看对应信息与入口</text>
      </view>
     </view>
    </view>
    <view class="map-pagination"><button :disabled="busy||page<=1" @click="turn(page-1)">上一页</button><text>第 {{page}} / {{pages}} 页 · 每页 {{pageSize}} 条</text><button :disabled="busy||page>=pages" @click="turn(page+1)">下一页</button></view>
   </template>
  </view>
 </ParentLayout>
</template>
<style scoped>
.order-map-page{color:#304a37;min-width:0}.order-map-hero{border:1px solid #bacbb3;background:#edf4e5;border-radius:20px;padding:25px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.8}.map-kicker{font-size:11px;letter-spacing:2px;color:#6f8562}.map-title{font-size:28px;font-weight:700;line-height:1.4}.map-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:20px 0 12px}.map-tabs,.map-status-filters,.area-orders{display:flex;gap:8px;flex-wrap:wrap}.map-tabs button,.map-status-filters button,.area-orders button,.refresh-map,.map-pagination button{margin:0;font-size:13px;line-height:2.8;background:#eef3e9;color:#3e6045;border-radius:9px;padding:0 14px}.map-tabs .current,.map-status-filters .chosen,.area-orders .chosen,.map-primary{background:#365e3e;color:white}.map-data-note{display:flex;flex-direction:column;gap:5px;background:#f5f6e9;border:1px solid #d8dfc7;padding:14px 18px;border-radius:12px;font-size:12px;line-height:1.8;margin-bottom:16px}.map-status-filters{margin-bottom:18px}.map-status-filters button{font-size:12px}.legend-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.order-map-layout{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(290px,.8fr);gap:22px;align-items:start}.map-surface{min-width:0;background:#fffef9;padding:18px;border:1px solid #bccdb4;border-radius:18px}.map-caption{display:block;font-size:12px;line-height:1.8;color:#6b7e65;margin:16px 0}.area-orders button{font-size:11px;padding:0 9px}.order-map-list{min-width:0}.list-heading{display:flex;justify-content:space-between;gap:12px;padding:14px 4px;font-size:16px;font-weight:700}.map-order-card{background:#fffef9;border:1px solid #c6d3bd;border-radius:15px;padding:17px;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;line-height:1.7;font-size:13px;overflow-wrap:anywhere;cursor:pointer}.map-order-card.selected{border-color:#4b7550;box-shadow:0 0 0 2px #d4e1ca}.order-card-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.order-subject{font-size:17px;font-weight:700}.order-status{font-size:12px;font-weight:600}.order-area{font-size:13px;color:#55734d}.order-time,.order-expand{font-size:11px;color:#849078}.order-info{display:flex;flex-direction:column;gap:10px;font-size:12px;background:#edf3e5;padding:12px;border-radius:9px}.order-info button,.map-empty button,.map-error button{font-size:12px;line-height:2.8;margin:8px 0 0;background:#365f40;color:white;padding:0 14px;border-radius:8px}.map-empty{background:#fffef9;border:1px dashed #b9cbb1;border-radius:16px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;font-size:14px;color:#66795f;text-align:center;line-height:1.8}.map-error{background:#fff1e8;color:#985b3a;padding:14px 18px;border-radius:12px;font-size:13px;line-height:1.8;margin-bottom:16px}.map-pagination{display:flex;gap:12px;justify-content:center;align-items:center;font-size:12px;color:#6f8068;margin-top:25px}.map-pagination button[disabled]{opacity:.45}@media(max-width:900px){.order-map-layout{grid-template-columns:minmax(0,1fr)}.map-title{font-size:23px}.map-pagination{gap:8px}.map-pagination button{padding:0 10px}}
</style>

