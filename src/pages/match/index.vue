<script setup lang="ts">
import { ref } from 'vue'
import AiCompanion from '../../components/AiCompanion.vue'
import {pendingCompanionBrief} from '../../services/assistant'
import XianLocationPicker from '../../components/XianLocationPicker.vue'
import { readParentLocation, saveParentLocation, xianPlaces, type LocationPoint } from '../../services/location'
import { parseBriefLocally } from '../../services/brief-parser'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { studyMatchContext, suggestionInput } from '../../services/study-match'
import { businessService } from '../../services/business'
import { apiMode } from '../../config/runtime'
import { BusinessError, errorMessage } from '../../services/errors'
import { matchAssistantStatus, parseMatchBrief, type MatchSuggestion } from '../../services/api/match-assistant'
import { demoGrades, loadMatchCandidates, matchSubjects, matchTutors, validateMatch } from '../../services/matching'
import type { MatchInput, MatchResponse } from '../../services/matching'
import type { TeachingMode } from '../../types/tutor'
import { restoreSession, currentSession } from '../../utils/session'
const input = ref<MatchInput>({ subject: '', grade: '', budget: '', mode: '均可', preference: '', desiredTime: '' })
const parentLocation=ref<LocationPoint|null>(null)
const radiusKm=ref<number|undefined>()
const locationError=ref('')
const examples=[{title:'长安 · 数学基础',brief:'初中数学，预算100元，希望线下耐心讲解、复盘错题',place:0},{title:'小寨 · 英语阅读',brief:'初中英语，预算100元，希望线上练习阅读与口语',place:1},{title:'高新 · 物理专题',brief:'高中物理，预算150元，希望线下梳理基础与实验',place:2}]
function chooseLocation(point:LocationPoint|null){try{saveParentLocation(point);parentLocation.value=point;if(!point)radiusKm.value=undefined;locationError.value='';edit()}catch{locationError.value='位置保存失败，请检查本机存储后重试'}}
function useExample(example:typeof examples[number]){brief.value=example.brief;chooseLocation(xianPlaces[example.place]);editBrief()}
function setMode(mode:TeachingMode){input.value.mode=mode;if(mode!=='线下')radiusKm.value=undefined;edit()}
const study=ref<ReturnType<typeof studyMatchContext>>(null)
onLoad(options=>{const context=studyMatchContext(options?.topicId);if(context){study.value=context;input.value=context.input}})
function returnToStudy(){if(study.value)uni.navigateTo({url:'/pages/learning/index?topicId='+encodeURIComponent(study.value.topic.id)})}
const modes: TeachingMode[] = ['均可', '线上', '线下']
const result = ref<MatchResponse | null>(null)
const summary = ref('')
const loading = ref(false)
const error = ref('')
const brief = ref('')
const suggestion = ref<MatchSuggestion | null>(null)
const assistantState = ref<'checking'|'enabled'|'disabled'|'error'>('checking')
const parseLoading = ref(false)
const parseError = ref('')
const needsLogin = ref(false)
onShow(() => {
  if(pendingCompanionBrief.value){brief.value=pendingCompanionBrief.value;pendingCompanionBrief.value=null;editBrief()}
  parentLocation.value=readParentLocation()
  if(!parentLocation.value)radiusKm.value=undefined
  if (apiMode) void matchAssistantStatus().then(status => { assistantState.value = status.enabled ? 'enabled' : 'disabled' }).catch(() => { assistantState.value = 'error' })
})
let matchRequest=0,activeMatch=0,parseRequest=0
onHide(()=>{matchRequest++;activeMatch=0;parseRequest++;loading.value=false;parseLoading.value=false})
function edit() { matchRequest++; result.value = null; error.value = '' }
function editBrief() { suggestion.value = null; parseError.value = ''; needsLogin.value = false }
async function parseBrief() {
  if (parseLoading.value || (apiMode&&assistantState.value==='checking')) return
  parseError.value = ''
  needsLogin.value = false
  suggestion.value = null
  if (brief.value.trim().length < 6) { parseError.value = '请用至少 6 个字描述科目、预算或授课方式'; return }
  parseLoading.value = true
  const current=++parseRequest
  try {
    if(!apiMode||assistantState.value!=='enabled'){suggestion.value=parseBriefLocally(brief.value.trim());return}
    const session = await restoreSession()
    if(current!==parseRequest)return
    if (session?.user.role !== 'parent') { parseError.value = '请先登录家长/学生开发账户，再返回此页使用模型解析'; needsLogin.value = true; return }
    const owner=session.user.id
    const parsed=await parseMatchBrief(brief.value.trim())
    if(current===parseRequest&&currentSession.value?.user.id===owner)suggestion.value=parsed
  } catch (cause) { if(current===parseRequest){parseError.value = errorMessage(cause); needsLogin.value = cause instanceof BusinessError && (cause.code === 'UNAUTHORIZED' || cause.code === 'FORBIDDEN')} }
  finally { if(current===parseRequest)parseLoading.value = false }
}
function applySuggestion() {
  const value = suggestion.value
  if (!value) return
  input.value = suggestionInput(value)
  suggestion.value = null
  if(input.value.mode!=='线下')radiusKm.value=undefined
  edit()
}
async function recommend() {
  if (loading.value) return
  result.value = null
  error.value = validateMatch({...input.value,parentLocation:parentLocation.value,radiusKm:radiusKm.value})
  if (error.value) return
  const request = { ...input.value, parentLocation:parentLocation.value, radiusKm:radiusKm.value }
  const current=++matchRequest
  activeMatch=current
  summary.value = `${request.subject} · ${request.grade} · ¥${request.budget}/小时以内 · ${request.mode}${request.parentLocation?' · '+request.parentLocation.label:''}`
  loading.value = true
  try { const candidates=await loadMatchCandidates(businessService);if(current===matchRequest)result.value = matchTutors(candidates, request) }
  catch (cause) { if(current===matchRequest)error.value = errorMessage(cause) }
  finally { if(activeMatch===current){loading.value = false;activeMatch=0} }
}
function openTutor(id: string) { uni.navigateTo({ url: '/pages/tutors/detail?id=' + encodeURIComponent(id) }) }
function openLogin() { uni.navigateTo({ url: '/pages/auth/login' }) }
</script>
<template>
  <view class="page">
    <AiCompanion/>
    <view class="hero"><text class="eyebrow">AI 家教匹配 · 西安</text><text class="title">说出学习需求，找到身边的老师</text><text class="intro">{{ apiMode ? '读取开发 API 的公开家教' : '使用本机虚构家教' }}。推荐始终按公开规则生成；模型解析仅在服务端配置后可选使用。</text></view>
    <view v-if="study" class="study-context"><text class="study-tag">来自 AI 学习中心</text><text class="study-title">{{study.topic.stage}}{{study.topic.subject}} · {{study.topic.title}}</text><text>{{study.supported?'已带入科目和学段，请补充预算与授课方式。知识点供沟通参考，不代表家教已具备该专题教学资质。':'当前家教目录暂不支持该科目，不会自动换成其他学科。可返回笔记继续学习，或自行选择其他科目。'}}</text><button @click="returnToStudy">返回这份知识点笔记 ↗</button></view>
    <view class="ai-steps"><text>01 需求解析</text><text>02 地理筛选</text><text>03 推荐解释</text></view>
    <view class="surface-card assistant">
      <text class="label">AI 需求助手 · 先解析，再确认</text>
      <text class="hint">{{apiMode&&assistantState==='enabled'?'服务端模型已配置；点击解析后会发送需求文字。':'当前使用本机关键词解析（非大模型），无需密钥。'}} 只写科目、年级、预算与教学偏好；不填写姓名、联系方式或地址。先核对建议，再确认填入。</text>
      <view class="example-briefs"><button v-for="example in examples" :key="example.title" :disabled="parseLoading" @click="useExample(example)">{{example.title}}</button></view>
      <view class="assistant-fields">
        <textarea v-model="brief" :disabled="parseLoading" maxlength="160" placeholder="例如：初中数学，每小时预算 80 元，希望线上授课、讲解耐心" @input="editBrief"/>
        <button class="secondary-button assist-button" :loading="parseLoading" :disabled="parseLoading || (apiMode && assistantState==='checking')" @click="parseBrief">{{ parseLoading ? '正在解析…' : '解析需求' }}</button>
        <view v-if="parseError" class="error" role="alert">{{ parseError }} <text v-if="needsLogin" class="login-link" @click="openLogin">前往登录 →</text></view>
        <view v-if="suggestion" class="suggestion"><text class="label">解析建议，请核对</text><text class="hint">未识别字段确认后将清空，请补齐后生成推荐。</text><text>科目：{{ suggestion.subject ?? '未识别' }} · 年级：{{ suggestion.grade ?? '未识别' }}</text><text>预算：{{ suggestion.budget == null ? '未识别' : '¥' + suggestion.budget + '/小时' }} · 方式：{{ suggestion.mode ?? '未识别' }}</text><text>偏好：{{ suggestion.preference ?? '未识别' }}</text><button class="secondary-button assist-button" @click="applySuggestion">确认并填入表单</button></view>
      </view>
      <text v-if="apiMode && assistantState !== 'enabled'" class="hint">{{ assistantState === 'checking' ? '正在检查模型配置…' : assistantState === 'disabled' ? '服务端模型未配置，当前提供本机关键词解析与规则推荐。' : '模型状态暂不可读取，当前使用本机关键词解析。' }}</text>
    </view>
    <view class="surface-card"><XianLocationPicker :model-value="parentLocation" @update:model-value="chooseLocation"/><text v-if="locationError" class="error">{{locationError}}</text></view>
    <view class="surface-card form">
      <text class="label">科目 *</text><view class="chips"><button v-for="s in matchSubjects" :key="s" :disabled="loading" :class="{selected:input.subject===s}" @click="input.subject=s;edit()">{{ s }}</button></view>
      <text class="label">演示年级 *</text><view class="chips"><button v-for="g in demoGrades" :key="g" :disabled="loading" :class="{selected:input.grade===g}" @click="input.grade=g;edit()">{{ g }}</button></view>
      <text class="hint">仅作需求摘要；当前资料不能验证家教适教年级，不参与评分。</text>
      <text class="label">每小时预算上限（元）*</text><input v-model="input.budget" :disabled="loading" type="digit" maxlength="12" placeholder="如 100，范围 0.01–2000" @input="edit"/>
      <text class="label">授课方式</text><view class="chips"><button v-for="m in modes" :key="m" :disabled="loading" :class="{selected:input.mode===m}" @click="setMode(m)">{{ m }}</button></view>
      <view v-if="parentLocation && input.mode==='线下'" class="nearby"><text class="label">附近筛选（片区参考直线距离）</text><view class="chips"><button :class="{selected:radiusKm===undefined}" @click="radiusKm=undefined;edit()">不限距离</button><button v-for="r in [5,10,20]" :key="r" :class="{selected:radiusKm===r}" @click="radiusKm=r;edit()">{{r}} km 内</button></view></view>
      <text class="label">期望上课时间（推荐填写，最高30分）</text><input v-model="input.desiredTime" :disabled="loading" maxlength="100" placeholder="例如：周六下午、周日晚上" @input="edit"/>
      <text class="hint">星期和时段需与老师公开空闲时间吻合；未提供或无法识别时此项不加分，不推断老师有空。</text>
      <text class="label">教学偏好（选填）</text><input v-model="input.preference" :disabled="loading" maxlength="40" placeholder="如 耐心 讲解，以空格分隔" @input="edit"/>
      <text class="hint">只填写教学偏好，不要输入姓名、联系方式、学校班级等个人信息。</text>
      <button class="primary-button submit" :loading="loading" :disabled="loading" @click="recommend">{{ loading ? '正在匹配…' : '生成推荐' }}</button>
      <view v-if="error" class="error" role="alert">{{ error }}</view>
    </view>
    <view class="surface-card rules"><text class="label">推荐规则公开可查</text><text>先过滤科目、预算和授课方式。满分100分：科目35 + 时间吻合0–30 + 简介明确声明的教学经验0–20 + 价格优势0–10 + 教学偏好0–5；选位置后，线下同分优先距离近的片区，再按价格、ID 排序；线上不受位置限制。距离不加分，无法识别片区的资料不进入附近筛选。价格优势 = 四舍五入(10 × (1 − 课时费 / 预算))。时间按星期、上午/下午/晚上作保守文本匹配，经验只读取明确填写的年限且未经核实。偏好按资料关键词命中比例评分；空偏好为 0。</text></view>
    <view v-if="result" class="results">
      <text class="label">{{ summary }}</text><text class="hint">{{ result.total }} 位候选，{{ result.eligible }} 位符合条件。排除：科目 {{ result.excluded.subject }}、预算 {{ result.excluded.budget }}、方式 {{ result.excluded.mode }}、距离或位置缺失 {{ result.excluded.distance }}（按首个不满足条件统计）。</text>
      <view v-if="!result.results.length" class="surface-card empty">没有符合条件的家教。可尝试提高预算、调整方式或科目；不会自动放宽你的条件。</view>
      <view v-for="(item,index) in result.results" :key="item.tutor.id" class="surface-card match-card">
        <view class="row"><text class="name">{{ index+1 }}. {{ item.tutor.name }}</text><text class="score">{{ item.score }} 分</text></view>
        <text class="hint">{{item.tutor.area}} · {{item.tutor.availability}}</text>
        <text class="hint">{{ item.tutor.university }} · {{ item.tutor.teachingMode }} · ¥{{ item.tutor.pricePerHour }}/小时</text>
        <text v-for="reason in item.reasons" :key="reason" class="reason">{{ reason }}</text>
        <button class="secondary-button" @click="openTutor(item.tutor.id)">查看详情与预约</button>
      </view>
    </view>
    <view class="hint footer">推荐辅助选择，不保证教学效果；资料、资格与年级适配仍需核实。预约沿用平台原流程。</view>
  </view>
