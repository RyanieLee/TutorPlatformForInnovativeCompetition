<script setup lang="ts">
import { ref } from 'vue'
import { businessService } from '../../services/business'
import { apiMode } from '../../config/runtime'
import { errorMessage } from '../../services/errors'
import { demoGrades, loadMatchCandidates, matchSubjects, matchTutors, validateMatch } from '../../services/matching'
import type { MatchInput, MatchResponse } from '../../services/matching'
import type { TeachingMode } from '../../types/tutor'
const input = ref<MatchInput>({ subject: '', grade: '', budget: '', mode: '均可', preference: '' })
const modes: TeachingMode[] = ['均可', '线上', '线下']
const result = ref<MatchResponse | null>(null)
const summary = ref('')
const loading = ref(false)
const error = ref('')
function edit() { result.value = null; error.value = '' }
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
</script>
<template>
  <view class="page">
    <view class="hero"><text class="eyebrow">AI 家教匹配 · 规则演示</text><text class="title">把需求，变成有理由的推荐</text><text class="intro">{{ apiMode ? '读取开发 API 的公开家教' : '使用本机虚构家教' }}。无需密钥，当前未调用大模型。</text></view>
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
.page{padding:26rpx;max-width:960px;margin:auto}.hero{padding:36rpx 30rpx;background:linear-gradient(130deg,#174fae,#397edb);border-radius:24rpx;color:#fff;display:flex;flex-direction:column;gap:16rpx}.eyebrow{font-size:24rpx;opacity:.85}.title{font-size:38rpx;font-weight:700;line-height:1.4}.intro{font-size:24rpx;line-height:1.6}.surface-card{margin-top:24rpx}.label{display:block;font-size:28rpx;font-weight:700;margin:14rpx 0 18rpx}.chips{display:flex;gap:12rpx;flex-wrap:wrap;margin-bottom:18rpx}.chips button{margin:0;padding:0 20rpx;background:#edf2f9;color:#42546e;border-radius:12rpx;font-size:25rpx}.chips .selected{background:#245fc7;color:#fff}input{background:#f2f5fa;height:84rpx;padding:16rpx;border-radius:12rpx;font-size:25rpx;margin-bottom:16rpx}.hint{display:block;color:#6b7c93;font-size:23rpx;line-height:1.7}.submit{margin-top:26rpx}.error{color:#b22222;margin-top:20rpx;font-size:25rpx}.rules{font-size:23rpx;line-height:1.8;color:#53647c}.row{display:flex;justify-content:space-between;gap:20rpx}.name{font-size:30rpx;font-weight:700}.score{color:#215fc6;font-weight:700;white-space:nowrap}.reason{display:block;font-size:24rpx;line-height:1.8;margin:10rpx 0;color:#415771}.match-card button{margin-top:20rpx}.results{margin-top:32rpx}.empty{font-size:26rpx;line-height:1.8;color:#63738a}.footer{padding:28rpx 10rpx;text-align:center}
</style>
