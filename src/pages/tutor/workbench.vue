<script setup lang="ts">
import { apiMode } from '../../config/runtime'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { bookingStatusLabels, reviewStatusLabels } from '../../services/rules'
import type { BookingOrder } from '../../types/tutor'
import type { TutorApplication } from '../../types/business'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const application = ref<TutorApplication | null>(null)
const bookings = ref<BookingOrder[]>([])
const ready = ref(false)
const error = ref('')
const pending = computed(() => bookings.value.filter(b => b.status === 'pending'))
const accepted = computed(() => bookings.value.filter(b => b.status === 'accepted'))
const history = computed(() => bookings.value.filter(b => b.status !== 'pending' && b.status !== 'accepted'))
onShow(() => { void load() })
async function load() {
  ready.value = false
  error.value = ''
  try {
    await restoreSession()
    const user = currentSession.value?.user
    if (user && canAccess(['tutor'])) {
      const [profile, orders] = await Promise.all([
        businessService.getMyApplication(user), businessService.listTutorBookings(user)
      ])
      application.value = profile
      bookings.value = orders
    }
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login?role=tutor' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
const edit = () => uni.navigateTo({ url: '/pages/tutor/application' })
const openBooking = (id: string) => uni.navigateTo({ url: '/pages/tutor/booking-detail?id=' + id })
</script>
<template>
  <view class="page"><view class="heading">家教工作台</view><view class="notice">{{ apiMode ? '开发版数据保存在本地数据库，不会发送真实预约通知。' : '仅本机演示，不会收到真实预约通知。示例老师“小林老师”的预约关联当前演示家教。' }}</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取工作台…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">登录家教演示身份后查看<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['tutor'])" class="surface-card empty-state">当前身份不能进入家教工作台<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button action" @click="load">重试</button></view>
    <template v-else>
      <view class="surface-card profile"><view class="section-title">入驻资料</view><view class="row"><text>审核状态</text><text>{{ application ? reviewStatusLabels[application.status] : '未申请' }}</text></view><view v-if="application"><view class="row"><text>展示称呼</text><text>{{ application.displayName || '未填写' }}</text></view><view class="row"><text>学校 / 专业</text><text>{{ application.university || '未填写' }} · {{ application.major || '未填写' }}</text></view><view v-if="application.rejectionReason" class="reason">拒绝原因：{{ application.rejectionReason }}</view></view><button class="secondary-button action" @click="edit">{{ application ? '查看 / 修改资料' : '填写入驻申请' }}</button></view>
      <view class="section-title list-title">待确认预约（{{ pending.length }}）</view><view v-if="!pending.length" class="surface-card empty-state">暂无待确认预约</view><view v-for="b in pending" :key="b.id" class="surface-card booking" @click="openBooking(b.id)"><text>{{ b.subject }} · {{ b.studentName }}</text><text class="muted-note">{{ b.expectedTime }}　{{ bookingStatusLabels[b.status] }} →</text></view>
      <view class="section-title list-title">已确认预约（{{ accepted.length }}）</view><view v-if="!accepted.length" class="surface-card empty-state">暂无已确认预约</view><view v-for="b in accepted" :key="b.id" class="surface-card booking" @click="openBooking(b.id)"><text>{{ b.subject }} · {{ b.studentName }}</text><text class="muted-note">{{ b.expectedTime }}　{{ bookingStatusLabels[b.status] }} →</text></view>
      <view v-if="history.length" class="section-title list-title">历史记录</view><view v-for="b in history" :key="b.id" class="surface-card booking" @click="openBooking(b.id)"><text>{{ b.subject }} · {{ b.studentName }}</text><text class="muted-note">{{ bookingStatusLabels[b.status] }} →</text></view>
    </template>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.surface-card{margin-top:20rpx}.section-title{font-size:30rpx;font-weight:700}.list-title{margin:38rpx 0 5rpx}.row{display:flex;justify-content:space-between;gap:20rpx;margin-top:18rpx;color:#54647d;font-size:24rpx}.row text:last-child{text-align:right}.reason{color:#b44d47;margin-top:18rpx;font-size:24rpx}.action{margin-top:22rpx}.booking{display:flex;flex-direction:column;gap:12rpx}
</style>
