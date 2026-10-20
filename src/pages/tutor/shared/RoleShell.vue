<script setup lang="ts">
import { ref, computed } from 'vue'
import { currentSession, canAccess, logout } from '../../../utils/session'
import { apiMode } from '../../../config/runtime'
import { confirmAction } from './page'
defineProps<{ title: string; role: 'tutor' | 'admin' }>()
const busy = ref(false)
const roleName = computed(() => currentSession.value?.user.role === 'admin' ? '管理员' : currentSession.value?.user.role === 'tutor' ? '大学生家教' : '学生/家长')
const home = () => uni.switchTab({ url: '/pages/index/index' })
const workbench = (role: string) => uni.redirectTo({ url: role === 'admin' ? '/pages/admin/index' : '/pages/tutor/workbench' })
const login = (role: string) => uni.navigateTo({ url: '/pages/auth/login?role=' + role })
async function switchAccount(role: string) {
  if (busy.value) return
  busy.value = true
  try {
    if (!await confirmAction('切换演示账户', '将退出当前账户，再进入登录页。是否继续？')) return
    try { await logout() } catch { if (currentSession.value) throw new Error(); uni.showToast({ title: '本机已退出，服务端退出未确认', icon: 'none' }) }
    uni.reLaunch({ url: '/pages/auth/login?role=' + role })
  } catch { uni.showToast({ title: '退出失败，请重试', icon: 'none' }) }
  finally { busy.value = false }
}
</script>
<template>
  <view class="shell">
    <view class="brand"><text class="brand-name">校园家教</text><text class="mode">{{ apiMode ? '开发联调 · 演示资料' : '本机模拟 · 演示资料' }}</text></view>
    <view class="header"><view><text class="eyebrow">{{ role === 'admin' ? '审核与管理' : '家教服务中心' }}</text><view class="title">{{ title }}</view><view class="identity">{{ currentSession ? currentSession.user.displayName + ' · ' + roleName : '访客 · 尚未登录' }}</view></view><view class="nav"><button @click="home">返回首页</button><button v-if="canAccess([role])" @click="workbench(role)">我的工作台</button><button v-if="currentSession" :disabled="busy" @click="switchAccount(role)">{{ busy ? '正在退出…' : '退出 / 切换账户' }}</button></view></view>
    <view class="notice">{{ apiMode ? '仅使用虚构演示资料。审核和预约由开发服务记录，不代表真实资质认证，也不会发送真实通知。' : '仅当前设备模拟，不跨设备同步。所有老师和价格均为虚构演示数据，不代表真实认证或交易。' }}</view>
    <view v-if="!currentSession" class="access"><text>请先登录{{ role === 'admin' ? '管理员' : '家教' }}演示账户</text><button @click="login(role)">前往登录</button></view>
    <view v-else-if="!canAccess([role])" class="access"><text>当前身份不能访问此工作台</text><button :disabled="busy" @click="switchAccount(role)">切换演示账户</button></view>
    <slot/>
  </view>
</template>
<style scoped>
.shell{max-width:1160px;margin:0 auto;padding:24px 28px 50px;box-sizing:border-box;color:#20314b;font-size:15px}.brand,.header,.nav{display:flex;align-items:center;justify-content:space-between;gap:14px}.brand{padding-bottom:20px;border-bottom:1px solid #dce5f2}.brand-name{font-weight:800;font-size:20px;color:#235bc7}.mode{color:#697c95;font-size:12px}.header{padding:28px 0 22px;align-items:flex-start}.eyebrow{color:#5e79a3;font-size:13px}.title{font-size:30px;font-weight:800;line-height:1.4;margin:6px 0}.identity{color:#687b95;font-size:14px}.nav{flex-wrap:wrap;justify-content:flex-end}.nav button{font-size:13px;line-height:2.8;padding:0 14px;background:#fff;color:#315886;border:1px solid #dae3f0;border-radius:9px;margin:0}.nav button[disabled]{opacity:.5}.notice{border:1px solid #d6e4fa;background:#ecf4ff;color:#4e6c96;line-height:1.7;padding:14px 18px;border-radius:12px;font-size:13px;margin-bottom:22px}.access{padding:30px 20px;background:white;border-radius:16px;display:flex;align-items:center;flex-direction:column;gap:18px}.access button{font-size:14px;color:#fff;background:#2868e4;padding:0 24px;border-radius:10px}.shell{overflow-wrap:anywhere}@media(max-width:640px){.shell{padding:16px 14px 34px}.header{flex-direction:column;gap:16px;padding-top:20px}.title{font-size:25px}.nav{justify-content:flex-start;gap:8px}.nav button{font-size:12px;padding:0 10px}.brand{gap:8px}.mode{font-size:11px}.notice{padding:12px 14px}}
</style>
