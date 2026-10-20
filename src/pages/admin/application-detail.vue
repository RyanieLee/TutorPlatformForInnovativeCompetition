<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { reviewStatusLabels } from '../../services/rules'
import type { TutorApplication } from '../../types/business'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const id = ref('')
const application = ref<TutorApplication | null>(null)
const reason = ref('')
const ready = ref(false)
const busy = ref(false)
const error = ref('')
onLoad(options => { id.value = String(options?.id ?? '') })
onShow(() => { void load() })
async function load() {
  ready.value = false
  error.value = ''
  try {
    await restoreSession()
    const user = currentSession.value?.user
    if (user && canAccess(['admin'])) application.value = await businessService.getApplication(user, id.value)
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
}
async function review(decision: 'approved' | 'rejected') {
  const user = currentSession.value?.user
  if (!user || !application.value || busy.value) return
  busy.value = true
  try {
    application.value = await businessService.reviewApplication(user, application.value.id, decision, reason.value)
    uni.showToast({ title: decision === 'approved' ? '已模拟通过' : '已模拟拒绝', icon: 'none' })
  } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login?role=admin' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>
<template>
  <view class="page"><view class="heading">家教申请审核</view><view class="notice">仅供演示流程，不验证真实学校、身份或资质。</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取申请…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">请进入管理员演示身份<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['admin'])" class="surface-card empty-state">当前身份不能审核申请<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button action" @click="load">重试</button></view>
    <view v-else-if="application" class="surface-card detail"><view class="status">{{ reviewStatusLabels[application.status] }}</view><view class="row"><text>展示称呼</text><text>{{ application.displayName }}</text></view><view class="row"><text>学校 / 专业</text><text>{{ application.university }} · {{ application.major }}</text></view><view class="row"><text>擅长科目</text><text>{{ application.subjects.join('、') }}</text></view><view class="row"><text>授课方式 / 地区</text><text>{{ application.teachingMode }} · {{ application.area }}</text></view><view class="row"><text>参考价格</text><text>¥{{ application.pricePerHour }}/小时</text></view><view class="row"><text>可授课时间</text><text>{{ application.availability }}</text></view><view class="intro">个人介绍：{{ application.introduction }}</view><view v-if="application.rejectionReason" class="reason">拒绝原因：{{ application.rejectionReason }}</view><view v-if="application.status === 'pending'"><view class="field"><text>拒绝原因（拒绝时必填）</text><textarea v-model="reason" maxlength="200" placeholder="填写演示审核原因"/></view><button class="primary-button action" :loading="busy" @click="review('approved')">模拟审核通过</button><button class="secondary-button action" :loading="busy" @click="review('rejected')">模拟审核拒绝</button></view></view>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.surface-card{margin-top:22rpx}.status{font-size:31rpx;font-weight:700;color:#2868e4}.row{display:flex;justify-content:space-between;gap:20rpx;padding:18rpx 0;border-bottom:1rpx solid #eef2f7;color:#54647d;font-size:25rpx}.row text:last-child{text-align:right}.intro,.reason{margin-top:18rpx;font-size:25rpx;line-height:1.7}.reason{color:#b44d47}.field{display:flex;flex-direction:column;gap:12rpx;margin-top:25rpx}.field textarea{background:#fbfcfe;border:1rpx solid #e5eaf2;border-radius:12rpx;padding:18rpx;min-height:120rpx;width:100%;font-size:26rpx}.action{margin-top:18rpx}
</style>
