<script setup lang="ts">
import ParentLayout from '../../components/ParentLayout.vue'
import { apiMode } from '../../config/runtime'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { BookingOrder } from '../../types/tutor'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { bookingStatusLabels } from '../../services/rules'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const bookings = ref<BookingOrder[]>([])
const ready = ref(false)
const loading = ref(false)
const error = ref('')
onShow(() => { void loadBookings() })
async function loadBookings() {
  loading.value = true
  error.value = ''
  try {
    await restoreSession()
    bookings.value = canAccess(['parent']) && currentSession.value
      ? await businessService.listParentBookings(currentSession.value.user) : []
  } catch (cause) { error.value = errorMessage(cause); bookings.value = [] }
  finally { loading.value = false; ready.value = true }
}
function cancel(id: string) {
  const user = currentSession.value?.user
  if (!user || !canAccess(['parent'])) return
  uni.showModal({ title: '取消预约', content: apiMode ? '将开发服务器中的这条预约标记为已取消？' : '将本机演示预约标记为已取消？', success: async result => {
    if (!result.confirm) return
    try {
      await businessService.transitionBooking(user, id, 'cancel')
      await loadBookings()
    } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  } })
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
const goHome = () => uni.switchTab({ url: '/pages/index/index' })
</script>
<template>
  <ParentLayout title="我的预约" active="orders">
  <view class="page"><view class="title">我的预约</view><view class="notice">{{ apiMode ? '开发版预约保存在本地数据库，不会通知老师，也不代表真实订单。' : '本机模拟记录，不跨设备同步，不会真实通知老师，也不代表真实订单。' }}</view>
    <view v-if="!ready || loading" class="surface-card empty-state">正在读取预约…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">登录后查看演示预约<button class="primary-button guide" @click="goLogin">进入演示登录</button></view>
    <view v-else-if="!canAccess(['parent'])" class="surface-card empty-state">当前身份不能查看家长预约<view class="muted-note">可在“我的”切换身份。</view><button class="secondary-button guide" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button guide" @click="loadBookings">重试</button></view>
    <template v-else><view v-if="!bookings.length" class="surface-card empty-state">暂无预约记录<button class="primary-button guide" @click="goHome">去找家教</button></view><view v-for="b in bookings" :key="b.id" class="card"><view class="head"><text>{{ b.tutorName }}</text><text class="status">{{ bookingStatusLabels[b.status] }}</text></view><view class="line">辅导科目：{{ b.subject }}</view><view class="line">期望时间：{{ b.expectedTime }}</view><view class="line">预约称呼：{{ b.studentName }}</view><view class="line">创建时间：{{ b.createdAt }}</view><text v-if="b.status === 'pending' || b.status === 'accepted'" class="cancel" @click="cancel(b.id)">取消预约</text></view></template>
  </view>
</ParentLayout>
</template>
<style scoped>
.page{padding:0;max-width:820px;margin:0 auto}.title{font-size:36rpx;font-weight:800;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-top:22rpx}.head{display:flex;justify-content:space-between;font-weight:700;font-size:29rpx;border-bottom:1rpx solid #eef1f5;padding-bottom:15rpx}.status{font-size:23rpx;color:#2868e4}.line{font-size:24rpx;color:#596a82;margin-top:15rpx}.cancel{display:block;text-align:right;color:#d65b54;margin-top:25rpx}.surface-card{margin-top:22rpx}.guide{margin-top:28rpx}
</style>
