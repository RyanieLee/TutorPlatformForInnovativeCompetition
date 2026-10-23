<script setup lang="ts">
import {ref,reactive,computed} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import TeachingShell from './shared/TeachingShell.vue'
import UploadPicker from './shared/UploadPicker.vue'
import {useTeachingPage,inputTime,localTime} from './shared/page'
import {teachingService} from '../../services/teaching'
import {archiveService} from '../../services/student-archive'
import {reportLessonDraft} from '../../services/archive-report-draft'
import {currentSession} from '../../utils/session'
import {confirmAction} from '../tutor/shared/page'
import {BusinessError} from '../../services/errors'
import type {LessonDto,LessonInput,AttachmentDto} from '../../types/teaching'
const bookingId=ref(''),lessonId=ref(''),lesson=ref<LessonDto|null>(null),preview=ref<AttachmentDto[]>([]),reference=ref<AttachmentDto[]>([])
const archiveId=ref(''),reportId=ref(''),reportImported=ref(false)
const initial={title:'',scheduledAt:'',previewText:'',homeworkText:'',dueAt:''},form=reactive({...initial})
const previewStatus=ref({busy:false,allReady:true,count:0}),referenceStatus=ref({busy:false,allReady:true,count:0})
const page=useTeachingPage(()=>{lesson.value=null;Object.assign(form,initial);preview.value=[];reference.value=[]})
const {ready,error,busy,feedback,failed,authorized,role}=page
const uploading=computed(()=>previewStatus.value.busy||referenceStatus.value.busy)
onLoad(o=>{bookingId.value=String(o?.bookingId||'');lessonId.value=String(o?.lessonId||'');archiveId.value=String(o?.archiveId||'');reportId.value=String(o?.reportId||'')})
function fill(data:LessonDto){lesson.value=data;lessonId.value=data.id;bookingId.value=data.bookingId;Object.assign(form,{title:data.title,scheduledAt:localTime(data.scheduledAt),previewText:data.previewText,homeworkText:data.homeworkText,dueAt:data.dueAt?localTime(data.dueAt):''});preview.value=(data.pendingAttachments||[]).filter(a=>a.purpose==='preview');reference.value=(data.pendingAttachments||[]).filter(a=>a.purpose==='homework')}
const refresh=()=>page.load(async()=>{
 const data=lessonId.value?await teachingService.getLesson(lessonId.value):null
 const draft=!data&&archiveId.value&&reportId.value&&!reportImported.value?reportLessonDraft(await archiveService.read(archiveId.value),reportId.value,bookingId.value,currentSession.value?.user.id||''):null
 return{data,draft}
},({data,draft})=>{if(data)fill(data);else if(draft){Object.assign(form,draft);reportImported.value=true;feedback.value='已导入教师确认的学情报告。请填写上课时间、核对内容后保存，本次不会自动发布。'}})
onShow(refresh)
function input():LessonInput{if(!form.title.trim()||!form.homeworkText.trim())throw new BusinessError('INVALID','请填写课次标题和作业要求');return{title:form.title,scheduledAt:inputTime(form.scheduledAt)!,previewText:form.previewText,homeworkText:form.homeworkText,dueAt:inputTime(form.dueAt,true)}}
async function saveCourse(){const value=input();return lessonId.value?teachingService.saveLesson(lessonId.value,value,lesson.value!.version):teachingService.createLesson(bookingId.value,value)}
async function save(){if(uploading.value)return;const isNew=!lessonId.value;await page.act(()=>saveCourse(),data=>{lesson.value=data;lessonId.value=data.id;feedback.value='草稿已保存，课件可在下方上传。';if(isNew)uni.redirectTo({url:'/pages/teaching/edit?bookingId='+encodeURIComponent(bookingId.value)+'&lessonId='+encodeURIComponent(data.id)})})}
async function publish(){
 if(uploading.value||!previewStatus.value.allReady||!referenceStatus.value.allReady)return
 await page.act(async guard=>{
  if(!await confirmAction('发布课次','发布后学生可以查看，本版内容将不可修改。确认发布？'))return null
  guard();const data=await saveCourse();lesson.value=data;lessonId.value=data.id;guard()
  return teachingService.publishLesson(data.id,{version:data.version,attachmentIds:[...preview.value,...reference.value].map(a=>a.id)})
 },data=>{if(data)uni.redirectTo({url:'/pages/teaching/detail?lessonId='+encodeURIComponent(data.id)})})
}
</script>
<template>
 <TeachingShell title="发布课次与作业" :role="role">
  <view class="t-wrap">
   <view class="t-hero"><text class="t-kicker">老师备课</text><view class="t-title">{{lessonId?'编辑课次草稿':'新建课次'}}</view><view class="t-subtitle">准备预习资料，明确本节课的练习与提交要求。</view></view>
   <view v-if="!authorized||role!=='tutor'" class="t-card t-empty">请使用对应老师账号进入。<button role="button" class="t-btn secondary" @click="page.login">前往登录</button></view>
   <view v-else-if="!ready" class="t-card t-empty">正在读取课次…</view>
   <view v-else-if="error" class="t-card"><text class="t-error">{{error}}</text><button role="button" class="t-btn secondary" @click="refresh">重新加载</button></view>
   <view v-else-if="lesson?.status==='published'" class="t-card">课次已经发布，本版内容不可修改。</view>
   <template v-else>
    <view v-if="feedback" class="t-feedback" :class="{error:failed}" role="status">{{feedback}}</view>
    <view class="t-grid">
     <view class="t-card">
      <view class="t-section-title">本节课安排</view><view class="t-divider"/>
      <view class="t-field"><text>课次标题 *</text><input v-model="form.title" data-testid="lesson-title" :maxlength="80" placeholder="例如：第1节 一元一次方程" :disabled="busy"/></view>
      <view class="t-field"><text>上课时间 *</text><input v-model="form.scheduledAt" data-testid="lesson-time" placeholder="YYYY-MM-DD HH:mm" :disabled="busy"/><text class="t-muted">按你所在时区填写，例如 2026-10-22 18:00。</text></view>
      <view class="t-field"><text>预习说明</text><textarea v-model="form.previewText" data-testid="preview-text" :maxlength="10000" placeholder="建议学生课前阅读或准备什么？" :disabled="busy"/></view>
      <UploadPicker v-if="lessonId" :key="lessonId+'preview'" v-model="preview" :lesson-id="lessonId" purpose="preview" label="预习课件" :disabled="busy" @status="previewStatus=$event"/>
      <view v-else class="t-note">先保存草稿，即可上传预习课件和作业参考附件。</view>
     </view>
     <view class="t-card">
      <view class="t-section-title">课后作业</view><view class="t-divider"/>
      <view class="t-field"><text>作业要求 *</text><textarea v-model="form.homeworkText" data-testid="homework-text" :maxlength="10000" placeholder="写清题目、练习范围和提交要求" :disabled="busy"/></view>
      <view class="t-field"><text>作业截止时间</text><input v-model="form.dueAt" data-testid="homework-due" placeholder="YYYY-MM-DD HH:mm，可不填" :disabled="busy"/><text class="t-muted">逾期仍可提交，老师端会显示逾期标记。</text></view>
      <UploadPicker v-if="lessonId" :key="lessonId+'homework'" v-model="reference" :lesson-id="lessonId" purpose="homework" label="作业参考附件" :disabled="busy" @status="referenceStatus=$event"/>
      <view class="t-actions"><button role="button" class="t-btn secondary" :disabled="busy||uploading" :loading="busy" @click="save">保存草稿</button><button role="button" class="t-btn" :disabled="busy||uploading||!previewStatus.allReady||!referenceStatus.allReady" @click="publish">发布课次</button></view>
      <text class="t-muted" style="margin-top:14px">草稿仅老师可见；发布后本版内容将锁定。</text>
     </view>
    </view>
   </template>
  </view>
 </TeachingShell>
</template>
<style scoped src="./shared/teaching.css"></style>
