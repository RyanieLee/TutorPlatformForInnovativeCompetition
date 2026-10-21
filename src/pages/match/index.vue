<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { apiMode } from '../../config/runtime'
import { BusinessError, errorMessage } from '../../services/errors'
import { matchAssistantStatus, parseMatchBrief, type MatchSuggestion } from '../../services/api/match-assistant'
import { demoGrades, loadMatchCandidates, matchSubjects, matchTutors, validateMatch } from '../../services/matching'
import type { MatchInput, MatchResponse } from '../../services/matching'
import type { TeachingMode } from '../../types/tutor'
import { restoreSession } from '../../utils/session'
const input = ref<MatchInput>({ subject: '', grade: '', budget: '', mode: '均可', preference: '' })
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
  if (apiMode) void matchAssistantStatus().then(status => { assistantState.value = status.enabled ? 'enabled' : 'disabled' }).catch(() => { assistantState.value = 'error' })
})
function edit() { result.value = null; error.value = '' }
function editBrief() { suggestion.value = null; parseError.value = ''; needsLogin.value = false }
async function parseBrief() {
  if (parseLoading.value || assistantState.value !== 'enabled') return
  parseError.value = ''
  needsLogin.value = false
  suggestion.value = null
  if (brief.value.trim().length < 6) { parseError.value = '请用至少 6 个字描述科目、预算或授课方式'; return }
  parseLoading.value = true
  try {
    const session = await restoreSession()
    if (session?.user.role !== 'parent') { parseError.value = '请先登录家长/学生开发账户，再返回此页使用模型解析'; needsLogin.value = true; return }
    suggestion.value = await parseMatchBrief(brief.value.trim())
  } catch (cause) { parseError.value = errorMessage(cause); needsLogin.value = cause instanceof BusinessError && (cause.code === 'UNAUTHORIZED' || cause.code === 'FORBIDDEN') }
  finally { parseLoading.value = false }
}
function applySuggestion() {
  const value = suggestion.value
  if (!value) return
  input.value = {
    subject: value.subject ?? input.value.subject,
    grade: value.grade ?? input.value.grade,
    budget: value.budget == null ? input.value.budget : String(value.budget),
    mode: value.mode ?? input.value.mode,
    preference: value.preference ?? input.value.preference
  }
  suggestion.value = null
  edit()
}
async function recommend() {
  if (loading.value) return
  result.value = null
  error.value = validateMatch(input.value)
  if (error.value) return
  const request = { ...input.value }
  summary.value = `${request.subject} · ${request.grade} · ¥${request.budget}/小时以内 · ${request.mode}`
  loading.value = true
  try { result.value = matchTutors(await loadMatchCandidates(businessService), request) }
  catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
}
function openTutor(id: string) { uni.navigateTo({ url: '/pages/tutors/detail?id=' + encodeURIComponent(id) }) }
function openLogin() { uni.navigateTo({ url: '/pages/auth/login' }) }
</script>
<template>
  <view class="page">
    <view class="hero"><text class="eyebrow">家教匹配 · 规则演示</text><text class="title">把需求，变成有理由的推荐</text><text class="intro">{{ apiMode ? '读取开发 API 的公开家教' : '使用本机虚构家教' }}。推荐始终按公开规则生成；模型解析仅在服务端配置后可选使用。</text></view>
    <view v-if="apiMode" class="surface-card assistant">
      <text class="label">可选：用模型整理需求</text>
      <text class="hint">点击解析会把下方需求文字发送给已配置的模型服务。只写科目、演示年级、预算、授课方式和教学偏好；不要填写姓名、联系方式或地址。解析建议需确认后才应用。</text>
      <template v-if="assistantState === 'enabled'">
        <textarea v-model="brief" :disabled="parseLoading" maxlength="160" placeholder="例如：初中数学，每小时预算 80 元，希望线上授课、讲解耐心" @input="editBrief"/>
        <button class="secondary-button assist-button" :loading="parseLoading" :disabled="parseLoading" @click="parseBrief">{{ parseLoading ? '正在解析…' : '解析需求' }}</button>
        <view v-if="parseError" class="error" role="alert">{{ parseError }} <text v-if="needsLogin" class="login-link" @click="openLogin">前往登录 →</text></view>
        <view v-if="suggestion" class="suggestion"><text class="label">解析建议，请核对</text><text>科目：{{ suggestion.subject ?? '未识别' }} · 年级：{{ suggestion.grade ?? '未识别' }}</text><text>预算：{{ suggestion.budget == null ? '未识别' : '¥' + suggestion.budget + '/小时' }} · 方式：{{ suggestion.mode ?? '未识别' }}</text><text>偏好：{{ suggestion.preference ?? '未识别' }}</text><button class="secondary-button assist-button" @click="applySuggestion">确认并填入表单</button></view>
      </template>
      <text v-else class="hint">{{ assistantState === 'checking' ? '正在检查模型配置…' : assistantState === 'disabled' ? '服务端尚未配置模型，仍可手动填写并使用规则匹配。' : '模型状态暂时不可读取，仍可手动填写。' }}</text>
    </view>
    <view class="surface-card form">
      <text class="label">科目 *</text><view class="chips"><button v-for="s in matchSubjects" :key="s" :disabled="loading" :class="{selected:input.subject===s}" @click="input.subject=s;edit()">{{ s }}</button></view>
      <text class="label">演示年级 *</text><view class="chips"><button v-for="g in demoGrades" :key="g" :disabled="loading" :class="{selected:input.grade===g}" @click="input.grade=g;edit()">{{ g }}</button></view>
      <text class="hint">仅作需求摘要；当前资料不能验证家教适教年级，不参与评分。</text>
      <text class="label">每小时预算上限（元）*</text><input v-model="input.budget" :disabled="loading" type="digit" maxlength="12" placeholder="如 100，范围 0.01–2000" @input="edit"/>
      <text class="label">授课方式</text><view class="chips"><button v-for="m in modes" :key="m" :disabled="loading" :class="{selected:input.mode===m}" @click="input.mode=m;edit()">{{ m }}</button></view>
      <text class="label">教学偏好（选填）</text><input v-model="input.preference" :disabled="loading" maxlength="40" placeholder="如 耐心 讲解，以空格分隔" @input="edit"/>
      <text class="hint">只填写教学偏好，不要输入姓名、联系方式、学校班级等个人信息。</text>
      <button class="primary-button submit" :loading="loading" :disabled="loading" @click="recommend">{{ loading ? '正在匹配…' : '生成推荐' }}</button>
      <view v-if="error" class="error" role="alert">{{ error }}</view>
    </view>
    <view class="surface-card rules"><text class="label">推荐规则公开可查</text><text>先过滤科目、预算和授课方式。得分 = 科目 50 + 方式 20 + 预算余量 0–20 + 偏好命中 0–10；同分按价格、ID 排序。预算余量 = 四舍五入(20 × (1 − 课时费 / 预算))。偏好按资料关键词命中比例评分；空偏好为 0。</text></view>
    <view v-if="result" class="results">
      <text class="label">{{ summary }}</text><text class="hint">{{ result.total }} 位候选，{{ result.eligible }} 位符合条件。排除：科目 {{ result.excluded.subject }}、预算 {{ result.excluded.budget }}、方式 {{ result.excluded.mode }}（按首个不满足条件统计）。</text>
      <view v-if="!result.results.length" class="surface-card empty">没有符合条件的家教。可尝试提高预算、调整方式或科目；不会自动放宽你的条件。</view>
      <view v-for="(item,index) in result.results" :key="item.tutor.id" class="surface-card match-card">
        <view class="row"><text class="name">{{ index+1 }}. {{ item.tutor.name }}</text><text class="score">{{ item.score }} 分</text></view>
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
</style>
