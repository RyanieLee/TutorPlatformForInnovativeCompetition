<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { reviewStatusLabels } from '../../services/rules'
import type { TutorApplication, TutorApplicationInput } from '../../types/business'
import type { TeachingMode } from '../../types/tutor'
import { canAccess, currentSession, restoreSession } from '../../utils/session'

const subjects = ['数学', '英语', '语文', '物理', '化学', '生物']
const modes: TeachingMode[] = ['线上', '线下', '均可']
const form = reactive<TutorApplicationInput>({ displayName: '', university: '', major: '', subjects: [], teachingMode: '均可', area: '', pricePerHour: 0, introduction: '', availability: '' })
const priceText = ref('')
const modeIndex = computed(() => modes.indexOf(form.teachingMode))
const application = ref<TutorApplication | null>(null)
const ready = ref(false)
const busy = ref(false)
const error = ref('')
onShow(() => { void load() })
async function load() {
  ready.value = false
  error.value = ''
  try {
    await restoreSession()
    if (canAccess(['tutor']) && currentSession.value) {
      application.value = await businessService.getMyApplication(currentSession.value.user)
      if (application.value) {
        const a = application.value
        Object.assign(form, { displayName: a.displayName, university: a.university, major: a.major, subjects: [...a.subjects], teachingMode: a.teachingMode, area: a.area, pricePerHour: a.pricePerHour, introduction: a.introduction, availability: a.availability })
        priceText.value = a.pricePerHour ? String(a.pricePerHour) : ''
      }
    }
  } catch (cause) { error.value = errorMessage(cause) }
  finally { ready.value = true }
}
function toggleSubject(value: string) {
  form.subjects = form.subjects.includes(value) ? form.subjects.filter(s => s !== value) : [...form.subjects, value]
}
function changeMode(event: { detail: { value: string | number } }) { form.teachingMode = modes[Number(event.detail.value)] ?? '均可' }
async function save(submit: boolean) {
  const user = currentSession.value?.user
  if (!user || !canAccess(['tutor']) || busy.value) return
  busy.value = true
  try {
    const input: TutorApplicationInput = { ...form, subjects: [...form.subjects], pricePerHour: Number(priceText.value) }
    application.value = submit ? await businessService.submitApplication(user, input) : await businessService.saveApplicationDraft(user, input)
    uni.showToast({ title: submit ? '已提交演示申请' : '草稿已保存', icon: 'none' })
  } catch (cause) { uni.showToast({ title: errorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
const goLogin = () => uni.navigateTo({ url: '/pages/auth/login?role=tutor' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
</script>
<template>
  <view class="page">
    <view class="heading">家教入驻资料</view>
    <view class="notice">仅填写虚构演示资料。请勿上传身份证、学生证或其他真实敏感信息；审核只是本机模拟。</view>
    <view v-if="!ready" class="surface-card empty-state">正在读取资料…</view>
    <view v-else-if="!currentSession" class="surface-card empty-state">登录家教演示身份后填写资料<button class="primary-button action" @click="goLogin">演示登录</button></view>
    <view v-else-if="!canAccess(['tutor'])" class="surface-card empty-state">当前身份不能提交家教申请<button class="secondary-button action" @click="goProfile">前往我的</button></view>
    <view v-else-if="error" class="surface-card empty-state">{{ error }}<button class="secondary-button action" @click="load">重试</button></view>
    <template v-else>
      <view class="surface-card status"><text>申请状态：{{ application ? reviewStatusLabels[application.status] : '未创建' }}</text><text v-if="application?.rejectionReason" class="reason">拒绝原因：{{ application.rejectionReason }}</text><text v-if="application?.status === 'approved'" class="muted-note">修改资料后需重新提交模拟审核。</text></view>
      <view v-if="application?.status === 'pending'" class="surface-card empty-state">申请正在等待管理员演示审核，审核期间不能修改。</view>
      <view v-else class="surface-card form">
        <view class="field"><text>展示称呼 *</text><input v-model="form.displayName" maxlength="20" placeholder="例如：演示老师"/></view>
        <view class="field"><text>学校 *</text><input v-model="form.university" maxlength="40" placeholder="例如：示例大学"/></view>
        <view class="field"><text>专业 *</text><input v-model="form.major" maxlength="40" placeholder="例如：数学与应用数学"/></view>
        <view class="field"><text>擅长科目 *</text><view class="chips"><text v-for="s in subjects" :key="s" class="chip" :class="{ selected: form.subjects.includes(s) }" @click="toggleSubject(s)">{{ s }}</text></view></view>
        <view class="field"><text>授课方式 *</text><picker :range="modes" :value="modeIndex" @change="changeMode"><view class="input">{{ form.teachingMode }} ⌄</view></picker></view>
        <view class="field"><text>服务地区 *</text><input v-model="form.area" maxlength="40" placeholder="例如：大学城周边"/></view>
        <view class="field"><text>参考价格（元/小时） *</text><input v-model="priceText" type="digit" placeholder="例如：80"/></view>
        <view class="field"><text>可授课时间 *</text><input v-model="form.availability" maxlength="100" placeholder="例如：周末下午"/></view>
        <view class="field"><text>个人介绍 *</text><textarea v-model="form.introduction" maxlength="500" placeholder="至少 10 字，描述演示教学特点"/></view>
        <button class="secondary-button action" :loading="busy" @click="save(false)">保存草稿</button>
        <button class="primary-button action" :loading="busy" @click="save(true)">提交模拟审核</button>
      </view>
    </template>
  </view>
</template>
<style scoped>
.page{padding:28rpx}.heading{font-size:36rpx;font-weight:700;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.surface-card{margin-top:22rpx}.status{display:flex;flex-direction:column;gap:12rpx;font-weight:600}.reason{color:#b44d47;font-size:24rpx}.field{display:flex;flex-direction:column;gap:12rpx;margin-bottom:26rpx;font-size:26rpx}.field input,.field textarea,.input{background:#fbfcfe;border:1rpx solid #e5eaf2;border-radius:12rpx;padding:18rpx;min-height:80rpx;width:100%;font-size:26rpx}.field textarea{min-height:150rpx}.chips{display:flex;flex-wrap:wrap;gap:12rpx}.chip{background:#edf2f8;color:#53637c;padding:14rpx 20rpx;border-radius:50rpx}.selected{background:#dce9ff;color:#245dc8}.action{margin-top:18rpx}
</style>
