<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { bookingStatusLabels, type BookingAction } from '../../services/rules'
import type { BookingOrder } from '../../types/tutor'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const id = ref('')
const booking = ref<BookingOrder | null>(null)
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
    if (user && canAccess(['tutor'])) booking.value = await businessService.getTutorBooking(user, id.value)
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
}
async function act(action: BookingAction) {
  const user = currentSession.value?.user
  if (!user || !booking.value || busy.value) return
  busy.value = true
  try {
    booking.value = await businessService.transitionBooking(user, booking.value.id, action)
    uni.showToast({ title: '已更新演示预约', icon: 'none' })
  } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login?role=tutor' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>
<template>
  <view class="page"><view class="heading">收到的预约</view><view class="notice">仅本机模拟状态，不会联系家长或老师；请勿填写真实资料。</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取预约…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">请进入家教演示身份<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['tutor'])" class="surface-card empty-state">当前身份不能查看家教预约<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button action" @click="load">重试</button></view>
    <view v-else-if="booking" class="surface-card detail"><view class="status">{{ bookingStatusLabels[booking.status] }}</view><view class="row"><text>辅导科目</text><text>{{ booking.subject }}</text></view><view class="row"><text>预约称呼</text><text>{{ booking.studentName }}</text></view><view class="row"><text>演示联系号码</text><text>{{ booking.contact }}</text></view><view class="row"><text>期望时间</text><text>{{ booking.expectedTime }}</text></view><view class="row"><text>辅导需求</text><text>{{ booking.note || '未填写' }}</text></view><view v-if="booking.status === 'pending'"><button class="primary-button action" :loading="busy" @click="act('accept')">接受预约</button><button class="secondary-button action" :loading="busy" @click="act('reject')">拒绝预约</button></view><button v-if="booking.status === 'accepted'" class="secondary-button action" :loading="busy" @click="act('complete')">标记已完成</button></view>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.surface-card{margin-top:22rpx}.status{font-size:31rpx;font-weight:700;color:#2868e4;margin-bottom:16rpx}.row{display:flex;justify-content:space-between;gap:20rpx;padding:18rpx 0;border-bottom:1rpx solid #eef2f7;color:#54647d;font-size:25rpx}.row text:last-child{text-align:right}.action{margin-top:22rpx}
</style>
