<script setup lang="ts">
import { apiMode } from '../config/runtime'
defineProps<{ title: string; active?: 'home' | 'orders' | 'profile' }>()
const home = () => uni.switchTab({url:'/pages/index/index'})
const orders = () => uni.switchTab({url:'/pages/orders/index'})
const profile = () => uni.switchTab({url:'/pages/profile/index'})
const match = () => uni.navigateTo({url:'/pages/match/index'})
</script>
<template>
  <view class="parent-shell">
    <view class="parent-header">
      <view class="brand" @click="home"><text class="brand-icon">学</text><view><text class="brand-name">校园家教</text><text class="brand-note">一起找到适合的学习节奏</text></view></view>
      <view class="parent-nav"><button :class="{current:active==='home'}" @click="home">找家教</button><button @click="match">智能匹配</button><button :class="{current:active==='orders'}" @click="orders">我的预约</button><button :class="{current:active==='profile'}" @click="profile">我的 / 身份</button></view>
    </view>
    <view class="parent-caption"><text>{{ title }}</text><text class="mode">{{ apiMode ? '开发 API · 虚构资料' : '本机 Mock · 演示数据' }}</text></view>
    <slot/>
    <view class="parent-footer">校园家教 · 创新创业演示项目。所有资料仅供测试，请勿填写真实个人信息。</view>
  </view>
</template>
<style scoped>

.parent-shell{--ink:#202c28;--green:#185448;--muted:#61716a;--line:#dfe5de;--paper:#f7f6f2;--tint:#edf3ed;position:relative;isolation:isolate;width:100%;max-width:1240px;margin:0 auto;padding:0 32px 40px;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.6;overflow-wrap:anywhere}.parent-shell::before{content:'';position:fixed;inset:0;background:var(--paper);z-index:-1;pointer-events:none}.parent-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 0;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;cursor:pointer}.brand-icon{display:flex;align-items:center;justify-content:center;width:44px;height:48px;border-radius:4px 14px 4px 14px;background:var(--green);color:#fff;font-size:24px;font-weight:600}.brand-name{display:block;font-size:22px;font-weight:600;letter-spacing:1px}.brand-note{display:block;font-size:12px;color:var(--muted);margin-top:2px}.parent-nav{display:flex;flex-wrap:wrap;gap:6px}.parent-nav button{margin:0;background:transparent;color:var(--muted);font-size:14px;line-height:44px;padding:0 16px;border-radius:10px}.parent-nav button::after{border:0}.parent-nav .current{background:var(--green);color:#fff;font-weight:600}.parent-caption{display:flex;justify-content:space-between;gap:16px;font-size:13px;color:var(--muted);margin:24px 0}.mode{border:1px solid var(--line);background:#fff;padding:2px 10px;border-radius:20px;text-align:right;font-size:12px}.parent-footer{font-size:12px;color:var(--muted);text-align:center;line-height:1.8;margin-top:40px;padding-top:24px;border-top:1px solid var(--line)}
.parent-shell :deep(.primary-button){background:var(--green);color:#fff;border-radius:10px;font-size:16px;font-weight:600;line-height:48px;padding:0 20px}.parent-shell :deep(.secondary-button){background:var(--tint);color:var(--green);border:1px solid var(--line);border-radius:10px;font-size:16px;line-height:46px;padding:0 20px}.parent-shell :deep(.surface-card){border:1px solid var(--line);border-radius:16px;background:#fff;padding:24px}.parent-shell :deep(.muted-note){color:var(--muted);font-size:14px;line-height:1.7}.parent-shell :deep(.empty-state){padding:40px 24px;color:var(--muted);font-size:16px}.parent-shell :deep(button:focus-visible),.parent-shell :deep([tabindex]:focus-visible){outline:3px solid #b98124;outline-offset:3px}.parent-shell :deep(input:focus-within),.parent-shell :deep(textarea:focus-within){outline:2px solid #185448;outline-offset:2px}
@media(max-width:700px){.parent-nav{display:none!important}.parent-shell{padding:0 16px 32px}.parent-header{align-items:flex-start;flex-direction:column;gap:16px;padding:18px 0}.brand-name{font-size:20px}.brand-note{font-size:12px}.parent-nav{width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.parent-nav button{padding:0 3px;font-size:12px;line-height:42px;white-space:nowrap}.parent-caption{font-size:12px;margin:18px 0;align-items:center}.parent-footer{text-align:left;margin-top:28px}.parent-shell :deep(.surface-card){padding:20px}}

</style>
