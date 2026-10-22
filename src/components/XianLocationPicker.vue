<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, watch, getCurrentInstance, ref } from 'vue'
import type {OrderMapItem} from '../types/order-map'
import {groupedOrders,orderStatusColors} from '../services/order-map'
import { xianPlaces, validLocation, type LocationPoint } from '../services/location'
// #ifdef H5
import 'leaflet/dist/leaflet.css'
// #endif
const props=withDefaults(defineProps<{modelValue:LocationPoint|null;serviceArea?:boolean;readOnly?:boolean;orders?:OrderMapItem[];selectedArea?:string}>(),{readOnly:false,orders:()=>[]})
const emit=defineEmits<{(e:'update:modelValue',value:LocationPoint|null):void;(e:'order-area-select',area:string):void}>()
const mapId='xian-location-map-'+getCurrentInstance()!.uid
const mapWarning=ref(''),selectionError=ref('')
let destroyed=false
let removeMap:(()=>void)|undefined
let drawOrders:(()=>void)|undefined
let moveMarker:((p:LocationPoint|null)=>void)|undefined
function select(point:LocationPoint) {
 if(!validLocation(point)){selectionError.value='请选择西安主城区及近郊范围内的位置';return}
 selectionError.value='';emit('update:modelValue',point)
}
watch(()=>props.modelValue,p=>moveMarker?.(p))
watch(()=>[props.orders,props.selectedArea],()=>drawOrders?.(),{deep:true})
onMounted(async()=>{
 // #ifdef H5
 try {
  const L=await import('leaflet');await nextTick()
  if(destroyed)return
  const el=document.getElementById(mapId)
  if(!el)return
  const map=L.map(el,{scrollWheelZoom:false}).setView([34.265,108.955],10)
  removeMap=()=>map.remove()
  const tile=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> — Source: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), NOSTRA, &copy; OpenStreetMap contributors, GIS User Community'}).addTo(map)
  tile.on('tileerror',()=>{mapWarning.value=props.readOnly?'在线底图暂不可用，仍可通过订单列表和片区按钮查看。':'在线底图暂不可用，可继续点选公共片区或地图标记。'})
  if(!props.readOnly)xianPlaces.forEach(p=>L.circleMarker([p.latitude,p.longitude],{radius:7,color:'#167568',fillColor:'#d5efe5',fillOpacity:1,bubblingMouseEvents:false}).addTo(map).bindTooltip(p.label).on('click',()=>select(p)))
  let marker:import('leaflet').CircleMarker|undefined
  moveMarker=p=>{marker?.remove();marker=undefined;if(p&&!props.readOnly){marker=L.circleMarker([p.latitude,p.longitude],{radius:11,color:'#2248bb',fillColor:'#6a8aff',fillOpacity:.8,weight:3}).addTo(map);map.panTo([p.latitude,p.longitude],{animate:false})}}
  const orderLayer=L.layerGroup().addTo(map)
  let fitted=false
  drawOrders=()=>{
   orderLayer.clearLayers()
   const groups=groupedOrders(props.orders)
   if(groups.length&&!fitted){map.fitBounds(groups.map(g=>[g.point.latitude,g.point.longitude] as [number,number]),{padding:[25,25],maxZoom:11});fitted=true}
   const chosen=groups.find(g=>g.point.label===props.selectedArea)
   if(chosen)map.panTo([chosen.point.latitude,chosen.point.longitude],{animate:false})
   for(const group of groups){
    const status=group.items.some(b=>b.status==='pending')?'pending':group.items.some(b=>b.status==='accepted')?'accepted':group.items[0].status
    const node=document.createElement('div');node.textContent=String(group.items.length)
    Object.assign(node.style,{background:orderStatusColors[status]||'#7c8586',color:'white',borderRadius:'50%',width:'30px',height:'30px',lineHeight:'26px',textAlign:'center',fontWeight:'700',fontSize:'13px',border:props.selectedArea===group.point.label?'3px solid #ebcf72':'2px solid white',boxShadow:'0 2px 8px #253e3455'})
    const tooltip=document.createElement('span');tooltip.textContent=group.point.label+' · '+group.items.length+'单（本页）'
    L.marker([group.point.latitude,group.point.longitude],{icon:L.divIcon({html:node,className:'order-map-count',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(orderLayer).bindTooltip(tooltip).on('click',()=>emit('order-area-select',group.point.label))
   }
  }
  drawOrders()
  moveMarker(props.modelValue)
  map.on('click',e=>{if(!props.readOnly)select({latitude:Number(e.latlng.lat.toFixed(5)),longitude:Number(e.latlng.lng.toFixed(5)),label:'西安地图选点'})})
 }catch{mapWarning.value='地图暂不可用，请使用下方片区按钮选点。'}
 // #endif
})
onBeforeUnmount(()=>{destroyed=true;removeMap?.()})
</script>
<template>
 <view class="location-picker">
  <view class="location-title">{{readOnly?'西安市 · 家长订单分布':serviceArea?'西安市 · 选择家教服务片区':'西安市 · 选择家长位置'}}</view>
  <text v-if="!readOnly" class="location-note">{{serviceArea?'选择公共教学地点，保存为附近服务片区；随资料提交审核。不填写住址。':'选择附近公共地点即可，不必填写住址。点位只存在本机，不发送给模型。'}} 在线底图由 Esri World Street Map 提供。</text>
  <!-- #ifdef H5 -->
  <view :id="mapId" class="xian-map" aria-label="西安市地图，点击选择家长参考位置"/>
  <text class="location-note">{{readOnly?'圆点数字为同片区的本页订单数，点击可筛选对应订单。点位是公共片区参考点，不是家长住址。':'点击地图任意点或绿色片区标记；可拖动、双指缩放，或用 + / − 按钮缩放。'}}</text>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <text class="location-note">{{readOnly?'当前小程序以片区列表查看订单；H5提供交互底图。':'当前小程序使用公共片区选点；交互底图请在 H5 打开。'}}</text>
  <!-- #endif -->
  <text v-if="mapWarning" class="map-warning">{{mapWarning}}</text>
  <view v-if="!readOnly" class="place-buttons"><button v-for="p in xianPlaces" :key="p.label" :class="{chosen:modelValue?.label===p.label}" @click="select(p)">{{p.label}}</button></view>
  <view v-if="modelValue&&!readOnly" class="selected-location"><text>已选：{{modelValue.label}} · {{modelValue.latitude.toFixed(3)}}, {{modelValue.longitude.toFixed(3)}}</text><button @click="emit('update:modelValue',null)">清除位置</button></view>
  <text v-else-if="!readOnly" class="location-note">未选位置时，仍可进行线上与普通规则匹配。</text>
  <text v-if="selectionError" class="map-warning" role="alert">{{selectionError}}</text>
 </view>
</template>
<style scoped>
.location-picker{min-width:0}.location-title{font-size:18px;font-weight:700;color:#173d51}.location-note{display:block;font-size:13px;color:#667a8a;line-height:1.7;margin:10px 0}.xian-map{width:100%;height:330px;border-radius:14px;overflow:hidden;z-index:0;border:1px solid #dbe5ee;background:#edf2ee}.place-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.place-buttons button{font-size:12px;line-height:2.8;margin:0;padding:0 10px;background:#eff5f3;color:#365f59;border-radius:8px}.place-buttons .chosen{background:#167568;color:white}.selected-location{margin-top:16px;font-size:13px;color:#2248bb;line-height:1.8;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.selected-location button{margin:0;font-size:12px;line-height:2.4;background:#edf1fa}.map-warning{display:block;font-size:13px;color:#9a621b;line-height:1.7}@media(max-width:700px){.xian-map{height:285px}}
</style>
