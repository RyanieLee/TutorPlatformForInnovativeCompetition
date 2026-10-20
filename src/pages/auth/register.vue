<script setup lang="ts">
import { ref } from 'vue'
import { loginDemo } from '../../utils/session'

const busy = ref(false)
async function enter(role: 'parent' | 'tutor') {
  if (busy.value) return
  busy.value = true
  try {
    await loginDemo(role)
    uni.switchTab({ url: '/pages/profile/index' })
  } catch {
    uni.showToast({ title: '保存演示身份失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="surface-card"><text class="title">选择你的演示身份</text><text class="muted-note intro">这是模拟注册入口，不会创建真实账号。选定身份后可在“我的”退出并切换。</text></view>
    <view class="surface-card choice"><text class="choice-title">学生 / 家长</text><text class="muted-note">找老师，填写和查看本机演示预约。</text><button class="primary-button" :loading="busy" @click="enter('parent')">以此身份体验</button></view>
    <view class="surface-card choice"><text class="choice-title">大学生家教</text><text class="muted-note">家教工作台由团队后续接入；目前可预览身份状态。</text><button class="secondary-button" :loading="busy" @click="enter('tutor')">以此身份体验</button></view>
    <view class="muted-note note">管理员身份仅保留在类型和接口中，当前不提供演示入口。</view>
  </view>
</template>

<style scoped>
.page{padding:28rpx}.surface-card{margin-bottom:20rpx}.title{display:block;font-size:35rpx;font-weight:700;margin-bottom:13rpx}.intro{display:block}.choice{display:flex;flex-direction:column;gap:18rpx}.choice-title{font-size:30rpx;font-weight:700}.choice button{width:100%;margin-top:12rpx}.note{text-align:center;padding:20rpx}
</style>
