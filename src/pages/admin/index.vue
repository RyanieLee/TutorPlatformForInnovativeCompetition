<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { reviewStatusLabels } from '../../services/rules'
import type { TutorApplication, TutorReport } from '../../types/business'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const applications = ref<TutorApplication[]>([])
const reports = ref<TutorReport[]>([])
const ready = ref(false)
const error = ref('')
const busyId = ref('')
const pending = computed(() => applications.value.filter(a => a.status === 'pending'))
const reviewed = computed(() => applications.value.filter(a => a.status !== 'pending'))
onShow(() => { void load() })
async function load() {
  ready.value = false
  error.value = ''
  try {
    await restoreSession()
    const user = currentSession.value?.user
    if (user && canAccess(['admin'])) {
      const [apps, items] = await Promise.all([businessService.listApplications(user), businessService.listReports(user)])
      applications.value = apps
      reports.value = items
    }
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
}
async function resolve(id: string) {
  const user = currentSession.value?.user
  if (!user || busyId.value) return
  busyId.value = id
  try { await businessService.resolveReport(user, id); await load(); uni.showToast({ title: '已标记处理', icon: 'none' }) }
  catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busyId.value = '' }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login?role=admin' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
const openApplication = (id: string) => uni.navigateTo({ url: '/pages/admin/application-detail?id=' + id })
</script>
<template>
  <view class="page"><view class="heading">模拟审核台</view><view class="notice">仅本机演示审核与举报处理，不代表真实身份或资质核验，也没有服务端权限保障。</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取审核数据…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">请进入管理员演示身份<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['admin'])" class="surface-card empty-state">当前身份不能进入审核台<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button action" @click="load">重试</button></view>
    <template v-else>
      <view class="section-title">待审核申请（{{ pending.length }}）</view><view v-if="!pending.length" class="surface-card empty-state">暂无待审核申请</view><view v-for="a in pending" :key="a.id" class="surface-card item" @click="openApplication(a.id)"><text>{{ a.displayName }} · {{ a.university }}</text><text class="muted-note">{{ reviewStatusLabels[a.status] }} →</text></view>
      <view class="section-title">已处理申请（{{ reviewed.length }}）</view><view v-for="a in reviewed" :key="a.id" class="surface-card item" @click="openApplication(a.id)"><text>{{ a.displayName }} · {{ a.university }}</text><text class="muted-note">{{ reviewStatusLabels[a.status] }} →</text></view>
      <view class="section-title">演示举报（{{ reports.length }}）</view><view v-if="!reports.length" class="surface-card empty-state">暂无举报记录</view><view v-for="r in reports" :key="r.id" class="surface-card report"><view class="item-line"><text>{{ r.reason }} · {{ r.tutorId }}</text><text>{{ r.status === 'open' ? '待处理' : '已处理' }}</text></view><view class="muted-note">{{ r.description || '无补充说明' }}</view><button v-if="r.status === 'open'" class="secondary-button action" :loading="busyId === r.id" @click="resolve(r.id)">标记已处理</button></view>
    </template>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.section-title{font-size:30rpx;font-weight:700;margin:35rpx 0 15rpx}.surface-card{margin-top:18rpx}.item{display:flex;justify-content:space-between;gap:18rpx}.item-line{display:flex;justify-content:space-between;margin-bottom:12rpx}.action{margin-top:18rpx}
</style>
