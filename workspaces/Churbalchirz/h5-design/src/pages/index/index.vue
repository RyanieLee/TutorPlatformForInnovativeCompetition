<script setup lang="ts">
import learningDesk from './learning-desk.svg'
import { apiMode } from '../../config/runtime'
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
import ParentLayout from '../../components/ParentLayout.vue'
import { parsePriceRange } from '../../services/tutor-query'
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
const minPriceText=ref(''),maxPriceText=ref(''),priceError=ref('')
const priceRange=ref<{minPrice?:number;maxPrice?:number}>({})
function applyPrices() {
  try { priceRange.value=parsePriceRange(minPriceText.value,maxPriceText.value);priceError.value='';void loadTutors() }
  catch(cause) { priceError.value=(cause as Error).message }
}
function resetFilters() { query.value='';subject.value='全部';teachingMode.value='全部';minPriceText.value='';maxPriceText.value='';priceRange.value={};priceError.value='';void loadTutors() }
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
    const result = await businessService.listTutors({ ...priceRange.value, keyword: query.value, subject: subject.value, teachingMode: teachingMode.value === '全部' ? undefined : teachingMode.value, page, pageSize })
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
  <ParentLayout title="找到适合你的学习伙伴" active="home"><view class="page">
    <view class="hero"><view class="hero-copy"><text class="eyebrow">陪伴每一段学习旅程 / CAMPUS TUTOR</text><text class="headline">找到适合的老师，<br/>让学习更有方向。</text><text class="intro">从科目、预算和授课方式开始，<br/>找到与你的学习节奏合拍的大学生家教。</text><view class="links"><text @click="openOrders">查看我的预约 ↗</text><text @click="openProfile">切换演示身份 ↗</text></view></view><image class="hero-art" :src="learningDesk" mode="aspectFit" aria-label="校园学习桌插画"/></view>
    <button class="ai-entry" @click="openMatch"><text class="match-icon">✦</text><view><text class="match-title">还没想好找哪位老师？</text><text class="match-note">试试智能匹配，看看推荐理由</text></view><text class="match-arrow">→</text></button>
    <input v-model="query" class="search" placeholder="搜索科目、地区或老师姓名"/>
    <view class="filter-panel"><view class="heading">按科目查找</view>
    <scroll-view scroll-x><view class="filters"><text v-for="s in subjects" :key="s" class="chip" :class="{ active: subject === s }" @click="subject = s">{{ s }}</text></view></scroll-view>
    <view class="heading">授课方式</view>
    <view class="filters teaching-modes"><text v-for="mode in teachingModes" :key="mode" class="chip" :class="{ active: teachingMode === mode }" @click="teachingMode = mode">{{ mode }}</text></view>
    <view class="price-filter"><view><text class="filter-label">课时价格区间（元 / 小时）</text><view class="price-inputs"><input v-model="minPriceText" type="digit" maxlength="12" placeholder="最低价格（可空）"/><text>—</text><input v-model="maxPriceText" type="digit" maxlength="12" placeholder="最高价格（可空）"/></view></view><view class="filter-actions"><button class="apply-price" @click="applyPrices">应用价格</button><button @click="resetFilters">重置筛选</button></view></view>
    <view v-if="priceError" class="price-error" role="alert">{{ priceError }}；仍展示上次已应用的价格条件。</view></view>
    <view class="heading result-heading">找到你的学习伙伴 <text class="count">已显示 {{ tutors.length }} 位{{ apiMode ? '开发版' : '演示' }}老师</text></view>
    <view v-if="loading && !tutors.length" class="empty">{{ apiMode ? '正在读取家教…' : '正在读取演示家教…' }}</view>
    <view v-else-if="error && !tutors.length" class="empty">{{ error }} <text class="retry" @click="loadTutors()">重试</text></view>
    <template v-else><view class="tutor-grid"><TutorCard v-for="t in tutors" :key="t.id" :tutor="t" @open="openTutor"/></view><view v-if="!tutors.length" class="empty">暂时没有找到合适的老师，试试放宽预算或更换科目。</view><view v-if="error" class="empty">{{ error }} <text class="retry" @click="loadTutors(true)">重试</text></view><view v-else-if="hasMore" class="load-more" @click="loadTutors(true)">{{ loading ? '正在加载…' : '加载更多老师' }}</view></template>
    <view class="notice">{{ apiMode ? '开发版资料仅供测试，审核状态不代表真实身份或资质核验。' : '所有老师、价格及教学信息均为虚构演示数据，未经过真实资质核验。' }}</view>
  </view></ParentLayout>
