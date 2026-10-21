<script setup lang="ts">
import {ref,computed} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import TeachingShell from './shared/TeachingShell.vue'
import CourseOutline from './shared/CourseOutline.vue'
import ClassRecordForm from './shared/ClassRecordForm.vue'
import FeedbackReport from './shared/FeedbackReport.vue'
import RevisionCompare from './shared/RevisionCompare.vue'
import {useTeachingPage,formatTime} from './shared/page'
import {reconcileCourse} from './shared/course-state'
import {confirmAction} from '../tutor/shared/page'
import {loopService,loopApiMode,type LoopView,type LoopState,type Course,type RecordInput,type Command} from '../../services/teaching-loop'
import {makePresetFeedback,makePresetRevision} from '../../../server/src/teaching-loop/engine'
import {businessService} from '../../services/business'
import {teachingService} from '../../services/teaching'
import {currentSession} from '../../utils/session'
import {BusinessError} from '../../services/errors'
import type {BookingOrder} from '../../types/tutor'
const bookingId=ref(''),booking=ref<BookingOrder|null>(null),view=ref<LoopView|null>(null),course=ref<Course|null>(null),dirty=ref(false),editing=ref(false),reviewed=ref(false),historyVersion=ref<number|null>(null),pending=ref(false)
const page=useTeachingPage(()=>{booking.value=null;view.value=null;course.value=null;dirty.value=false;reviewed.value=false;pending.value=false;historyVersion.value=null})
const {ready,error,busy,feedback,failed,authorized,role}=page
const teacher=computed(()=>view.value&&'draft'in view.value?view.value as LoopState&{modelEnabled:boolean}:null)
const published=computed(()=>view.value?.versions.slice(-1)[0]??null)
const readPlan=computed(()=>view.value?.versions.find(p=>p.version===historyVersion.value)??published.value)
const writable=computed(()=>role.value==='tutor'&&booking.value?.status==='accepted')
const locked=computed(()=>busy.value||pending.value||!writable.value)
const latestRecord=computed(()=>teacher.value?.records.filter(r=>r.lessonId==='L2').slice(-1)[0])
const latestFeedback=computed(()=>teacher.value?.feedbacks.filter(f=>f.recordId===latestRecord.value?.id).slice(-1)[0])
const suggestion=computed(()=>teacher.value?.suggestions.slice(-1)[0])
const original=computed(()=>teacher.value?.versions.find(p=>p.version===suggestion.value?.baseVersion)?.course.lessons[2])
const source=(s:string)=>s==='preset'?'预置演示样例（非实时生成）':s==='model'?'模型生成 · 需教师核验':'教师编辑'
function apply(data:LoopView,force=false){view.value=data;pending.value=loopService.hasPending(bookingId.value);const c='draft'in data?(data.draft?.course??data.versions.slice(-1)[0]?.course):data.plan?.course;const next=reconcileCourse(course.value,dirty.value,c??null,force);course.value=next.course;dirty.value=next.dirty;if(!next.dirty)reviewed.value=false}
onLoad(o=>{bookingId.value=String(o?.bookingId||'')})
async function getBooking(){if(loopApiMode)return teachingService.getBooking(bookingId.value);const user=currentSession.value!.user;return user.role==='tutor'?businessService.getTutorBooking(user,bookingId.value):(await businessService.listParentBookings(user)).find(b=>b.id===bookingId.value)??null}
const refresh=()=>{if(busy.value)return;void page.load(async()=>{const[data,b]=await Promise.all([loopService.read(bookingId.value),getBooking()]);return{data,b}},({data,b})=>{booking.value=b;apply(data,false)})}
onShow(refresh)
function changed(value:Course){course.value=value;dirty.value=true;reviewed.value=false}
async function act(work:(guard:()=>void)=>Promise<LoopView>,message:string,replaceCourse=false){await page.act(work,data=>{apply(data,replaceCourse);feedback.value=message});pending.value=loopService.hasPending(bookingId.value)}
function command(type:Command['type'],payload:Record<string,any>={},message='教学内容已保存'){const replace=['initialize','saveDraft','discardDraft','publish','applyRevision'].includes(type);return act(async guard=>{if(dirty.value&&['discardDraft','applyRevision'].includes(type)){if(!await confirmAction('处理未保存编辑','此操作将替换当前未保存的课程编辑，确认继续？'))throw new BusinessError('INVALID','已保留未保存编辑');guard()}return loopService.command(bookingId.value,view.value!.revision,type,payload)},message,replace)}
function discardLocal(){return act(async guard=>{if(!await confirmAction('放弃未保存编辑','仅放弃当前页面未保存的课程内容，服务端草稿和历史保留。'))throw new BusinessError('INVALID','已保留未保存编辑');guard();return view.value!},'已放弃页面未保存编辑，服务端内容保留。',true)}
async function saveDraft(){if(course.value)await command('saveDraft',{course:JSON.parse(JSON.stringify(course.value)),source:'manual'},'课程草稿已保存，仅教师可见。')}
async function publish(){if(!reviewed.value)return;await act(async guard=>{if(!await confirmAction('确认发布教学计划','请确认已核验目标、45分钟安排、题目和答案。发布后关联家长可见，旧版本保留。'))throw new BusinessError('INVALID','已取消发布');guard();let revision=view.value!.revision;if(dirty.value){const saved=await loopService.command(bookingId.value,revision,'saveDraft',{course:JSON.parse(JSON.stringify(course.value)),source:'manual'});revision=saved.revision;guard()}return loopService.command(bookingId.value,revision,'publish',{})},'教学计划已确认发布，家长现在可以查看。',true)}
async function saveRecord(input:RecordInput){await command('record',input,'课堂事实已保存，可生成候选反馈；改课需使用本次新反馈。')}
async function sampleFeedback(){try{if(!teacher.value||!latestRecord.value)return;await command('feedback',{recordId:latestRecord.value.id,feedback:makePresetFeedback(teacher.value,latestRecord.value.id,new Date().toISOString())},'样例反馈已生成，尚未发布，请教师审核。')}catch(e){feedback.value=e instanceof Error?e.message:'无法生成样例反馈';failed.value=true}}
async function sampleRevision(){try{if(teacher.value)await command('suggest',{suggestion:makePresetRevision(teacher.value,new Date().toISOString())},'样例调整建议已生成，原发布版保持可见。')}catch(e){feedback.value=e instanceof Error?e.message:'无法生成调整建议';failed.value=true}}
function generate(kind:'course'|'feedback'|'revision'){return act(async guard=>{if(kind==='course'&&dirty.value){if(!await confirmAction('处理未保存编辑','生成新课程将替换当前未保存编辑，确认继续？'))throw new BusinessError('INVALID','已保留未保存编辑');guard()}return loopService.generate(bookingId.value,view.value!.revision,kind)},'模型候选内容已返回，尚未自动发布，请教师核验。',kind==='course')}
async function publishFeedback(){if(!latestFeedback.value)return;await act(async guard=>{if(!await confirmAction('确认发布课后反馈','请核对逐题事实、证据引用与家长报告。确认后家长可见。'))throw new BusinessError('INVALID','已取消发布');guard();return loopService.command(bookingId.value,view.value!.revision,'publishFeedback',{feedbackId:latestFeedback.value!.id})},'课后反馈已由教师确认发布。')}
const parentReports=computed(()=>view.value?.feedbacks.filter(f=>f.status==='published')??[])
</script>
<template>
 <TeachingShell title="教学计划与反馈" :role="role"><view class="t-wrap loop-wrap">
  <view class="t-hero"><text class="t-kicker">备课 → 课堂证据 → 反馈 → 下一课调整</text><view class="t-title">教学计划与反馈</view><view class="t-subtitle">{{role==='tutor'?'教师审核每一步，让教学调整有据可查。':'查看老师已确认发布的课程与课后报告。'}}</view><view v-if="booking" class="t-meta">{{booking.subject}} · {{booking.tutorName}} · 匿名教学案例</view></view>
  <view v-if="!authorized" class="t-card t-empty">请使用关联家教或家长账号登录。<button role="button" class="t-btn" @click="page.login">前往登录</button></view>
  <template v-else>
   <view v-if="!ready" class="t-card">正在读取教学计划…</view>
   <view v-if="error" class="t-card"><text class="t-error" role="alert">{{error}}</text><button role="button" class="t-btn secondary" @click="refresh">重新加载教学计划</button></view>
   <view v-if="feedback" class="t-feedback" :class="{error:failed}" role="status" data-testid="loop-status">{{feedback}}</view>
   <view v-if="pending" class="t-card"><view class="t-error">上次提交结果待确认，输入已保留。请重试上次提交，或刷新查询已提交结果。</view><view class="t-actions"><button role="button" class="t-btn" :disabled="busy" @click="act(()=>loopService.retry(bookingId),'上次提交已确认。')">重试上次提交</button><button role="button" class="t-btn secondary" :disabled="busy" @click="refresh">刷新查询结果</button></view></view>
   <view v-show="ready&&!error&&view">
    <view class="t-note">{{loopApiMode?'开发API：教学内容保存在本地服务数据库。':'本机Mock：教学内容仅保存在当前浏览器，不跨设备同步。'}} 所有案例均为虚构，模型和样例建议均须教师审核。</view>
    <view v-if="role==='tutor'&&teacher">
     <view v-if="!writable" class="t-note">预约当前不允许新增教学操作，已有历史可查看。</view>
     <view class="t-card"><view class="t-section-title">备课与课程版本</view><view class="t-muted">已发布{{teacher.versions.length}}版 · {{teacher.draft?'有未发布草稿':'无未发布草稿'}} · 数据修订号{{teacher.revision}}</view>
      <view v-if="teacher.draft" class="t-note">{{source(teacher.draft.source)}} · {{formatTime(teacher.draft.createdAt)}}<view>{{teacher.draft.explanation}}</view></view><view v-else-if="published" class="t-note">当前发布 v{{published.version}} · {{source(published.source)}}</view>
      <view class="t-actions"><button v-if="!course" role="button" class="t-btn" data-testid="load-preset-course" :disabled="locked" @click="command('initialize',{},'已加载完整预置演示课程，非实时模型生成。')">加载预置演示课程</button><button role="button" class="t-btn secondary" :disabled="locked||!view?.modelEnabled||!!teacher.draft" @click="generate('course')">调用模型生成课程大纲</button><button v-if="course" role="button" class="t-btn secondary" :disabled="locked" @click="editing=!editing">{{editing?'结束编辑':'编辑课程内容'}}</button><button v-if="course" role="button" class="t-btn secondary" :disabled="locked||!dirty" @click="saveDraft">保存课程草稿</button></view>
      <view v-if="!view?.modelEnabled" class="t-muted">未启用教学模型，可使用预置课程和样例反馈；不会声称已调用模型。</view>
      <view v-if="course&&(teacher.draft||dirty)" class="publish-box"><label class="review-check"><checkbox :checked="reviewed" :disabled="locked" @click="reviewed=!reviewed"/><text>我已核验课程目标、每节45分钟安排、练习及标准答案</text></label><view class="t-actions"><button role="button" class="t-btn" data-testid="publish-course" :disabled="locked||!reviewed" @click="publish">确认发布课程</button><button v-if="teacher.draft" role="button" class="t-btn secondary" :disabled="locked" @click="command('discardDraft',{},'未发布草稿已撤销，发布历史保留。')">撤销未发布草稿</button></view></view>
     </view>
     <CourseOutline v-if="course" :course="course" :editable="editing&&writable" :disabled="locked" @update:course="changed"/>
     <view v-if="dirty" class="t-card"><text class="t-note">当前有未保存课程编辑，课堂记录与反馈操作不会覆盖它。</text><button role="button" class="t-btn secondary" :disabled="locked" @click="discardLocal">放弃未保存编辑</button></view>
     <ClassRecordForm v-if="published" :key="'record-v'+published.version" :lesson="published.course.lessons[1]" :version="published.version" :disabled="locked" @save="saveRecord"/>
     <view v-else class="t-card t-note">请先确认发布课程，再依据发布版题目录入课堂事实。</view>
     <view v-if="latestRecord" class="t-card"><view class="t-section-title">课堂事实已保存 · {{latestRecord.date}}</view><view class="t-content">{{latestRecord.completed}}</view><view class="t-content">教师观察：{{latestRecord.observation}}</view><view class="t-actions"><button role="button" class="t-btn" data-testid="sample-feedback" :disabled="locked" @click="sampleFeedback">生成样例反馈（非实时AI）</button><button role="button" class="t-btn secondary" :disabled="locked||!view?.modelEnabled" @click="generate('feedback')">调用模型生成课后反馈</button></view></view>
     <FeedbackReport v-if="latestFeedback" :value="latestFeedback" :disabled="locked" editable @edit="command('editFeedback',{feedbackId:latestFeedback.id,report:$event},'家长报告已修改，来源标记为教师编辑。')" @publish="publishFeedback"/>
     <view v-if="latestFeedback?.status==='published'" class="t-card"><view class="t-section-title">用已确认反馈规划下一课</view><view class="t-actions"><button role="button" class="t-btn" data-testid="sample-revision" :disabled="locked||!!teacher.draft" @click="sampleRevision">生成第三课样例调整建议</button><button role="button" class="t-btn secondary" :disabled="locked||!view?.modelEnabled||!!teacher.draft" @click="generate('revision')">调用模型建议调整第三课</button></view></view>
     <RevisionCompare v-if="suggestion&&original" :suggestion="suggestion" :original="original" :disabled="locked" @accept="command('applyRevision',{suggestionId:suggestion.id},'已采纳并生成新草稿，核验发布后家长可见。')" @reject="command('rejectRevision',{suggestionId:suggestion.id},'已拒绝建议，原版保留。')"/>
     <view v-if="teacher.versions.length" class="t-card"><view class="t-section-title">不可覆盖的发布历史</view><view v-for="p in teacher.versions" :key="p.version" class="history"><text>v{{p.version}} · {{formatTime(p.publishedAt)}} · {{source(p.source)}}</text><view class="t-content">{{p.explanation}}</view><button role="button" class="t-btn secondary small" @click="historyVersion=historyVersion===p.version?null:p.version">{{historyVersion===p.version?'收起':'查看此版课程'}}</button></view><CourseOutline v-if="historyVersion&&readPlan" :course="readPlan.course"/></view>
    </view>
    <view v-else-if="role==='parent'">
     <view v-if="!published" class="t-card t-empty">老师尚未发布教学计划。未确认草稿和调整建议不会向你展示。</view>
     <template v-else><view class="t-card"><view class="t-section-title">教师已确认的课程 · v{{readPlan?.version}}</view><view class="t-note">{{source(readPlan?.source||'preset')}} · {{formatTime(readPlan?.publishedAt||null)}}</view><view class="t-content">{{readPlan?.explanation}}</view><view class="t-actions"><button v-for="p in view?.versions" :key="p.version" role="button" class="t-btn secondary small" @click="historyVersion=p.version">查看 v{{p.version}}</button></view></view><CourseOutline v-if="readPlan" :course="readPlan.course"/></template>
     <view class="t-card"><view class="t-section-title">老师已确认的课后报告</view><view v-if="!parentReports.length" class="t-muted">暂无已确认报告。</view></view><FeedbackReport v-for="f in parentReports" :key="f.id" :value="f"/>
    </view>
    <view class="t-card"><button role="button" class="t-btn secondary" :disabled="busy" @click="refresh">刷新教学状态</button></view>
   </view>
  </template>
 </view></TeachingShell>
</template>
<style scoped src="./shared/teaching.css"></style>
<style scoped>.loop-wrap{max-width:1100px}.publish-box{margin-top:22px;padding-top:18px;border-top:1px solid #d8e3d0}.review-check{display:flex;align-items:flex-start;gap:10px;line-height:1.8}.history{padding:18px 0;border-bottom:1px solid #dce5d6}.history>text{display:block;line-height:1.8}.t-content{white-space:pre-wrap;overflow-wrap:anywhere}.t-note{overflow-wrap:anywhere}@media(max-width:600px){.t-actions{align-items:stretch;flex-direction:column}.t-actions button{width:100%;margin:0}}</style>
