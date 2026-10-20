<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginDemo } from '../../utils/session'
import type { UserRole } from '../../types/auth'

const role = ref<'parent' | 'tutor'>('parent')
const busy = ref(false)
onLoad(options => { if (options?.role === 'tutor') role.value = 'tutor' })

async function login() {
  if (busy.value) return
  busy.value = true
  try {
    await loginDemo(role.value)
    uni.showToast({ title: '已进入演示模式', icon: 'none' })
    if (getCurrentPages().length > 1) uni.navigateBack()
    else uni.switchTab({ url: '/pages/profile/index' })
  } catch {
    uni.showToast({ title: '演示登录失败，请重试', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function choose(value: UserRole) {
  if (value !== 'admin') role.value = value
}
function goRegister() { uni.navigateTo({ url: '/pages/auth/register' }) }
</script>

<template>
  <view class="page">
    <view class="banner"><text class="mark">校园家教</text><text class="title">选择演示身份登录</text><text class="intro">当前仅模拟本机身份，无微信授权或手机号验证。</text></view>
    <view class="surface-card">
      <view class="section-title">体验角色</view>
      <view class="role" :class="{ selected: role === 'parent' }" @click="choose('parent')"><text>学生 / 家长</text><text class="hint">浏览家教、提交和管理本机演示预约</text></view>
      <view class="role" :class="{ selected: role === 'tutor' }" @click="choose('tutor')"><text>大学生家教</text><text class="hint">预留家教端入口，暂不能使用家长预约功能</text></view>
      <button class="primary-button action" :loading="busy" @click="login">进入演示模式</button>
      <view class="register" @click="goRegister">了解身份选择 / 模拟注册 →</view>
    </view>
    <view class="muted-note foot">演示登录只保存在当前设备，不能证明真实身份；请勿填写真实个人信息。</view>
  </view>
</template>

<style scoped>
.page{padding:28rpx}.banner{background:linear-gradient(135deg,#1852c8,#3c8be9);border-radius:25rpx;color:#fff;padding:44rpx 32rpx;display:flex;flex-direction:column}.mark{font-size:23rpx;opacity:.85}.title{font-size:39rpx;font-weight:700;margin-top:20rpx}.intro{font-size:24rpx;margin-top:16rpx;line-height:1.6}.surface-card{margin-top:24rpx}.section-title{font-weight:700;font-size:30rpx;margin-bottom:20rpx}.role{border:2rpx solid #e3eaf5;border-radius:17rpx;padding:24rpx;margin-bottom:18rpx;display:flex;flex-direction:column;gap:8rpx;font-weight:600}.selected{border-color:#2868e4;background:#f0f5ff;color:#225fcf}.hint{font-size:23rpx;color:#78879b;font-weight:400}.action{margin-top:32rpx}.register{text-align:center;color:#2868e4;padding:28rpx 0 4rpx;font-size:25rpx}.foot{margin-top:25rpx;text-align:center}
</style>
