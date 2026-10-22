<script setup lang="ts">
import {xianPlaces,readParentLocation,distanceKm} from '../../services/location'
import ParentLayout from '../../components/ParentLayout.vue'
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { apiMode } from '../../config/runtime'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { canAccess, currentSession, restoreSession } from '../../utils/session'
import type { Tutor } from '../../types/tutor'

const areaLabel=ref<string|undefined>()
const areaOptions=['不在地图标注',...xianPlaces.map(p=>p.label)]
function chooseArea(e:{detail:{value:string|number}}){areaLabel.value=xianPlaces[Number(e.detail.value)-1]?.label}
function nearbyArea(){const p=readParentLocation();if(!p){uni.showToast({title:'请先在匹配页选择位置，或直接选择公共片区',icon:'none'});return}areaLabel.value=[...xianPlaces].sort((a,b)=>distanceKm(p,a)-distanceKm(p,b))[0].label}
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
    await businessService.createBooking(user, { ...form, ...(areaLabel.value?{areaLabel:areaLabel.value}:{}), tutorId: tutor.value.id, tutorName: tutor.value.name })
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
  <view v-if="tutor" v-show="ready && !error && canAccess(['parent'])" class="page linghang-booking"><view class="notice">{{ apiMode ? '提交后预约将保存至开发服务器数据库，不会通知老师；请勿填写真实私人信息。' : '本机模拟记录，不会通知老师，不代表真实订单。请勿填写真实私人信息。' }}</view><view class="panel"><view class="title">预约 {{ tutor.name }}</view><view class="booking-summary">¥{{ tutor.pricePerHour }}/小时 · {{ tutor.teachingMode }} · {{ tutor.subjects.join('、') }}</view><view class="field"><text>称呼 *</text><input v-model="form.studentName" maxlength="20" placeholder="例如：测试同学"/></view><view v-if="!apiMode" class="field"><text>联系电话 *</text><input v-model="form.contact" type="number" maxlength="11" placeholder="11位演示数字"/></view><view class="field"><text>辅导科目</text><picker :range="subjects" :value="subjectIndex" @change="changeSubject"><view class="input">{{ form.subject }} ⌄</view></picker></view><view class="field"><text>期望时间 *</text><input v-model="form.expectedTime" maxlength="40" placeholder="例如：周六下午2点"/></view><view class="field"><text>地图参考片区（选填）</text><picker :range="areaOptions" :value="areaLabel?areaOptions.indexOf(areaLabel):0" @change="chooseArea"><view class="input order-area-picker">{{areaLabel??'不在地图标注'}} ⌄</view></picker><text class="muted-note">选择后，你、接收订单的家教和管理员可在地图查看片区参考点；不提交住址或GPS坐标。</text><button class="secondary-button" @click="nearbyArea">填入匹配位置附近的公共片区</button></view><view class="field"><text>辅导需求</text><textarea v-model="form.note" maxlength="200" placeholder="例如：初二数学基础巩固"/></view></view><button class="primary-button" :loading="busy" :disabled="busy" @click="submit">{{ apiMode ? '提交开发预约' : '保存演示预约' }}</button></view>
  <view v-if="ready && !error && !tutor" class="page surface-card empty-state">家教信息不存在，请返回首页重试。</view>
</ParentLayout>
</template>
<style scoped>
.page{padding:0;max-width:820px;margin:0 auto}.notice{background:#fff3dd;color:#946c38;padding:22rpx;border-radius:15rpx;font-size:24rpx;line-height:1.7}.panel{background:#fff;padding:28rpx;border-radius:20rpx;margin:24rpx 0}.title{font-size:32rpx;font-weight:700}.field{display:flex;flex-direction:column;margin-top:25rpx;gap:13rpx;font-size:26rpx}.field input,.input,.field textarea{background:#fbfcfe;border:1rpx solid #e5eaf2;border-radius:12rpx;padding:18rpx;min-height:80rpx;width:100%;font-size:26rpx}.field textarea{min-height:120rpx}.guide{margin-top:28rpx}
.booking-summary{margin-top:16rpx;color:#3866a5;font-size:25rpx;line-height:1.7}
</style>
