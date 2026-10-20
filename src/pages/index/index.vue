<script setup lang="ts">
import { apiMode } from '../../config/runtime'
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
import TutorCard from '../../components/TutorCard.vue'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import type { Tutor } from '../../types/tutor'

const query = ref('')
const subject = ref('全部')
const teachingMode = ref<'全部' | '线上' | '线下'>('全部')
const teachingModes = ['全部', '线上', '线下'] as const
const subjects = ['全部', '数学', '英语', '语文', '物理', '化学']
const tutors = ref<Tutor[]>([])
const loading = ref(false)
const error = ref('')
const pageSize = 20
const loadedPage = ref(0)
const hasMore = ref(false)
let requestId = 0

async function loadTutors(append = false) {
  if (append && (loading.value || !hasMore.value)) return
  const current = ++requestId
  const page = append ? loadedPage.value + 1 : 1
  if (!append) { tutors.value = []; loadedPage.value = 0; hasMore.value = false }
  loading.value = true
  error.value = ''
  try {
    const result = await businessService.listTutors({ keyword: query.value, subject: subject.value, teachingMode: teachingMode.value === '全部' ? undefined : teachingMode.value, page, pageSize })
    if (current === requestId) {
      tutors.value = append ? [...tutors.value, ...result] : result
      loadedPage.value = page
      hasMore.value = result.length === pageSize
    }
  } catch (cause) {
    if (current === requestId) error.value = errorMessage(cause)
  } finally {
    if (current === requestId) loading.value = false
  }
}
watch([query, subject, teachingMode], () => { void loadTutors() })
onShow(() => { void loadTutors() })
const openMatch = () => uni.navigateTo({ url: '/pages/match/index' })
const openTutor = (id: string) => uni.navigateTo({ url: '/pages/tutors/detail?id=' + id })
const openOrders = () => uni.switchTab({ url: '/pages/orders/index' })
const openProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>

<template>
  <view class="page">
    <view class="hero"><text class="eyebrow">校园家教 · 连接好老师</text><text class="headline">找到适合自己的学习伙伴</text><text class="intro">按科目筛选老师，查看教学信息，{{ apiMode ? '发起开发版预约。' : '发起本机演示预约。' }}</text><view class="links"><text @click="openOrders">我的预约 →</text><text @click="openProfile">个人中心 →</text></view></view>
    <button class="ai-entry" @click="openMatch">AI 家教匹配 · 查看推荐理由 →</button>
    <input v-model="query" class="search" placeholder="搜索科目、地区或老师姓名"/>
    <view class="heading">按科目查找</view>
    <scroll-view scroll-x><view class="filters"><text v-for="s in subjects" :key="s" class="chip" :class="{ active: subject === s }" @click="subject = s">{{ s }}</text></view></scroll-view>
    <view class="heading">授课方式</view>
    <view class="filters teaching-modes"><text v-for="mode in teachingModes" :key="mode" class="chip" :class="{ active: teachingMode === mode }" @click="teachingMode = mode">{{ mode }}</text></view>
    <view class="heading">推荐家教 <text class="count">已显示 {{ tutors.length }} 位{{ apiMode ? '开发版' : '演示' }}老师</text></view>
    <view v-if="loading && !tutors.length" class="empty">{{ apiMode ? '正在读取家教…' : '正在读取演示家教…' }}</view>
    <view v-else-if="error && !tutors.length" class="empty">{{ error }} <text class="retry" @click="loadTutors()">重试</text></view>
    <template v-else><TutorCard v-for="t in tutors" :key="t.id" :tutor="t" @open="openTutor"/><view v-if="!tutors.length" class="empty">没有匹配的老师，换个关键词试试。</view><view v-if="error" class="empty">{{ error }} <text class="retry" @click="loadTutors(true)">重试</text></view><view v-else-if="hasMore" class="load-more" @click="loadTutors(true)">{{ loading ? '正在加载…' : '加载更多老师' }}</view></template>
    <view class="notice">{{ apiMode ? '开发版资料仅供测试，审核状态不代表真实身份或资质核验。' : '所有老师、价格及教学信息均为虚构演示数据，未经过真实资质核验。' }}</view>
  </view>
</template>
<style scoped>
.ai-entry{margin-top:24rpx;text-align:left;background:#e8f0ff;color:#1b56b4;border-radius:18rpx;font-size:27rpx;padding:12rpx 24rpx}.page{padding:25rpx}.hero{background:linear-gradient(135deg,#1852c8,#3c8be9);border-radius:26rpx;padding:40rpx 30rpx;color:#fff;display:flex;flex-direction:column}.eyebrow{font-size:23rpx;opacity:.85}.headline{font-size:40rpx;font-weight:800;margin-top:20rpx}.intro{font-size:24rpx;line-height:1.6;opacity:.9;margin-top:15rpx}.links{display:flex;gap:22rpx;margin-top:26rpx;font-size:25rpx}.links text{background:#ffffff33;padding:13rpx 18rpx;border-radius:50rpx}.search{background:#fff;border-radius:16rpx;padding:20rpx 24rpx;height:90rpx;margin-top:25rpx;font-size:26rpx}.heading{font-size:31rpx;font-weight:700;margin:35rpx 0 20rpx}.count{font-size:22rpx;color:#8590a4;font-weight:400;float:right}.filters{display:flex;gap:12rpx;padding-bottom:8rpx}.chip{flex-shrink:0;background:#fff;color:#54637b;border-radius:60rpx;padding:16rpx 27rpx;font-size:24rpx}.active{background:#2868e4;color:#fff}.notice,.empty{text-align:center;color:#929aab;font-size:22rpx;line-height:1.7;margin:30rpx 0}.retry{color:#2868e4;margin-left:10rpx}
.load-more{background:#fff;border-radius:16rpx;color:#2868e4;text-align:center;padding:22rpx;margin:24rpx 0;font-size:25rpx}
</style>
