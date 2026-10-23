<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { publicTutorPhoto } from '../services/photo-url'
const props = withDefaults(defineProps<{src?:string;name?:string;size?:'list'|'profile'|'resume';privatePhoto?:boolean}>(),{name:'老师',size:'list',privatePhoto:false})
const failed=ref(false)
watch(()=>props.src,()=>{failed.value=false})
const source=computed(()=>props.privatePhoto?props.src:publicTutorPhoto(props.src))
const demoPhoto=computed(()=>props.src?.includes('/static/demo-tutors/')??false)
</script>
<template>
  <view class="tutor-photo-frame" :class="'tutor-photo-frame--'+size">
    <image v-if="source&&!failed" class="tutor-photo-image" :src="source" mode="aspectFill" :aria-label="name+'的个人照片'" @error="failed=true"/>
    <view v-else class="tutor-photo-empty"><view class="photo-person" aria-hidden="true"><view class="photo-head"/><view class="photo-shoulders"/></view><text class="photo-empty-label">{{failed?'照片暂不可用':'待上传照片'}}</text></view>
    <text v-if="demoPhoto&&!failed" class="demo-photo-label">示例头像</text>
  </view>
</template>
<style scoped>
.tutor-photo-frame{position:relative;display:block;flex:none!important;overflow:hidden;border:2px solid #fff!important;border-radius:16px!important;background:linear-gradient(145deg,#e8f7f5,#deedf9)!important;box-shadow:0 7px 18px #548aa51a}.tutor-photo-frame--list{width:88px!important;height:88px!important}.tutor-photo-frame--profile,.tutor-photo-frame--resume{width:112px!important;height:112px!important}.tutor-photo-image{display:block;width:100%!important;height:100%!important}.tutor-photo-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;width:100%;height:100%;color:#648da0}.photo-person{position:relative;width:38px;height:40px}.photo-head{position:absolute;top:0;left:12px;width:15px;height:15px;border-radius:50%;background:#86b6c2}.photo-shoulders{position:absolute;bottom:1px;left:3px;width:33px;height:21px;border-radius:20px 20px 8px 8px;background:#86b6c2}.photo-empty-label{font-size:9px;line-height:1.5}.demo-photo-label{position:absolute;left:0;bottom:0;right:0;padding:2px 0;text-align:center;background:#154c66a8;color:#fff;font-size:8px;line-height:1.4}@media(max-width:480px){.tutor-photo-frame--list{width:72px!important;height:72px!important}}
</style>
