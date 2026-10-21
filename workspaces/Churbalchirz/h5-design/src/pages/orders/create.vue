<script setup lang="ts">
import ParentLayout from '../../components/ParentLayout.vue'
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { apiMode } from '../../config/runtime'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { canAccess, currentSession, restoreSession } from '../../utils/session'
import type { Tutor } from '../../types/tutor'

const tutorId = ref('')
const tutor = ref<Tutor | null>(null)
const ready = ref(false)
const busy = ref(false)
const error = ref('')
const form = reactive({ studentName: '', contact: '', subject: '', expectedTime: '', note: '' })
const subjects = computed(() => tutor.value?.subjects ?? [])
const subjectIndex = computed(() => Math.max(0, subjects.value.indexOf(form.subject)))
onLoad(options => { tutorId.value = String(options?.tutorId ?? '') })
onShow(async () => {
  ready.value = false
  error.value = ''
  try {
    await restoreSession()
    tutor.value = await businessService.getTutor(tutorId.value)
    if (tutor.value && !tutor.value.subjects.includes(form.subject)) form.subject = tutor.value.subjects[0] ?? ''
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
})
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
function changeSubject(event: { detail: { value: string | number } }) { form.subject = subjects.value[Number(event.detail.value)] ?? '' }
async function submit() {
  const user = currentSession.value?.user
  if (!user || !canAccess(['parent']) || !tutor.value || busy.value) return
  busy.value = true
  try {
    await businessService.createBooking(user, { ...form, tutorId: tutor.value.id, tutorName: tutor.value.name })
    uni.showToast({ title: apiMode ? '预约已提交' : '已保存演示预约', icon: 'success' })
    uni.switchTab({ url: '/pages/orders/index' })
  } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
</script>
<template>
  <ParentLayout title="预约家教" active="orders">
  <view v-if="!ready" class="page muted-note">正在读取演示信息…</view>
  <view v-else-if="error" class="page surface-card empty-state">{{ error }}</view>
  <view v-else-if="!currentSession" class="page"><view class="surface-card empty-state">登录后可填写演示预约<view class="muted-note">{{ apiMode ? '预约提交后保存在开发服务器的数据库中。' : '预约只保存在当前设备。' }}</view><button class="primary-button guide" @click="goLogin">进入演示登录</button></view></view>
  <view v-else-if="!canAccess(['parent'])" class="page"><view class="surface-card empty-state">当前身份不能提交家长预约<view class="muted-note">请在“我的”切换为学生/家长。</view><button class="secondary-button guide" @click="goProfile">前往我的</button></view></view>
  <view v-if="tutor" v-show="ready && !error && canAccess(['parent'])" class="page"><view class="notice">{{ apiMode ? '提交后预约将保存至开发服务器数据库，不会通知老师；请勿填写真实私人信息。' : '本机模拟记录，不会通知老师，不代表真实订单。请勿填写真实私人信息。' }}</view><view class="panel"><view class="title">预约 {{ tutor.name }}</view><view class="booking-summary">¥{{ tutor.pricePerHour }}/小时 · {{ tutor.teachingMode }} · {{ tutor.subjects.join('、') }}</view><view class="field"><text>称呼 *</text><input v-model="form.studentName" maxlength="20" placeholder="例如：测试同学"/></view><view v-if="!apiMode" class="field"><text>联系电话 *</text><input v-model="form.contact" type="number" maxlength="11" placeholder="11位演示数字"/></view><view class="field"><text>辅导科目</text><picker :range="subjects" :value="subjectIndex" @change="changeSubject"><view class="input">{{ form.subject }} ⌄</view></picker></view><view class="field"><text>期望时间 *</text><input v-model="form.expectedTime" maxlength="40" placeholder="例如：周六下午2点"/></view><view class="field"><text>辅导需求</text><textarea v-model="form.note" maxlength="200" placeholder="例如：初二数学基础巩固"/></view></view><button class="primary-button" :loading="busy" :disabled="busy" @click="submit">{{ apiMode ? '提交开发预约' : '保存演示预约' }}</button></view>
  <view v-if="ready && !error && !tutor" class="page surface-card empty-state">家教信息不存在，请返回首页重试。</view>
</ParentLayout>
</template>
<style scoped>

.page{padding:0;max-width:760px;margin:0 auto}.notice{background:#fff8e8;border:1px solid #e8dfc7;color:#796039;padding:16px 20px;border-radius:12px;font-size:14px;line-height:1.8}.panel{background:#fff;border:1px solid #dfe5de;padding:32px;border-radius:16px;margin:24px 0}.title{font-size:30px;font-weight:600}.booking-summary{margin:16px 0 24px;padding:14px 16px;border-left:3px solid #185448;background:#edf3ed;color:#185448;font-size:16px;line-height:1.7}.field{display:flex;flex-direction:column;margin-top:24px;gap:10px;font-size:16px}.field>text{font-weight:600}.field input,.input,.field textarea{background:#f8f9f5;border:1px solid #dfe5de;border-radius:10px;padding:12px 14px;min-height:48px;width:100%;font-size:16px;box-sizing:border-box}.field textarea{height:120px}.guide{margin-top:24px}@media(max-width:700px){.panel{padding:22px}.title{font-size:24px}.booking-summary{font-size:14px}.notice{font-size:12px;padding:14px 16px}}

</style>
