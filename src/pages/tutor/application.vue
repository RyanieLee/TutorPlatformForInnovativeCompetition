<script setup lang="ts">
import {tutorSubjects} from '../../data/tutor-subjects'
import { computed, reactive, ref } from 'vue'
import TutorPhoto from '../../components/TutorPhoto.vue'
import { onShow } from '@dcloudio/uni-app'
import XianLocationPicker from '../../components/XianLocationPicker.vue'
import {areaReference, xianPlaces, distanceKm, type LocationPoint} from '../../services/location'
import {scheduleChoices} from '../../services/availability'
import RoleShell from './shared/RoleShell.vue'
import AsyncState from './shared/AsyncState.vue'
import { useRolePage, identityKey, assertIdentity, confirmAction } from './shared/page'
import { runConfirmedAction } from './shared/operations'
import { submitReviewedApplication } from './shared/application'
import { currentSession, canAccess } from '../../utils/session'
import { businessService } from '../../services/business'
import { BusinessError, errorMessage } from '../../services/errors'
import { reviewStatusLabels, validateTutorApplication } from '../../services/rules'
import type { TutorApplication, TutorApplicationInput } from '../../types/business'
import type { TeachingMode } from '../../types/tutor'

const emptyForm = (): TutorApplicationInput => ({ displayName: '', university: '', major: '', subjects: [], teachingMode: '均可', area: '', pricePerHour: 0, introduction: '', availability: '', caseSummary:'' })
const form = reactive(emptyForm())
const servicePoint=computed(()=>areaReference(form.area)??null)
function chooseServicePoint(point:LocationPoint|null){
 if(busy.value||uncertain.value)return
 if(!point){form.area='';return}
 const nearest=[...xianPlaces].sort((a,b)=>distanceKm(point,a)-distanceKm(point,b))[0]
 form.area=nearest.label
}
function toggleTime(slot:string){
 const slots=form.availability.split('、').filter(Boolean)
 form.availability=(slots.includes(slot)?slots.filter(s=>s!==slot):[...slots,slot]).join('、').slice(0,100)
}
const evidence = reactive({experienceMonths:'',academicScore:'',teachingSkillLevel:'',caseCount:''})
const price = ref(''), application = ref<TutorApplication | null>(null), busy = ref(false), feedback = ref('')
const uncertain = ref(false)
const subjects = tutorSubjects
const modes: TeachingMode[] = ['线上','线下','均可']
const { ready, error, authorized, load, scope } = useRolePage('tutor', () => { application.value = null; Object.assign(form, emptyForm()); Object.assign(evidence,{experienceMonths:'',academicScore:'',teachingSkillLevel:'',caseCount:''}); price.value = ''; feedback.value = ''; uncertain.value = false })
const modeIndex = computed(() => modes.indexOf(form.teachingMode))
function fill(a: TutorApplication | null) {
  uncertain.value = false
  application.value = a
  if (a) { const { displayName, university, major, subjects, teachingMode, area, pricePerHour, introduction, availability, caseSummary } = a; Object.assign(form, { displayName, university, major, subjects: [...subjects], teachingMode, area, pricePerHour, introduction, availability, caseSummary:caseSummary??'' }); price.value = pricePerHour ? String(pricePerHour) : ''; for(const key of Object.keys(evidence) as (keyof typeof evidence)[]) evidence[key]=a[key]==null?'':String(a[key]) }
}
const refresh = () => { if (!busy.value) void load(user => businessService.getMyApplication(user), fill) }
onShow(refresh)
function toggle(s: string) { if (!busy.value && !uncertain.value) form.subjects = form.subjects.includes(s) ? form.subjects.filter(x => x !== s) : [...form.subjects, s] }
function changeMode(e: { detail: { value: string | number } }) { if (!busy.value && !uncertain.value) form.teachingMode = modes[Number(e.detail.value)] ?? '均可' }
function optionalNumber(value:string,max:number,label:string):number|null {
  if(!value.trim())return null
  if(!/^\d{1,3}$/.test(value.trim())||Number(value)>max)throw new BusinessError('INVALID',`${label}请输入 0–${max} 的整数`)
  return Number(value)
}
async function uploadPhoto() {
  const user=currentSession.value?.user,owner=identityKey()
  if(busy.value||uncertain.value||!user||!application.value||application.value.status==='pending'||!canAccess(['tutor']))return
  const chosen=await uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera']}).catch(()=>null)
  const path=typeof chosen?.tempFilePaths==='string'?chosen.tempFilePaths:(chosen?.tempFilePaths?.[0]??'')
  if(!path)return
  if(application.value.status==='approved'&&!await confirmAction('确认更换照片','照片需重新审核；现有公开资料会暂时下架。是否继续？'))return
  busy.value=true;feedback.value=''
  try {
    assertIdentity(owner)
    const updated=await businessService.uploadTutorPhoto(user,path)
    assertIdentity(owner)
    application.value=updated
    feedback.value='照片已保存到草稿。提交申请并通过演示审核后才会公开。'
  } catch(cause) { feedback.value=errorMessage(cause) }
  finally { busy.value=false }
}
async function withdraw(){
 const user=currentSession.value?.user,target=application.value,owner=identityKey()
 if(busy.value||!user||target?.status!=='pending')return
 const operation=scope.begin();busy.value=true;feedback.value=''
 try{
  if(!await confirmAction('撤回申请并修改','撤回后退出待审核队列，保留已填写资料和照片。修改后需要重新提交审核，是否继续？'))return
  assertIdentity(owner);if(!operation.isCurrent())return
  const draft=await businessService.withdrawApplication(user,target.id)
  if(operation.isCurrent()){fill(draft);feedback.value='申请已撤回为草稿，资料已保留，可修改后重新提交审核。'}
 }catch(cause){
  if(operation.isCurrent()){
   feedback.value=errorMessage(cause)
   try{const latest=await businessService.getMyApplication(user);if(operation.isCurrent()){fill(latest);if(latest?.status==='draft')feedback.value='申请已撤回为草稿，资料已保留。';else feedback.value+='；已刷新审核状态。'}}
   catch{if(operation.isCurrent()){uncertain.value=true;feedback.value+='；结果待确认，请刷新审核状态。'}}
  }
 }finally{busy.value=false}
}
async function save(submit: boolean) {
  const user = currentSession.value?.user, owner = identityKey()
  if (busy.value || uncertain.value || !user || !canAccess(['tutor']) || application.value?.status === 'pending') return
  const operation = scope.begin()
  let input:TutorApplicationInput
  try { input = { ...form, subjects: [...form.subjects], pricePerHour: Number(price.value),
    experienceMonths:optionalNumber(evidence.experienceMonths,120,'教学经历月数'), academicScore:optionalNumber(evidence.academicScore,100,'相关课程成绩自述'),
    teachingSkillLevel:optionalNumber(evidence.teachingSkillLevel,5,'教学能力自评'), caseCount:optionalNumber(evidence.caseCount,50,'匿名案例数量') } }
  catch(cause) { feedback.value=errorMessage(cause);return }
  feedback.value = ''; busy.value = true
  let sent = false
  try {
    if (submit) validateTutorApplication(input)
    const approved = application.value?.status === 'approved'
    const result = await runConfirmedAction({
      confirm: () => confirmAction(submit ? '确认提交审核' : '确认保存草稿', approved ? '修改已通过的资料会撤销公开展示，并保存为草稿。' + (submit ? '随后将重新提交审核，是否继续？' : '是否继续保存？') : submit ? '提交后等待管理员审核，审核期间不能修改。是否继续？' : '将当前填写内容保存为草稿，是否继续？'),
      execute: async () => {
        assertIdentity(owner)
        if (!operation.isCurrent()) throw new Error('操作已失效')
        sent = true
        return submit ? submitReviewedApplication(businessService, user, application.value, input, draft => { assertIdentity(owner); if (!operation.isCurrent()) throw new Error('操作已失效'); application.value = draft }) : businessService.saveApplicationDraft(user, input)
      }
    })
    if (result.kind === 'success' && operation.isCurrent()) {
      application.value = result.value
      feedback.value = submit ? '申请已提交，请等待管理员审核。' : '草稿已保存，可继续编辑后提交审核。'
      uni.showToast({ title: submit ? '申请已提交' : '草稿已保存', icon: 'none' })
    }
  } catch (cause) {
    if (operation.isCurrent()) {
      feedback.value = errorMessage(cause)
      if (sent) {
        try { const latest = await businessService.getMyApplication(user); if (operation.isCurrent()) { application.value = latest; uncertain.value = false; feedback.value += '；已重新读取审核状态，请确认后继续。' } }
        catch { if (operation.isCurrent()) { uncertain.value = true; feedback.value += '；操作结果尚未确认，已暂停编辑与提交。请点击“刷新审核状态”恢复查询，当前输入已保留。' } }
      }
    }
  } finally { busy.value = false }
}
</script>
<template>
  <RoleShell class="application-page" title="家教入驻资料" role="tutor">
    <template v-if="authorized">
      <AsyncState v-if="!ready" state="loading" message="正在读取入驻资料…" />
      <AsyncState v-else-if="error" state="error" :message="error" @retry="refresh" />
      <view v-if="ready && !error">
        <view class="b-toolbar"><text v-if="uncertain" class="b-status">状态待确认</text><text v-else class="b-status">审核状态：{{ application ? reviewStatusLabels[application.status] : '未申请' }}</text><button class="b-button secondary" :disabled="busy" @click="refresh">刷新审核状态</button></view>
        <view v-if="application?.rejectionReason" class="b-reason">拒绝原因：{{ application.rejectionReason }}。请补充后重新提交。</view>
        <view v-if="feedback" class="b-info" role="status">{{ feedback }}</view>
        <view v-if="application?.status === 'pending'" class="b-panel"><view class="b-section">申请已提交</view><TutorPhoto class="tutor-photo" :src="application?.photoUrl" :name="application?.displayName" size="resume" private-photo/><text class="b-muted">待审核期间可撤回申请并修改，修改后需要重新提交审核。也可返回工作台处理预约。</text><view class="b-row"><text>提交称呼</text><text>{{ application?.displayName }}</text></view><view class="b-row"><text>学校 / 专业</text><text>{{ application?.university }} · {{ application?.major }}</text></view><view class="b-row"><text>科目与方式</text><text>{{ application?.subjects.join('、') }} · {{ application?.teachingMode }}</text></view><view class="b-row"><text>地区与价格</text><text>{{ application?.area }} · {{ application?.pricePerHour }} 元 / 小时</text></view><view class="b-row"><text>授课时间</text><text>{{ application?.availability }}</text></view><view class="b-row"><text>教学经历 / 课程成绩</text><text>{{ application?.experienceMonths ?? '未填写' }} 月 · {{ application?.academicScore ?? '未填写' }}/100（自述）</text></view><view class="b-row"><text>教学能力 / 匿名案例</text><text>{{ application?.teachingSkillLevel ?? '未填写' }}/5 · {{ application?.caseCount ?? '未填写' }} 个（自述）</text></view><view class="b-text">{{ application?.introduction }}</view></view>
        <view v-if="application?.status === 'pending'" class="b-actions recall-actions"><button class="b-button secondary" :disabled="busy || uncertain" :loading="busy" @click="withdraw">撤回申请并修改</button><text class="b-muted">仅待审核申请可撤回；已完成审核的结果不会被覆盖。</text></view>
        <scroll-view v-if="application?.status !== 'pending'" scroll-y class="application-scroll" aria-label="入驻资料表单">
        <view class="b-grid">
          <view class="b-panel">
            <view class="b-section">{{ application?.status === 'approved' ? '修改资料 / 重新送审' : '填写演示资料' }}</view>
            <view v-if="application?.status === 'approved'" class="b-info">资料目前已通过审核。保存修改会撤销公开展示，重新审核通过后才会恢复。</view>
            <view class="b-field"><text class="b-label">老师展示照片（选填）</text><TutorPhoto class="tutor-photo" :src="application?.photoUrl" :name="application?.displayName" size="resume" private-photo/><button class="b-button secondary" :disabled="busy || uncertain || !application" @click="uploadPhoto">选择并上传照片</button><text class="b-muted">先保存草稿；JPG / PNG / WebP，API 模式最大 2 MB。照片随申请审核，通过后才公开。不上传学生或证件照片。</text></view>
            <view class="b-field"><text class="b-label">展示称呼 *</text><input class="b-input" v-model="form.displayName" :disabled="busy || uncertain" maxlength="20" placeholder="例如：演示老师"/></view>
            <view class="b-field"><text class="b-label">学校 *</text><input class="b-input" v-model="form.university" :disabled="busy || uncertain" maxlength="40" placeholder="例如：示例大学"/></view>
            <view class="b-field"><text class="b-label">专业 *</text><input class="b-input" v-model="form.major" :disabled="busy || uncertain" maxlength="40" placeholder="例如：数学与应用数学"/></view>
            <view class="b-field"><text class="b-label">擅长科目 *</text><view class="b-chips"><button v-for="s in subjects" :key="s" class="b-chip" :class="{ active: form.subjects.includes(s) }" :disabled="busy || uncertain" @click="toggle(s)">{{ s }}</button></view></view>
            <view class="b-field"><text class="b-label">授课方式 *</text><picker :range="modes" :value="modeIndex" :disabled="busy || uncertain" @change="changeMode"><view class="b-input">{{ form.teachingMode }}　⌄</view></picker></view>
          </view>
          <view class="b-panel">
            <view class="b-section">教学安排</view>
            <view class="b-field"><text class="b-label">服务地区 *</text><input class="b-input" v-model="form.area" :disabled="busy || uncertain" maxlength="40" placeholder="例如：示例大学城"/></view>
            <view class="b-field"><text class="b-label">个人定位（公开服务片区，选填）</text><XianLocationPicker service-area :disabled="busy||uncertain" :model-value="servicePoint" @update:model-value="chooseServicePoint"/><text class="b-muted">选点会保存为最近的公共片区，审核后用于公开服务地区和附近匹配；不上传你点击的精确坐标。也可直接编辑上方地区。</text></view>
            <view class="b-field"><text class="b-label">参考价格（元 / 小时）*</text><input class="b-input" v-model="price" :disabled="busy || uncertain" type="digit" placeholder="填写 1–1000 元"/></view>
            <view class="b-field"><text class="b-label">可授课时间 *</text><input class="b-input" v-model="form.availability" :disabled="busy || uncertain" maxlength="100" placeholder="例如：周末下午"/></view>
            <view class="b-chips"><button v-for="slot in scheduleChoices" :key="slot" class="b-chip" :class="{active:form.availability.split('、').includes(slot)}" :disabled="busy||uncertain" @click="toggleTime(slot)">{{slot}}</button></view><text class="b-muted">可点击常用空闲时段，或直接填写时间。匹配只给可确定的星期与时段吻合加分，最终时间仍需双方确认。</text>
            <view class="b-field"><text class="b-label">教学经历（月，自述）</text><input class="b-input" v-model="evidence.experienceMonths" :disabled="busy || uncertain" type="number" maxlength="3" placeholder="0–120，可空"/></view>
            <view class="b-field"><text class="b-label">相关课程成绩（0–100，自述）</text><input class="b-input" v-model="evidence.academicScore" :disabled="busy || uncertain" type="number" maxlength="3" placeholder="0–100，可空"/></view>
            <view class="b-field"><text class="b-label">教学能力（0–5，自评）</text><input class="b-input" v-model="evidence.teachingSkillLevel" :disabled="busy || uncertain" type="number" maxlength="1" placeholder="0–5，可空"/></view>
            <view class="b-field"><text class="b-label">匿名教学案例数（自述）</text><input class="b-input" v-model="evidence.caseCount" :disabled="busy || uncertain" type="number" maxlength="2" placeholder="0–50，可空"/></view>
            <view class="b-field"><text class="b-label">案例摘要（选填）</text><textarea class="b-textarea" v-model="form.caseSummary" :disabled="busy || uncertain" maxlength="120" placeholder="只写匿名教学方法与结果，不写学生姓名、学校或联系方式"/></view>
            <text class="b-muted">上述数据是个人自述；当前审核不核验成绩或教学结果。留空不会被填上虚构评分。</text>
            <view class="b-field"><text class="b-label">个人介绍 *（10–1000 字）</text><textarea class="b-textarea" v-model="form.introduction" :disabled="busy || uncertain" maxlength="1000" placeholder="介绍虚构的教学经历与特点"/><text class="b-muted">{{form.introduction.length}} / 1000 字</text></view>
            <text class="b-muted">草稿可暂不完整；提交审核前需填写所有必填项。请勿填写真实身份信息或上传证件。</text>
          </view>
        </view>
        </scroll-view>
        <view v-if="application?.status !== 'pending'" class="application-footer b-panel"><text class="b-muted">在表单内滚动填写；每份申请最多选择6个擅长科目。</text><view class="b-actions"><button class="b-button secondary" :disabled="busy || uncertain" @click="save(false)">保存草稿</button><button class="b-button" :disabled="busy || uncertain" :loading="busy" @click="save(true)">{{ application?.status === 'approved' ? '修改并重新送审' : '提交审核' }}</button></view></view>
      </view>
    </template>
  </RoleShell>
