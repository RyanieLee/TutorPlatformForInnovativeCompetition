<script setup lang="ts">
import { apiMode } from '../../config/runtime'
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import type { ReportReason } from '../../types/business'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const tutorId = ref('')
const reasons: ReportReason[] = ['资料不实', '内容不当', '其他']
const reason = ref<ReportReason>('资料不实')
const reasonIndex = computed(() => reasons.indexOf(reason.value))
const description = ref('')
const ready = ref(false)
const busy = ref(false)
onLoad(options => { tutorId.value = String(options?.tutorId ?? '') })
onShow(async () => { await restoreSession(); ready.value = true })
function changeReason(event: { detail: { value: string | number } }) { reason.value = reasons[Number(event.detail.value)] ?? '其他' }
async function submit() {
  const user = currentSession.value?.user
  if (!user || !canAccess(['parent']) || busy.value) return
  busy.value = true
  try {
    await businessService.createReport(user, tutorId.value, reason.value, description.value)
    uni.showToast({ title: '已保存演示举报', icon: 'none' })
    uni.navigateBack()
  } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>
<template>
  <view class="page"><view class="heading">举报演示资料</view><view class="notice">{{ apiMode ? '开发版数据库记录' : '仅本机模拟' }}举报，不会触发真实平台处理。请勿填写真实学生或未成年人资料。</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取演示身份…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">登录家长演示身份后提交<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['parent'])" class="surface-card empty-state">当前身份不能提交举报<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else class="surface-card form"><view class="field"><text>举报原因</text><picker :range="reasons" :value="reasonIndex" @change="changeReason"><view class="input">{{ reason }} ⌄</view></picker></view><view class="field"><text>补充说明（可选，最多 200 字）</text><textarea v-model="description" maxlength="200" placeholder="仅描述虚构演示场景"/></view><button class="primary-button action" :loading="busy" @click="submit">提交模拟举报</button></view>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.surface-card{margin-top:22rpx}.field{display:flex;flex-direction:column;gap:12rpx;margin-bottom:25rpx}.field textarea,.input{background:#fbfcfe;border:1rpx solid #e5eaf2;border-radius:12rpx;padding:18rpx;min-height:80rpx;width:100%;font-size:26rpx}.field textarea{min-height:130rpx}.action{margin-top:18rpx}
</style>
