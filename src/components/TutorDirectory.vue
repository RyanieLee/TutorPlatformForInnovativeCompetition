<script setup lang="ts">
import { apiMode } from '../config/runtime'
import { onMounted } from 'vue'
import { ref, watch } from 'vue'
import { parsePriceRange } from '../services/tutor-query'
import TutorCard from '../components/TutorCard.vue'
import { businessService } from '../services/business'
import { errorMessage } from '../services/errors'
import type { Tutor } from '../types/tutor'

const query = ref('')
const subject = ref('全部')
const teachingMode = ref<'全部' | '线上' | '线下'>('全部')
const teachingModes = ['全部', '线上', '线下'] as const
const subjects = ['全部', '数学', '英语', '语文', '物理', '化学']
const tutors = ref<Tutor[]>([])
const loading = ref(false)
const minPriceText=ref(''),maxPriceText=ref(''),priceError=ref('')
const priceRange=ref<{minPrice?:number;maxPrice?:number}>({})
// uni-app H5 对 input 的 model 更新节流 100ms；blur 先同步，防止快速点击读取旧价。
function syncPrice(side:'min'|'max',event:unknown){
 const value=(event as {detail?:{value?:unknown}})?.detail?.value
 if(typeof value==='string'){if(side==='min')minPriceText.value=value;else maxPriceText.value=value}
}
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
onMounted(() => { void loadTutors() })
const openTutor = (id: string) => uni.navigateTo({ url: '/pages/tutors/detail?id=' + id })
defineExpose({ refresh: () => loadTutors() })
</script>
<template><view class="page tutor-directory">    <input v-model="query" class="search" placeholder="搜索科目、地区或老师姓名"/>
    <view class="filter-panel"><view class="heading">按科目查找</view>
    <scroll-view scroll-x><view class="filters"><text v-for="s in subjects" :key="s" class="chip" :class="{ active: subject === s }" @click="subject = s">{{ s }}</text></view></scroll-view>
    <view class="heading">授课方式</view>
    <view class="filters teaching-modes"><text v-for="mode in teachingModes" :key="mode" class="chip" :class="{ active: teachingMode === mode }" @click="teachingMode = mode">{{ mode }}</text></view>
    <view class="price-filter"><view><text class="filter-label">课时价格区间（元 / 小时）</text><view class="price-inputs"><input v-model="minPriceText" @blur="syncPrice('min',$event)" type="digit" maxlength="12" placeholder="最低价格（可空）"/><text>—</text><input v-model="maxPriceText" @blur="syncPrice('max',$event)" type="digit" maxlength="12" placeholder="最高价格（可空）"/></view></view><view class="filter-actions"><button class="apply-price" @click="applyPrices">应用价格</button><button @click="resetFilters">重置筛选</button></view></view>
    <view v-if="priceError" class="price-error" role="alert">{{ priceError }}；仍展示上次已应用的价格条件。</view></view>
    <view id="tutor-results" class="heading">推荐家教 <text class="count">已显示 {{ tutors.length }} 位{{ apiMode ? '开发版' : '演示' }}老师</text></view>
    <view v-if="loading && !tutors.length" class="empty">{{ apiMode ? '正在读取家教…' : '正在读取演示家教…' }}</view>
    <view v-else-if="error && !tutors.length" class="empty">{{ error }} <text class="retry" @click="loadTutors()">重试</text></view>
    <template v-else><view class="tutor-grid"><TutorCard v-for="t in tutors" :key="t.id" :tutor="t" @open="openTutor"/></view><view v-if="!tutors.length" class="empty">没有匹配的老师，换个关键词试试。</view><view v-if="error" class="empty">{{ error }} <text class="retry" @click="loadTutors(true)">重试</text></view><view v-else-if="hasMore" class="load-more" @click="loadTutors(true)">{{ loading ? '正在加载…' : '加载更多老师' }}</view></template>
    <view class="notice">{{ apiMode ? '开发版资料仅供测试，审核状态不代表真实身份或资质核验。' : '所有老师、价格及教学信息均为虚构演示数据，未经过真实资质核验。' }}</view>
