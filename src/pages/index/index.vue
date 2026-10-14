<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
import TutorCard from '../../components/TutorCard.vue'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import type { Tutor } from '../../types/tutor'

const query = ref('')
const subject = ref('全部')
const subjects = ['全部', '数学', '英语', '语文', '物理', '化学']
const tutors = ref<Tutor[]>([])
const loading = ref(false)
const error = ref('')
let requestId = 0

async function loadTutors() {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await businessService.listTutors({ keyword: query.value, subject: subject.value })
    if (current === requestId) tutors.value = result
  } catch (cause) {
    if (current === requestId) error.value = errorMessage(cause)
  } finally {
    if (current === requestId) loading.value = false
  }
}
watch([query, subject], () => { void loadTutors() })
onShow(() => { void loadTutors() })
const openTutor = (id: string) => uni.navigateTo({ url: '/pages/tutors/detail?id=' + id })
const openOrders = () => uni.switchTab({ url: '/pages/orders/index' })
const openProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>

<template>
  <view class="page">
    <view class="hero"><text class="eyebrow">校园家教 · 连接好老师</text><text class="headline">找到适合自己的学习伙伴</text><text class="intro">按科目筛选老师，查看教学信息，发起本机演示预约。</text><view class="links"><text @click="openOrders">我的预约 →</text><text @click="openProfile">个人中心 →</text></view></view>
    <input v-model="query" class="search" placeholder="搜索科目、地区或老师姓名"/>
    <view class="heading">按科目查找</view>
    <scroll-view scroll-x><view class="filters"><text v-for="s in subjects" :key="s" class="chip" :class="{ active: subject === s }" @click="subject = s">{{ s }}</text></view></scroll-view>
    <view class="heading">推荐家教 <text class="count">{{ tutors.length }} 位演示老师</text></view>
    <view v-if="loading" class="empty">正在读取演示家教…</view>
    <view v-else-if="error" class="empty">{{ error }} <text class="retry" @click="loadTutors">重试</text></view>
    <template v-else><TutorCard v-for="t in tutors" :key="t.id" :tutor="t" @open="openTutor"/><view v-if="!tutors.length" class="empty">没有匹配的老师，换个关键词试试。</view></template>
    <view class="notice">所有老师、价格及教学信息均为虚构演示数据，未经过真实资质核验。</view>
  </view>
</template>
<style scoped>
.page{padding:25rpx}.hero{background:linear-gradient(135deg,#1852c8,#3c8be9);border-radius:26rpx;padding:40rpx 30rpx;color:#fff;display:flex;flex-direction:column}.eyebrow{font-size:23rpx;opacity:.85}.headline{font-size:40rpx;font-weight:800;margin-top:20rpx}.intro{font-size:24rpx;line-height:1.6;opacity:.9;margin-top:15rpx}.links{display:flex;gap:22rpx;margin-top:26rpx;font-size:25rpx}.links text{background:#ffffff33;padding:13rpx 18rpx;border-radius:50rpx}.search{background:#fff;border-radius:16rpx;padding:20rpx 24rpx;height:90rpx;margin-top:25rpx;font-size:26rpx}.heading{font-size:31rpx;font-weight:700;margin:35rpx 0 20rpx}.count{font-size:22rpx;color:#8590a4;font-weight:400;float:right}.filters{display:flex;gap:12rpx;padding-bottom:8rpx}.chip{flex-shrink:0;background:#fff;color:#54637b;border-radius:60rpx;padding:16rpx 27rpx;font-size:24rpx}.active{background:#2868e4;color:#fff}.notice,.empty{text-align:center;color:#929aab;font-size:22rpx;line-height:1.7;margin:30rpx 0}.retry{color:#2868e4;margin-left:10rpx}
</style>
