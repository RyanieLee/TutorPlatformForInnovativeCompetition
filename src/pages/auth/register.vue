<script setup lang="ts">
import { ref } from 'vue'
import { apiMode } from '../../config/runtime'
import { loginDemo } from '../../utils/session'

const busy = ref(false)
const goLogin = () => uni.redirectTo({ url: '/pages/auth/login' })
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
  <view class="page linghang-register">
    <view v-if="apiMode" class="surface-card"><text class="title">开发账户由本地初始化</text><text class="muted-note intro">API 模式暂不开放自助注册；请使用开发账户登录。</text><button class="primary-button" @click="goLogin">返回登录</button></view>
    <template v-else>
    <view class="surface-card"><text class="title">选择你的演示身份</text><text class="muted-note intro">这是模拟注册入口，不会创建真实账号。选定身份后可在“我的”退出并切换。</text></view>
    <view class="surface-card choice"><text class="choice-title">学生 / 家长</text><text class="muted-note">找老师，填写和查看本机演示预约。</text><button class="primary-button" :loading="busy" @click="enter('parent')">以此身份体验</button></view>
    <view class="surface-card choice"><text class="choice-title">大学生家教</text><text class="muted-note">填写演示入驻资料、查看审核状态和收到的预约。</text><button class="secondary-button" :loading="busy" @click="enter('tutor')">以此身份体验</button></view>
    <view class="muted-note note">管理员演示入口位于登录页，不会创建真实管理员账号。</view>
    </template>
  </view>
</template>

<style scoped>
.page{padding:28rpx}.surface-card{margin-bottom:20rpx}.title{display:block;font-size:35rpx;font-weight:700;margin-bottom:13rpx}.intro{display:block}.choice{display:flex;flex-direction:column;gap:18rpx}.choice-title{font-size:30rpx;font-weight:700}.choice button{width:100%;margin-top:12rpx}.note{text-align:center;padding:20rpx}
</style>
