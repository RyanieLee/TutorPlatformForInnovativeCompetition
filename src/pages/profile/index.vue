<script setup lang="ts">
import ParentLayout from '../../components/ParentLayout.vue'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { currentSession, logout, restoreSession } from '../../utils/session'
import { apiMode } from '../../config/runtime'
import { roleLabels } from '../../types/auth'

const ready = ref(false)
onShow(async () => { await restoreSession(); ready.value = true })

const goLogin = () => uni.navigateTo({ url: '/pages/auth/login' })
const goRegister = () => uni.navigateTo({ url: '/pages/auth/register' })
const goOrders = () => uni.switchTab({ url: '/pages/orders/index' })
const goHome = () => uni.navigateTo({ url: '/pages/tutors/index' })
const goWorkbench = () => uni.navigateTo({ url: '/pages/tutor/workbench' })
const goAdmin = () => uni.navigateTo({ url: '/pages/admin/index' })

async function signOut() {
  try {
    await logout()
    uni.showToast({ title: '已退出登录', icon: 'none' })
  } catch {
    uni.showToast({ title: apiMode ? '本机已退出，服务端撤销未确认' : '退出失败，请重试', icon: 'none' })
  }
}
</script>

<template>
  <ParentLayout title="个人中心" active="profile">
  <view class="page linghang-profile">
    <view class="hero"><view class="avatar">{{ currentSession?.user.displayName.slice(0, 1) ?? '访' }}</view><view><text class="name">{{ currentSession?.user.displayName ?? '体验访客' }}</text><text class="sub">{{ currentSession ? roleLabels[currentSession.user.role] + (apiMode ? ' · 开发账户' : ' · 本机模拟登录') : '尚未登录 · 可浏览演示家教' }}</text></view></view>
    <view v-if="!ready" class="surface-card muted-note panel">正在读取演示身份…</view>
    <view v-else-if="!currentSession" class="surface-card panel"><view class="section-title">开始体验</view><button class="primary-button" @click="goLogin">演示登录</button><button v-if="!apiMode" class="secondary-button second" @click="goRegister">选择身份 / 模拟注册</button></view>
    <view v-else class="surface-card panel"><view class="section-title">当前身份</view><view class="row"><text>角色</text><text>{{ roleLabels[currentSession.user.role] }}</text></view><view class="row"><text>状态</text><text>{{ apiMode ? '开发 API 会话' : '本机演示会话' }}</text></view><button class="secondary-button second" @click="signOut">{{ apiMode ? '退出登录' : '退出演示身份' }}</button></view>
    <view class="surface-card panel"><view v-if="currentSession?.user.role === 'tutor'" class="item" @click="goWorkbench">家教工作台 <text>→</text></view><view v-if="currentSession?.user.role === 'admin'" class="item" @click="goAdmin">{{ apiMode ? '开发审核台' : '模拟审核台' }} <text>→</text></view><view v-if="currentSession?.user.role === 'parent'" class="item" @click="goOrders">我的预约 <text>→</text></view><view class="item" @click="goHome">浏览家教 <text>→</text></view></view>
    <view class="muted-note tip">{{ apiMode ? '开发账户仅供本地联调；没有微信正式认证、支付或老师通知。' : '本版本没有真实身份认证、支付或老师通知。请勿填写真实私人信息。' }}</view>
  </view>
</ParentLayout>
</template>

<style scoped>
.page{padding:0;max-width:820px;margin:0 auto}.hero{background:linear-gradient(130deg,#2864d1,#5499ef);color:#fff;padding:35rpx;border-radius:23rpx;display:flex;align-items:center;gap:20rpx}.avatar{background:#ffffff33;border-radius:22rpx;width:100rpx;height:100rpx;display:flex;align-items:center;justify-content:center;font-size:42rpx}.name{display:block;font-size:33rpx;font-weight:700}.sub{display:block;font-size:22rpx;margin-top:10rpx}.panel{margin-top:24rpx}.section-title{font-weight:700;font-size:29rpx;margin-bottom:18rpx}.second{margin-top:18rpx}.row,.item{display:flex;justify-content:space-between;padding:18rpx 0;border-bottom:1rpx solid #eef2f7}.row{color:#53627b}.item:last-child{border-bottom:0}.item text{color:#2868e4}.tip{margin-top:25rpx;text-align:center}
</style>