</view></template>
<style scoped>
.ai-entry{margin-top:24rpx;text-align:left;background:#e8f0ff;color:#1b56b4;border-radius:18rpx;font-size:27rpx;padding:12rpx 24rpx}.parent-shell .page .learning-entry{grid-column:1/-1;background:#e5f2ed;color:#176a62}.page{padding:0}.hero{background:linear-gradient(135deg,#1852c8,#3c8be9);border-radius:26rpx;padding:40rpx 30rpx;color:#fff;display:flex;flex-direction:column}.eyebrow{font-size:23rpx;opacity:.85}.headline{font-size:48rpx;font-weight:800;margin-top:20rpx}.intro{font-size:24rpx;line-height:1.6;opacity:.9;margin-top:15rpx}.links{display:flex;gap:22rpx;margin-top:26rpx;font-size:25rpx}.links text{background:#ffffff33;padding:13rpx 18rpx;border-radius:50rpx}.search{background:#fff;border-radius:16rpx;padding:20rpx 24rpx;height:90rpx;margin-top:25rpx;font-size:26rpx}.heading{font-size:31rpx;font-weight:700;margin:35rpx 0 20rpx}.count{font-size:22rpx;color:#8590a4;font-weight:400;margin-left:20rpx}.filters{display:flex;gap:12rpx;padding-bottom:8rpx}.chip{flex-shrink:0;background:#fff;color:#54637b;border-radius:60rpx;padding:16rpx 27rpx;font-size:24rpx}.active{background:#2868e4;color:#fff}.notice,.empty{text-align:center;color:#929aab;font-size:22rpx;line-height:1.7;margin:30rpx 0}.retry{color:#2868e4;margin-left:10rpx}
.load-more{background:#fff;border-radius:16rpx;color:#2868e4;text-align:center;padding:22rpx;margin:24rpx 0;font-size:25rpx}
.tutor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.filter-panel{background:#fff;border:1px solid #e3eaf3;border-radius:18px;padding:4px 24px 24px;margin-top:22px}.price-filter{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-top:22px}.filter-label{font-size:14px;color:#60748e}.price-inputs{display:flex;align-items:center;gap:12px;margin-top:10px}.price-inputs input{background:#f2f5fa;padding:10px 12px;border-radius:9px;width:170px;height:42px;font-size:14px}.filter-actions{display:flex;gap:10px}.filter-actions button{margin:0;font-size:14px;background:#edf2fa;color:#486184;border-radius:10px;padding:0 18px;line-height:3}.filter-actions .apply-price{background:#245fc7;color:white}.price-error{color:#b22c36;font-size:14px;margin-top:16px}@media(min-width:1000px){.hero{padding:52px 42px}.headline{font-size:40px;line-height:1.4}.intro{font-size:16px}.ai-entry{font-size:17px}.search{height:58px;font-size:16px}}@media(max-width:1050px){.tutor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.tutor-grid{grid-template-columns:minmax(0,1fr);gap:14px}.filter-panel{padding:2px 14px 18px}.price-filter{align-items:stretch;flex-direction:column}.price-inputs input{width:0;flex:1;min-width:0}.filter-actions button{flex:1}.hero{padding:32rpx 25rpx}.headline{font-size:39rpx}.heading{line-height:1.6}}
.parent-shell .page .learning-entry{grid-column:1/-1;display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:#f1f5ea;color:#2b573d;border:1px solid #bacab6;border-radius:18px;padding:22px;text-align:left;margin:18px 0;line-height:1.6}.learning-kicker{font-size:12px;font-weight:700}.learning-title{font-size:21px;font-weight:700}.learning-note{font-size:13px;color:#5c715e}
</style>

<style scoped>
.reference-entry{display:none}
</style>
