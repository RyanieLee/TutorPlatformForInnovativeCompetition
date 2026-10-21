<script setup lang="ts">
import ParentLayout from '../../components/ParentLayout.vue'
import { apiMode } from '../../config/runtime'
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import type { Tutor } from '../../types/tutor'

const tutorId = ref('')
const tutor = ref<Tutor | null>(null)
const loading = ref(true)
const error = ref('')
onLoad(options => { tutorId.value = String(options?.id ?? '') })
onShow(() => { void loadTutor() })
async function loadTutor() {
  loading.value = true
  error.value = ''
  try { tutor.value = await businessService.getTutor(tutorId.value) }
  catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
}
function book() { if (tutor.value) uni.navigateTo({ url: '/pages/orders/create?tutorId=' + tutor.value.id }) }
function report() { if (tutor.value) uni.navigateTo({ url: '/pages/reports/create?tutorId=' + tutor.value.id }) }
</script>
<template>
  <ParentLayout title="家教资料" active="home">
  <view v-if="loading" class="page muted-note">正在读取家教资料…</view>
  <view v-else-if="error" class="page surface-card empty-state">{{ error }} <text @click="loadTutor">重试</text></view>
  <view v-else-if="tutor" class="page detail-grid"><view class="detail-main">
    <view class="panel profile"><view class="avatar">{{ tutor.name.slice(1, 2) }}</view><text class="name">{{ tutor.name }}</text><text class="muted">{{ tutor.university }} · {{ tutor.major }}</text><view class="tags"><text v-for="tag in tutor.tags" :key="tag">{{ tag }}</text></view></view>
    <view class="panel"><text class="heading">教学信息</text><view class="line"><text>擅长科目</text><text>{{ tutor.subjects.join('、') }}</text></view><view class="line"><text>授课地区</text><text>{{ tutor.area }}</text></view><view class="line"><text>授课方式</text><text>{{ tutor.teachingMode }}</text></view><view class="line"><text>参考课时费</text><text class="price">¥{{ tutor.pricePerHour }}/小时</text></view><view v-if="tutor.availability" class="line"><text>可授课时间</text><text>{{ tutor.availability }}</text></view></view>
    <view class="panel"><text class="heading">自我介绍</text><text class="description">{{ tutor.introduction }}</text></view>
    </view><view class="booking-aside"><text class="aside-label">从一次沟通开始</text><text class="aside-price">¥{{ tutor.pricePerHour }}<text> / 小时</text></text><text class="aside-mode">{{ tutor.teachingMode }} · {{ tutor.area }}</text><view class="notice">{{ apiMode ? '开发版资料尚未进行真实身份、资质或价格验证。' : '虚构演示资料，未进行真实身份、资质或价格验证。' }}</view>
    <button class="primary-button" @click="book">{{ apiMode ? '发起开发预约' : '发起演示预约' }}</button>
    <view class="report" @click="report">{{ apiMode ? '举报开发资料' : '举报演示资料' }}</view></view>
  </view>
  <view v-else class="page surface-card empty-state">未找到老师，请返回首页。</view>
</ParentLayout>
</template>
<style scoped>

.page{padding:0;max-width:1100px;margin:0 auto}.detail-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);gap:24px;align-items:start}.panel{background:#fff;border:1px solid #dfe5de;padding:28px;border-radius:16px;margin-bottom:20px}.profile{background:#edf3ed;display:flex;flex-direction:column;align-items:flex-start}.avatar{width:64px;height:70px;background:#d8e5d5;border-radius:4px 20px 4px 20px;display:flex;align-items:center;justify-content:center;color:#185448;font-size:30px}.name{font-size:30px;font-weight:600;margin-top:16px}.muted,.notice{color:#61716a;font-size:14px;margin-top:10px;line-height:1.8}.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.tags text{background:#fff;color:#48614d;border-radius:6px;padding:5px 10px;font-size:14px}.heading{font-size:20px;font-weight:600;display:block;margin-bottom:16px}.line{display:flex;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid #edf0e9;font-size:16px;color:#61716a}.line text:last-child{text-align:right;color:#202c28}.line:last-child{border-bottom:0}.line .price{color:#185448;font-weight:600}.description{line-height:1.9;color:#52665b;font-size:16px}.booking-aside{position:sticky;top:24px;background:#fff;border:1px solid #dfe5de;border-radius:16px;padding:28px}.aside-label{display:block;color:#61716a;font-size:14px}.aside-price{display:block;font-size:36px;font-weight:600;color:#185448;margin:12px 0}.aside-price text{font-size:14px;color:#61716a;font-weight:400}.aside-mode{font-size:14px;color:#61716a}.notice{margin:24px 0;padding-top:20px;border-top:1px solid #edf0e9}.report{text-align:center;color:#61716a;font-size:14px;margin-top:18px;cursor:pointer}@media(max-width:700px){.detail-grid{grid-template-columns:minmax(0,1fr);gap:0}.panel,.booking-aside{padding:22px}.booking-aside{position:static}.name{font-size:24px}.line{font-size:14px}.description{font-size:16px}}

</style>