</template>
<style scoped src="./shared/workflow.css"></style>
<style scoped>.tutor-photo{display:block;width:112px;height:112px;border-radius:14px;object-fit:cover;margin:8px 0 12px}</style>
<style scoped>
.application-scroll{display:block;height:clamp(280px,60vh,680px);min-height:0;border-radius:16px;overflow:hidden}
.application-scroll :deep(.uni-scroll-view){height:100%;min-height:0;overscroll-behavior-y:contain}
.application-scroll .b-panel{margin-bottom:0}
.application-footer{position:sticky;bottom:12px;z-index:20;margin:12px 0 0;padding:16px 20px;box-shadow:0 -4px 18px #29473312}
.application-footer .b-actions{margin-top:10px}
.recall-actions{align-items:center;margin-bottom:22px}
@media(max-width:700px){.application-scroll{height:56vh}.application-footer{padding:14px}.application-scroll .b-grid{gap:16px}.application-footer .b-button{padding:10px 12px}}
/* Keep the floating assistant clear of the fixed form actions on phones. */
@media(max-width:700px){.application-page :deep(.companion-root){bottom:calc(190px + env(safe-area-inset-bottom))}.application-page :deep(.companion-panel){max-height:calc(100vh - 310px);max-height:calc(100dvh - 310px)}}
</style>

