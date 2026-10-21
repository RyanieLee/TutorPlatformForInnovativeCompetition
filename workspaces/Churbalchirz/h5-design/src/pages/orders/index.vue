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
function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
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
    <template v-else><view v-if="!bookings.length" class="surface-card empty-state">暂无预约记录<button class="primary-button guide" @click="goHome">去找家教</button></view><view v-for="b in bookings" :key="b.id" class="card"><view class="head"><text>{{ b.tutorName }}</text><text class="status" :class="b.status">{{ bookingStatusLabels[b.status] }}</text></view><view class="line">辅导科目：{{ b.subject }}</view><view class="line">期望时间：{{ b.expectedTime }}</view><view class="line">预约称呼：{{ b.studentName }}</view><view class="line">创建时间：{{ formatCreatedAt(b.createdAt) }}</view><text v-if="b.status === 'pending' || b.status === 'accepted'" class="cancel" @click="cancel(b.id)">取消预约</text></view></template>
  </view>
</ParentLayout>
</template>
<style scoped>

.page{padding:0;max-width:960px;margin:0 auto}.title{font-size:30px;font-weight:600;margin-bottom:20px}.notice{background:#fff8e8;border:1px solid #e8dfc7;color:#796039;padding:16px 20px;border-radius:12px;font-size:14px;line-height:1.8}.card{background:#fff;border:1px solid #dfe5de;border-radius:16px;padding:24px;margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.head{grid-column:1/-1;display:flex;justify-content:space-between;gap:16px;align-items:center;font-weight:600;font-size:20px;border-bottom:1px solid #e8ece5;padding-bottom:16px;margin-bottom:4px}.status{font-size:14px;color:#185448;background:#edf3ed;border-radius:6px;padding:5px 10px;white-space:nowrap}.status.pending{color:#826126;background:#fff4d9}.status.rejected,.status.cancelled{color:#80514a;background:#f6eeea}.line{font-size:14px;color:#61716a;line-height:1.8;overflow-wrap:anywhere}.cancel{grid-column:1/-1;display:block;text-align:right;color:#a3392f;margin-top:8px;cursor:pointer;font-size:14px}.surface-card{margin-top:20px}.guide{margin-top:24px}@media(max-width:700px){.title{font-size:24px}.card{grid-template-columns:minmax(0,1fr);gap:8px;padding:20px}.head{font-size:18px}.notice{font-size:12px}.status{font-size:12px}}

</style>
