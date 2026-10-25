<script setup lang="ts">
import AiCompanion from './AiCompanion.vue'
import { apiMode } from '../config/runtime'
import { currentSession } from '../utils/session'
defineProps<{ title: string; active?: 'home' | 'find' | 'orders' | 'profile' | 'learning' | 'order-map' | 'demo' }>()
const find=()=>uni.navigateTo({url:'/pages/tutors/index'})
const assistant=()=>uni.navigateTo({url:'/pages/assistant/index'})
const demo=()=>uni.navigateTo({url:'/pages/demo/index'})
const home = () => uni.switchTab({url:'/pages/index/index'})
const orders = () => {
  if(currentSession.value?.user.role==='tutor') return uni.navigateTo({url:'/pages/tutor/workbench'})
  if(currentSession.value?.user.role==='admin') return uni.navigateTo({url:'/pages/admin/index'})
  return uni.switchTab({url:'/pages/orders/index'})
}
const profile = () => uni.switchTab({url:'/pages/profile/index'})
const orderMap=()=>uni.navigateTo({url:'/pages/order-map/index'})
const learning = () => uni.navigateTo({url:'/pages/learning/index'})
const match = () => uni.navigateTo({url:'/pages/match/index'})
</script>
<template>
  <view class="parent-shell">
    <view class="parent-header">
      <view class="brand" @click="home"><text class="brand-icon" aria-hidden="true"></text><view><text class="brand-name">领航云学堂</text><text class="brand-note">让优质教育更容易遇见</text></view></view>
      <view class="parent-nav"><button :class="{current:active==='home'}" @click="home">首页</button><button :class="{current:active==='find'}" @click="find">找家教</button><button :class="{current:active==='learning'}" @click="learning">AI学习中心</button><button :class="{current:active==='orders'||active==='order-map'}" @click="orders">{{currentSession?.user.role === 'tutor' ? '教学工作台' : currentSession?.user.role === 'admin' ? '审核工作台' : '我的学习'}}</button><button :class="{current:active==='profile'}" @click="profile">我的</button><button class="demo-nav" :class="{current:active==='demo'}" @click="demo"><text class="demo-label-full">5分钟评委演示 →</text><text class="demo-label-short">评委演示 →</text></button></view>
    </view>
    <view class="parent-caption"><text>{{ title }}</text><text class="mode">{{ apiMode ? '开发 API · 虚构资料' : '本机 Mock · 演示数据' }}</text></view>
    <slot/>
    <AiCompanion/>
    <view class="parent-footer">领航云学堂 · 创新创业演示项目。所有资料仅供测试，请勿填写真实个人信息。</view>
  </view>
</template>
<style scoped>
.parent-shell{width:100%;max-width:1240px;margin:0 auto;padding:0 28px 32px;box-sizing:border-box;color:#20314b;overflow-wrap:anywhere}.parent-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 0 24px;border-bottom:1px solid #dfe6f0}.brand{display:flex;align-items:center;gap:12px;cursor:pointer}.brand-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:13px;background:#245fc7;color:#fff;font-size:24px;font-weight:700}.brand-name{display:block;font-size:22px;font-weight:800}.brand-note{display:block;font-size:12px;color:#7b889c;margin-top:4px}.parent-nav{display:flex;flex-wrap:wrap;gap:8px}.parent-nav button{margin:0;background:transparent;color:#586a84;font-size:14px;line-height:2.8;padding:0 15px;border-radius:10px}.parent-nav .current{background:#e5eeff;color:#2057b7;font-weight:600}.parent-caption{display:flex;justify-content:space-between;gap:18px;font-size:13px;color:#667b96;margin:22px 0}.mode{color:#315c9d;text-align:right}.parent-footer{font-size:12px;color:#8491a5;text-align:center;line-height:1.8;margin-top:38px;padding-top:24px;border-top:1px solid #e0e7f0}@media print{.parent-header,.parent-caption,.parent-footer{display:none!important}.parent-shell{max-width:none;padding:0}}@media(max-width:700px){.parent-shell{padding:0 14px 24px}.parent-header{align-items:flex-start;flex-direction:column;gap:18px;padding:18px 0}.brand-name{font-size:20px}.parent-nav{width:100%;gap:4px}.parent-nav button{padding:0 10px;font-size:12px}.parent-caption{font-size:12px;margin:18px 0}}
</style>


