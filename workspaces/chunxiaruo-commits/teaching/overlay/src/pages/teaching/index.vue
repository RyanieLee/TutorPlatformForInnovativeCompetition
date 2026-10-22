<script setup lang="ts">
import {ref,computed} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import TeachingShell from './shared/TeachingShell.vue'
import {useTeachingPage,formatTime} from './shared/page'
import {teachingService,teachingApiMode} from '../../services/teaching'
import type {LessonDto} from '../../types/teaching'
import type {BookingOrder} from '../../types/tutor'
const bookingId=ref(''),booking=ref<BookingOrder|null>(null),lessons=ref<LessonDto[]>([]),total=ref(0),currentPage=ref(1)
const page=useTeachingPage(()=>{booking.value=null;lessons.value=[];total.value=0;currentPage.value=1})
const {ready,error,busy,authorized,role}=page
onLoad(o=>{bookingId.value=String(o?.bookingId||'')})
const refresh=()=>page.load(async()=>{const [list,b]=await Promise.all([teachingService.listLessons(bookingId.value),teachingService.getBooking(bookingId.value)]);return{list,b}},({list,b})=>{lessons.value=list.data;total.value=list.meta.total;currentPage.value=1;booking.value=b})
onShow(refresh)
const canCreate=computed(()=>role.value==='tutor'&&booking.value?.status==='accepted')
function open(lesson:LessonDto){uni.navigateTo({url:'/pages/teaching/'+(lesson.status==='draft'?'edit':'detail')+'?bookingId='+encodeURIComponent(bookingId.value)+'&lessonId='+encodeURIComponent(lesson.id)})}
const create=()=>uni.navigateTo({url:'/pages/teaching/edit?bookingId='+encodeURIComponent(bookingId.value)})
async function more(){await page.act(()=>teachingService.listLessons(bookingId.value,currentPage.value+1),list=>{lessons.value.push(...list.data);total.value=list.meta.total;currentPage.value=list.meta.page})}
</script>
<template>
 <TeachingShell title="课次与作业" :role="role">
  <view class="t-wrap">
   <view v-if="!authorized" class="t-card t-empty">请使用老师或学生/家长账号登录。<view class="t-actions"><button role="button" class="t-btn" @click="page.login">前往登录</button></view></view>
   <template v-else>
    <view class="t-hero"><text class="t-kicker">每节课 · 都有迹可循</text><view class="t-title">课次与作业</view><view class="t-subtitle">{{role==='tutor'?'把课前资料、课后作业和学生提交放在一起。':'课前预习、课后练习，在这里完成每一步。'}}</view><view v-if="booking" class="t-meta" style="margin-top:14px"><text>{{booking.studentName}} · {{booking.subject}}</text><text>{{booking.tutorName}}</text></view></view>
    <view v-if="!teachingApiMode" class="t-note">本机模拟不能跨设备收交文件，请使用 API 审核版。</view>
    <view v-if="!ready" class="t-card t-empty">正在读取课次…</view>
    <view v-else-if="error" class="t-card"><view class="t-error" role="alert">{{error}}</view><button role="button" class="t-btn secondary" @click="refresh">重新加载</button></view>
    <view v-else class="t-card">
     <view class="t-section-head"><view><view class="t-section-title">全部课次</view><text class="t-muted">共 {{total}} 节{{role==='tutor'?'，草稿仅你可见':''}}</text></view><button v-if="canCreate" role="button" class="t-btn" @click="create">新建课次</button></view>
     <view v-if="!lessons.length" class="t-empty"><view>还没有课次</view><text class="t-muted">{{role==='tutor'?'创建第一节课，发布预习资料和课后作业。':'老师发布后，课次和作业会显示在这里。'}}</text></view>
     <view v-for="lesson in lessons" :key="lesson.id" class="t-lesson"><view class="t-grow"><view class="t-lesson-title">{{lesson.title}}</view><view class="t-meta"><text>上课 {{formatTime(lesson.scheduledAt)}}</text><text>作业截止 {{formatTime(lesson.dueAt)}}</text></view></view><text class="t-badge" :class="{muted:lesson.status==='draft'}">{{lesson.status==='draft'?'草稿':'已发布'}}</text><view class="t-actions"><button role="button" class="t-btn secondary small" @click="open(lesson)">{{lesson.status==='draft'?'编辑课次':'查看课次与作业'}}</button></view></view>
     <button v-if="lessons.length<total" role="button" class="t-btn secondary" :disabled="busy" @click="more">加载更多课次</button>
    </view>
   </template>
  </view>
 </TeachingShell>
</template>
<style scoped src="./shared/teaching.css"></style>