</template>
<style scoped>

.page{padding:0}.hero{display:flex;align-items:center;justify-content:space-between;gap:36px;padding:32px 40px;background:#eaf0e7;border:1px solid #dfe5d7;border-radius:20px;overflow:hidden}.hero-copy{position:relative;z-index:1}.eyebrow{display:block;font-size:12px;color:#526b55;letter-spacing:1px;font-weight:600}.headline{display:block;color:#173c32;font-size:44px;line-height:1.28;letter-spacing:-1px;font-weight:600;margin-top:18px}.intro{display:block;font-size:16px;line-height:1.8;color:#52665b;margin-top:18px}.links{display:flex;flex-wrap:wrap;gap:24px;margin-top:24px;font-size:14px;color:#185448}.links text{cursor:pointer;border-bottom:1px solid #a1b7a2;padding-bottom:4px}.hero-art{width:340px;height:240px;flex-shrink:0}.ai-entry{display:flex;align-items:center;text-align:left;gap:16px;margin:20px 0 0;background:#fffdf7;color:#273f32;border:1px solid #e8dfc7;border-radius:12px;padding:16px 20px;line-height:1.5}.ai-entry::after{border:0}.match-icon{font-size:28px;color:#977025}.match-title{display:block;font-size:16px;font-weight:600}.match-note{display:block;font-size:14px;color:#746b55;margin-top:2px}.match-arrow{margin-left:auto;font-size:24px}.search{background:#fff;border:1px solid #cad5c8;border-radius:12px;padding:0 20px;height:56px;margin-top:24px;font-size:16px;color:#202c28}.heading{font-size:18px;font-weight:600;margin:24px 0 14px;color:#202c28}.result-heading{font-size:22px;margin:32px 0 20px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}.count{font-size:14px;color:#61716a;font-weight:400}.filters{display:flex;gap:8px;padding-bottom:4px}.chip{cursor:pointer;flex-shrink:0;background:#f7f6f2;color:#52665b;border-radius:8px;padding:8px 18px;font-size:14px;line-height:24px}.active{background:#185448;color:#fff}.notice,.empty{text-align:center;color:#61716a;font-size:14px;line-height:1.8;margin:24px 0}.empty{padding:32px;background:#fff;border:1px dashed #ccd8ca;border-radius:12px}.retry{cursor:pointer;color:#185448;margin-left:10px;text-decoration:underline}.load-more{cursor:pointer;background:#edf3ed;border:1px solid #cddacd;border-radius:10px;color:#185448;text-align:center;padding:14px;margin:24px 0;font-size:16px}.tutor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.filter-panel{background:#fff;border:1px solid #dfe5de;border-radius:16px;padding:0 24px 24px;margin-top:16px}.price-filter{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-top:20px;padding-top:20px;border-top:1px solid #edf0e9}.filter-label{font-size:14px;color:#61716a}.price-inputs{display:flex;align-items:center;gap:12px;margin-top:10px}.price-inputs input{background:#f7f8f4;border:1px solid #dfe5de;padding:0 12px;border-radius:8px;width:170px;height:44px;font-size:14px}.filter-actions{display:flex;gap:10px}.filter-actions button{margin:0;font-size:14px;background:#edf3ed;color:#185448;border-radius:8px;padding:0 18px;line-height:44px}.filter-actions button::after{border:0}.filter-actions .apply-price{background:#185448;color:#fff}.price-error{color:#a3392f;font-size:14px;margin-top:16px}@media(max-width:1050px){.tutor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{padding:28px}.hero-art{width:260px}.headline{font-size:36px}}@media(max-width:700px){.hero{padding:26px 22px}.hero-art{display:none}.headline{font-size:28px;line-height:1.35;letter-spacing:-.5px;margin-top:14px}.eyebrow{font-size:10px;letter-spacing:.6px}.intro{font-size:14px;margin-top:14px}.links{font-size:12px;gap:18px;margin-top:18px}.tutor-grid{grid-template-columns:minmax(0,1fr);gap:14px}.filter-panel{padding:0 16px 18px}.heading{font-size:16px;margin-top:18px}.result-heading{font-size:20px;margin-top:28px}.count{font-size:12px}.price-filter{align-items:stretch;flex-direction:column;gap:14px}.price-inputs input{width:0;flex:1;min-width:0}.filter-actions button{flex:1}.chip{padding:8px 13px}.ai-entry{padding:14px;gap:12px}.match-title{font-size:14px}.match-note{font-size:12px}.search{margin-top:20px}.notice{text-align:left;font-size:12px}}

</style>