</template>
<style scoped>
.page{padding:26rpx;max-width:960px;margin:auto}.hero{padding:36rpx 30rpx;background:linear-gradient(130deg,#174fae,#397edb);border-radius:24rpx;color:#fff;display:flex;flex-direction:column;gap:16rpx}.eyebrow{font-size:24rpx;opacity:.85}.title{font-size:38rpx;font-weight:700;line-height:1.4}.intro{font-size:24rpx;line-height:1.6}.surface-card{margin-top:24rpx}.label{display:block;font-size:28rpx;font-weight:700;margin:14rpx 0 18rpx}.chips{display:flex;gap:12rpx;flex-wrap:wrap;margin-bottom:18rpx}.chips button{margin:0;padding:0 20rpx;background:#edf2f9;color:#42546e;border-radius:12rpx;font-size:25rpx}.chips .selected{background:#245fc7;color:#fff}input{background:#f2f5fa;height:84rpx;padding:16rpx;border-radius:12rpx;font-size:25rpx;margin-bottom:16rpx}.hint{display:block;color:#6b7c93;font-size:23rpx;line-height:1.7}.submit{margin-top:26rpx}.error{color:#b22222;margin-top:20rpx;font-size:25rpx}.rules{font-size:23rpx;line-height:1.8;color:#53647c}.row{display:flex;justify-content:space-between;gap:20rpx}.name{font-size:30rpx;font-weight:700}.score{color:#215fc6;font-weight:700;white-space:nowrap}.reason{display:block;font-size:24rpx;line-height:1.8;margin:10rpx 0;color:#415771}.match-card button{margin-top:20rpx}.results{margin-top:32rpx}.empty{font-size:26rpx;line-height:1.8;color:#63738a}.footer{padding:28rpx 10rpx;text-align:center}.assistant textarea{display:block;width:100%;height:170rpx;background:#f2f5fa;border-radius:12rpx;padding:18rpx;font-size:25rpx;margin-top:18rpx}.assist-button{margin:18rpx 0 0}.login-link{color:#245fc7}.suggestion{display:flex;flex-direction:column;gap:10rpx;margin-top:20rpx;font-size:24rpx;color:#415771}
.ai-steps{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}.ai-steps text{flex:1;min-width:90px;background:#e5f1ed;border-radius:10px;padding:13px 8px;color:#167568;text-align:center;font-size:13px;font-weight:700}.example-briefs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.example-briefs button{margin:0;font-size:12px;line-height:2.7;background:#eaf0fc;color:#315aaf;padding:0 12px}.assistant textarea{box-sizing:border-box}.assistant{overflow:hidden}
.study-context{display:flex;flex-direction:column;gap:12px;background:#f0f5e9;border:1px solid #b9cbb3;border-radius:16px;padding:20px;margin-top:20px;color:#405c44;font-size:14px;line-height:1.8}.study-tag{font-size:12px;color:#4c754e}.study-title{font-size:20px;font-weight:700}.study-context button{margin:0;align-self:flex-start;font-size:13px;background:#e1ecdd;color:#30563a;line-height:2.8;padding:0 14px}
</style>
