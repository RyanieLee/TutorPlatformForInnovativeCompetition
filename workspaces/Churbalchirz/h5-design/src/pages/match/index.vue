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
.page{padding:24px;max-width:960px;margin:auto}.hero{padding:28px 32px;background:#eaf0e7;border:1px solid #dfe5d7;border-radius:20px;color:#173c32;display:flex;flex-direction:column;gap:12px}.eyebrow{font-size:12px;letter-spacing:1px;color:#52665b}.title{font-size:30px;font-weight:600;line-height:1.4}.intro{font-size:14px;line-height:1.8;color:#52665b}.surface-card{margin-top:20px}.label{display:block;font-size:16px;font-weight:600;margin:14px 0 12px}.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.chips button{margin:0;padding:0 16px;background:#f4f5ef;color:#52665b;border-radius:8px;font-size:14px;line-height:42px}.chips .selected{background:#185448;color:#fff}input{background:#f8f9f5;border:1px solid #dfe5de;height:48px;padding:12px 14px;border-radius:10px;font-size:16px;margin-bottom:12px}.hint{display:block;color:#61716a;font-size:14px;line-height:1.8}.submit{margin-top:24px}.error{color:#a3392f;margin-top:18px;font-size:14px}.rules{font-size:14px;line-height:1.8;color:#61716a}.row{display:flex;justify-content:space-between;gap:16px}.name{font-size:20px;font-weight:600}.score{color:#185448;font-weight:600;white-space:nowrap}.reason{display:block;font-size:14px;line-height:1.8;margin:10px 0;color:#52665b}.match-card button{margin-top:20px}.results{margin-top:28px}.empty{font-size:16px;line-height:1.8;color:#61716a}.footer{padding:24px 8px;text-align:center}@media(max-width:700px){.page{padding:20px 16px}.hero{padding:24px}.title{font-size:24px}.name{font-size:18px}}
</style>
