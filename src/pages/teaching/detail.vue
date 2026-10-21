<script setup lang="ts">
import {ref,computed} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import TeachingShell from './shared/TeachingShell.vue'
import AttachmentList from './shared/AttachmentList.vue'
import UploadPicker from './shared/UploadPicker.vue'
import SubmissionHistory from './shared/SubmissionHistory.vue'
import {useTeachingPage,formatTime} from './shared/page'
import {teachingService} from '../../services/teaching'
import type {LessonDto,AttachmentDto,SubmissionDto} from '../../types/teaching'
import type {BookingOrder} from '../../types/tutor'
const lessonId=ref(''),lesson=ref<LessonDto|null>(null),booking=ref<BookingOrder|null>(null),history=ref<SubmissionDto[]>([]),total=ref(0),historyPage=ref(1),attachments=ref<AttachmentDto[]>([]),note=ref(''),round=ref(0)
const status=ref({busy:false,allReady:true,count:0})
const page=useTeachingPage(()=>{lesson.value=null;booking.value=null;history.value=[];total.value=0;attachments.value=[];note.value='';round.value++})
const {ready,error,busy,feedback,failed,authorized,role}=page
onLoad(o=>{lessonId.value=String(o?.lessonId||'')})
const refresh=()=>page.load(async()=>{const [l,s]=await Promise.all([teachingService.getLesson(lessonId.value),teachingService.listSubmissions(lessonId.value)]);const b=await teachingService.getBooking(l.bookingId);return{l,s,b}},({l,s,b})=>{lesson.value=l;history.value=s.data;total.value=s.meta.total;historyPage.value=1;booking.value=b})
onShow(refresh)
const canSubmit=computed(()=>role.value==='parent'&&lesson.value?.status==='published'&&['accepted','completed'].includes(booking.value?.status||''))
const preview=computed(()=>lesson.value?.attachments.filter(a=>a.purpose==='preview')||[])
const reference=computed(()=>lesson.value?.attachments.filter(a=>a.purpose==='homework')||[])
async function submit(){if(status.value.busy||!status.value.allReady||!attachments.value.length)return;await page.act(()=>teachingService.submitHomework(lessonId.value,{note:note.value,attachmentIds:attachments.value.map(a=>a.id)}),data=>{const existed=history.value.some(s=>s.id===data.id);history.value=[data,...history.value.filter(s=>s.id!==data.id)];if(!existed)total.value++;attachments.value=[];note.value='';round.value++;feedback.value='作业已提交，老师可以查看本次文件。'})}
async function more(){await page.act(()=>teachingService.listSubmissions(lessonId.value,historyPage.value+1),list=>{history.value.push(...list.data);total.value=list.meta.total;historyPage.value=list.meta.page})}
const back=()=>uni.navigateTo({url:'/pages/teaching/index?bookingId='+encodeURIComponent(lesson.value?.bookingId||'')})
</script>
<template>
 <TeachingShell title="课次详情与作业" :role="role">
  <view class="t-wrap">
   <view v-if="!authorized" class="t-card t-empty">登录后查看课次与作业。<button role="button" class="t-btn" @click="page.login">前往登录</button></view>
   <view v-else-if="!ready" class="t-card t-empty">正在读取课次与作业…</view>
   <view v-else-if="error" class="t-card"><view class="t-error" role="alert">{{error}}</view><button role="button" class="t-btn secondary" @click="refresh">重新加载</button></view>
   <template v-else-if="lesson">
    <text class="t-back" @click="back">← 返回全部课次</text>
    <view class="t-hero"><text class="t-kicker">{{booking?.studentName}} · {{booking?.subject}}</text><view class="t-title">{{lesson.title}}</view><view class="t-meta"><text>上课 {{formatTime(lesson.scheduledAt)}}</text><text>作业截止 {{formatTime(lesson.dueAt)}}</text><text class="t-badge">已发布</text></view></view>
    <view v-if="feedback" class="t-feedback" :class="{error:failed}" role="status">{{feedback}}</view>
    <view v-if="booking?.status==='cancelled'" class="t-note">预约已取消，既有资料和提交记录可查看，不能新增提交。</view>
    <view class="t-grid">
     <view>
      <view class="t-card"><view class="t-section-title">课前预习</view><view class="t-content">{{lesson.previewText||'老师暂未填写预习说明。'}}</view><AttachmentList :files="preview"/></view>
      <view class="t-card"><view class="t-section-title">本节课作业</view><view class="t-content">{{lesson.homeworkText}}</view><AttachmentList :files="reference"/></view>
      <view v-if="canSubmit" class="t-card">
       <view class="t-section-title">{{total?'重新提交作业':'提交本节课作业'}}</view><text class="t-muted">上传完成后，请点击提交。重新提交会保留历史版本；本次需包含你希望提交的全部文件。</text>
       <UploadPicker :key="lessonId+':'+round" v-model="attachments" :lesson-id="lessonId" purpose="submission" label="作业文件" :disabled="busy" @status="status=$event"/>
       <view class="t-field" style="margin-top:20px"><text>作业说明</text><textarea v-model="note" data-testid="submission-note" :maxlength="2000" placeholder="可填写解题思路或需要老师帮助的问题" :disabled="busy"/></view>
       <button role="button" class="t-btn" :disabled="busy||status.busy||!status.allReady||!attachments.length" :loading="busy" @click="submit">{{total?'提交新版本':'提交作业'}}</button>
      </view>
     </view>
     <view class="t-card"><SubmissionHistory :submissions="history" :total="total" :busy="busy" @more="more"/><button role="button" class="t-btn secondary" style="margin-top:18px" :disabled="busy||status.busy" @click="refresh">刷新提交记录</button></view>
    </view>
   </template>
  </view>
 </TeachingShell>
</template>
<style scoped src="./shared/teaching.css"></style>
