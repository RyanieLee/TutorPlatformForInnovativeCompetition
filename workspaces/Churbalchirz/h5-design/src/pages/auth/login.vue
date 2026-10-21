<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginDemo, loginPassword } from '../../utils/session'
import { apiMode } from '../../config/runtime'
import { errorMessage } from '../../services/errors'
import type { UserRole } from '../../types/auth'

const role = ref<UserRole>('parent')
const loginId = ref('')
const password = ref('')
const busy = ref(false)
onLoad(options => { if (options?.role === 'tutor' || options?.role === 'admin') role.value = options.role })

async function login() {
  if (busy.value) return
  busy.value = true
  try {
    if (apiMode) await loginPassword(loginId.value.trim(), password.value)
    else await loginDemo(role.value)
    uni.showToast({ title: apiMode ? '登录成功' : '已进入演示模式', icon: 'none' })
    if (getCurrentPages().length > 1) uni.navigateBack()
    else uni.switchTab({ url: '/pages/profile/index' })
  } catch (cause) {
    uni.showToast({ title: errorMessage(cause), icon: 'none' })
  } finally {
    busy.value = false
  }
}

function choose(value: UserRole) {
  role.value = value
}
function goRegister() { uni.navigateTo({ url: '/pages/auth/register' }) }
</script>

<template>
  <view class="page">
    <view class="banner"><text class="mark">校园家教</text><text class="title">{{ apiMode ? '开发账户登录' : '选择演示身份登录' }}</text><text class="intro">{{ apiMode ? '使用本地初始化的开发账户；不提供微信正式认证。' : '当前仅模拟本机身份，无微信授权或手机号验证。' }}</text></view>
    <view class="surface-card">
      <view v-if="apiMode" class="section-title">本地开发账户</view><view v-if="apiMode" class="credentials"><input v-model="loginId" placeholder="账户 ID" /><input v-model="password" password placeholder="密码" /></view><view v-else class="section-title">体验角色</view>
      <view v-if="!apiMode" class="role" :class="{ selected: role === 'parent' }" @click="choose('parent')"><text>学生 / 家长</text><text class="hint">浏览家教、提交和管理本机演示预约</text></view>
      <view v-if="!apiMode" class="role" :class="{ selected: role === 'tutor' }" @click="choose('tutor')"><text>大学生家教</text><text class="hint">填写入驻申请、管理收到的演示预约</text></view>
      <view v-if="!apiMode" class="role" :class="{ selected: role === 'admin' }" @click="choose('admin')"><text>管理员演示</text><text class="hint">查看模拟申请与举报；不代表真实审核权限</text></view>
      <button class="primary-button action" :loading="busy" @click="login">{{ apiMode ? '登录开发账户' : '进入演示模式' }}</button>
      <view v-if="!apiMode" class="register" @click="goRegister">了解身份选择 / 模拟注册 →</view>
    </view>
    <view class="muted-note foot">{{ apiMode ? '开发账户由本地初始化命令创建；请勿填写真实私人信息。' : '演示登录只保存在当前设备，不能证明真实身份；请勿填写真实个人信息。' }}</view>
  </view>
</template>

<style scoped>
.page{padding:28rpx}.banner{background:linear-gradient(135deg,#185448,#326b54);border-radius:25rpx;color:#fff;padding:44rpx 32rpx;display:flex;flex-direction:column}.mark{font-size:14px;opacity:.85}.title{font-size:20px;font-weight:700;margin-top:20rpx}.intro{font-size:14px;margin-top:16rpx;line-height:1.6}.surface-card{margin-top:24rpx}.section-title{font-weight:700;font-size:15px;margin-bottom:20rpx}.role{border:2rpx solid #dfe5de;border-radius:17rpx;padding:24rpx;margin-bottom:18rpx;display:flex;flex-direction:column;gap:8rpx;font-weight:600}.selected{border-color:#185448;background:#edf3ed;color:#185448}.hint{font-size:14px;color:#61716a;font-weight:400}.credentials{display:flex;flex-direction:column;gap:18rpx}.credentials input{background:#f8f9f5;border-radius:12rpx;padding:20rpx}.action{margin-top:32rpx}.register{text-align:center;color:#185448;padding:28rpx 0 4rpx;font-size:14px}.foot{margin-top:25rpx;text-align:center}

.page{max-width:760px;margin:0 auto;padding:32px 24px}.title,.heading{font-size:30px;font-weight:600}.section-title,.choice-title{font-size:20px}.role{padding:20px;border-radius:12px}.hint,.intro{font-size:14px;line-height:1.8}.credentials input{height:48px;font-size:16px}.field textarea,.input{font-size:16px}@media(max-width:700px){.page{padding:20px 16px}.title,.heading{font-size:24px}}
</style>
