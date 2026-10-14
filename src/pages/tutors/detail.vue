<script setup lang="ts">
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
  <view v-if="loading" class="page muted-note">正在读取家教资料…</view>
  <view v-else-if="error" class="page surface-card empty-state">{{ error }} <text @click="loadTutor">重试</text></view>
  <view v-else-if="tutor" class="page">
    <view class="panel profile"><view class="avatar">{{ tutor.name.slice(1, 2) }}</view><text class="name">{{ tutor.name }}</text><text class="muted">{{ tutor.university }} · {{ tutor.major }}</text><view class="tags"><text v-for="tag in tutor.tags" :key="tag">{{ tag }}</text></view></view>
    <view class="panel"><text class="heading">教学信息</text><view class="line"><text>擅长科目</text><text>{{ tutor.subjects.join('、') }}</text></view><view class="line"><text>授课地区</text><text>{{ tutor.area }}</text></view><view class="line"><text>授课方式</text><text>{{ tutor.teachingMode }}</text></view><view class="line"><text>参考课时费</text><text class="price">¥{{ tutor.pricePerHour }}/小时</text></view><view v-if="tutor.availability" class="line"><text>可授课时间</text><text>{{ tutor.availability }}</text></view></view>
    <view class="panel"><text class="heading">自我介绍</text><text class="description">{{ tutor.introduction }}</text></view>
    <view class="notice">虚构演示资料，未进行真实身份、资质或价格验证。</view>
    <button class="primary-button" @click="book">发起演示预约</button>
    <view class="report" @click="report">举报演示资料</view>
  </view>
  <view v-else class="page surface-card empty-state">未找到老师，请返回首页。</view>
</template>
<style scoped>
.page{padding:28rpx}.panel{background:#fff;padding:30rpx;border-radius:22rpx;margin-bottom:24rpx}.profile{background:linear-gradient(135deg,#eaf1ff,#fff);display:flex;flex-direction:column;align-items:center}.avatar{width:110rpx;height:110rpx;background:#d5e6ff;border-radius:25rpx;display:flex;align-items:center;justify-content:center;color:#3168d2;font-size:45rpx}.name{font-size:36rpx;font-weight:700;margin-top:15rpx}.muted,.notice{color:#8793a6;font-size:23rpx;margin-top:12rpx}.tags{display:flex;gap:12rpx;margin-top:20rpx}.tags text{background:#dce9ff;color:#2c5dbb;border-radius:10rpx;padding:10rpx;font-size:22rpx}.heading{font-size:30rpx;font-weight:700;display:block;margin-bottom:20rpx}.line{display:flex;justify-content:space-between;gap:22rpx;padding:16rpx 0;border-bottom:1rpx solid #f1f3f6;font-size:25rpx;color:#54647d}.line text:last-child{text-align:right}.price{color:#2466df;font-weight:700}.description{line-height:1.8;color:#4e607b;font-size:26rpx}.notice{line-height:1.7;margin-bottom:22rpx}.report{text-align:center;color:#74829a;font-size:24rpx;margin:26rpx}
</style>
