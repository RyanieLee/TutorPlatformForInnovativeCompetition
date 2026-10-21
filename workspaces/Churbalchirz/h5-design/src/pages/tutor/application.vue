<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import RoleShell from './shared/RoleShell.vue'
import AsyncState from './shared/AsyncState.vue'
import { useRolePage, identityKey, assertIdentity, confirmAction } from './shared/page'
import { runConfirmedAction } from './shared/operations'
import { submitReviewedApplication } from './shared/application'
import { currentSession, canAccess } from '../../utils/session'
import { businessService } from '../../services/business'
import { errorMessage } from '../../services/errors'
import { reviewStatusLabels, validateTutorApplication } from '../../services/rules'
import type { TutorApplication, TutorApplicationInput } from '../../types/business'
import type { TeachingMode } from '../../types/tutor'

const emptyForm = (): TutorApplicationInput => ({ displayName: '', university: '', major: '', subjects: [], teachingMode: '均可', area: '', pricePerHour: 0, introduction: '', availability: '' })
const form = reactive(emptyForm())
const price = ref(''), application = ref<TutorApplication | null>(null), busy = ref(false), feedback = ref('')
const uncertain = ref(false)
const subjects = ['数学','英语','语文','物理','化学','生物']
const modes: TeachingMode[] = ['线上','线下','均可']
const { ready, error, authorized, load, scope } = useRolePage('tutor', () => { application.value = null; Object.assign(form, emptyForm()); price.value = ''; feedback.value = ''; uncertain.value = false })
const modeIndex = computed(() => modes.indexOf(form.teachingMode))
function fill(a: TutorApplication | null) {
  uncertain.value = false
  application.value = a
  if (a) { const { displayName, university, major, subjects, teachingMode, area, pricePerHour, introduction, availability } = a; Object.assign(form, { displayName, university, major, subjects: [...subjects], teachingMode, area, pricePerHour, introduction, availability }); price.value = pricePerHour ? String(pricePerHour) : '' }
}
const refresh = () => { if (!busy.value) void load(user => businessService.getMyApplication(user), fill) }
onShow(refresh)
function toggle(s: string) { if (!busy.value && !uncertain.value) form.subjects = form.subjects.includes(s) ? form.subjects.filter(x => x !== s) : [...form.subjects, s] }
function changeMode(e: { detail: { value: string | number } }) { if (!busy.value && !uncertain.value) form.teachingMode = modes[Number(e.detail.value)] ?? '均可' }
async function save(submit: boolean) {
  const user = currentSession.value?.user, owner = identityKey()
  if (busy.value || uncertain.value || !user || !canAccess(['tutor']) || application.value?.status === 'pending') return
  const operation = scope.begin()
  const input = { ...form, subjects: [...form.subjects], pricePerHour: Number(price.value) }
  feedback.value = ''; busy.value = true
  let sent = false
  try {
    if (submit) validateTutorApplication(input)
    const approved = application.value?.status === 'approved'
    const result = await runConfirmedAction({
      confirm: () => confirmAction(submit ? '确认提交审核' : '确认保存草稿', approved ? '修改已通过的资料会撤销公开展示，并保存为草稿。' + (submit ? '随后将重新提交审核，是否继续？' : '是否继续保存？') : submit ? '提交后等待管理员审核，审核期间不能修改。是否继续？' : '将当前填写内容保存为草稿，是否继续？'),
      execute: async () => {
        assertIdentity(owner)
        if (!operation.isCurrent()) throw new Error('操作已失效')
        sent = true
        return submit ? submitReviewedApplication(businessService, user, application.value, input, draft => { assertIdentity(owner); if (!operation.isCurrent()) throw new Error('操作已失效'); application.value = draft }) : businessService.saveApplicationDraft(user, input)
      }
    })
    if (result.kind === 'success' && operation.isCurrent()) {
      application.value = result.value
      feedback.value = submit ? '申请已提交，请等待管理员审核。' : '草稿已保存，可继续编辑后提交审核。'
      uni.showToast({ title: submit ? '申请已提交' : '草稿已保存', icon: 'none' })
    }
  } catch (cause) {
    if (operation.isCurrent()) {
      feedback.value = errorMessage(cause)
      if (sent) {
        try { const latest = await businessService.getMyApplication(user); if (operation.isCurrent()) { application.value = latest; uncertain.value = false; feedback.value += '；已重新读取审核状态，请确认后继续。' } }
        catch { if (operation.isCurrent()) { uncertain.value = true; feedback.value += '；操作结果尚未确认，已暂停编辑与提交。请点击“刷新审核状态”恢复查询，当前输入已保留。' } }
      }
    }
  } finally { busy.value = false }
}
</script>
<template>
  <RoleShell title="家教入驻资料" role="tutor">
    <template v-if="authorized">
      <AsyncState v-if="!ready" state="loading" message="正在读取入驻资料…" />
      <AsyncState v-else-if="error" state="error" :message="error" @retry="refresh" />
      <view v-show="ready && !error">
        <view class="b-toolbar"><text v-if="uncertain" class="b-status">状态待确认</text><text v-else class="b-status">审核状态：{{ application ? reviewStatusLabels[application.status] : '未申请' }}</text><button class="b-button secondary" :disabled="busy" @click="refresh">刷新审核状态</button></view>
        <view v-if="application?.rejectionReason" class="b-reason">拒绝原因：{{ application.rejectionReason }}。请补充后重新提交。</view>
        <view v-if="feedback" class="b-info" role="status">{{ feedback }}</view>
        <view v-show="application?.status === 'pending'" class="b-panel"><view class="b-section">申请已提交</view><text class="b-muted">管理员审核前，资料暂时不能修改。你可以返回工作台处理预约。</text><view class="b-row"><text>提交称呼</text><text>{{ application?.displayName }}</text></view><view class="b-row"><text>学校 / 专业</text><text>{{ application?.university }} · {{ application?.major }}</text></view><view class="b-row"><text>科目与方式</text><text>{{ application?.subjects.join('、') }} · {{ application?.teachingMode }}</text></view><view class="b-row"><text>地区与价格</text><text>{{ application?.area }} · {{ application?.pricePerHour }} 元 / 小时</text></view><view class="b-row"><text>授课时间</text><text>{{ application?.availability }}</text></view><view class="b-text">{{ application?.introduction }}</view></view>
        <view v-show="application?.status !== 'pending'" class="b-grid">
          <view class="b-panel">
            <view class="b-section">{{ application?.status === 'approved' ? '修改资料 / 重新送审' : '填写演示资料' }}</view>
            <view v-if="application?.status === 'approved'" class="b-info">资料目前已通过审核。保存修改会撤销公开展示，重新审核通过后才会恢复。</view>
            <view class="b-field"><text class="b-label">展示称呼 *</text><input class="b-input" v-model="form.displayName" :disabled="busy || uncertain" maxlength="20" placeholder="例如：演示老师"/></view>
            <view class="b-field"><text class="b-label">学校 *</text><input class="b-input" v-model="form.university" :disabled="busy || uncertain" maxlength="40" placeholder="例如：示例大学"/></view>
            <view class="b-field"><text class="b-label">专业 *</text><input class="b-input" v-model="form.major" :disabled="busy || uncertain" maxlength="40" placeholder="例如：数学与应用数学"/></view>
            <view class="b-field"><text class="b-label">擅长科目 *</text><view class="b-chips"><button v-for="s in subjects" :key="s" class="b-chip" :class="{ active: form.subjects.includes(s) }" :disabled="busy || uncertain" @click="toggle(s)">{{ s }}</button></view></view>
            <view class="b-field"><text class="b-label">授课方式 *</text><picker :range="modes" :value="modeIndex" :disabled="busy || uncertain" @change="changeMode"><view class="b-input">{{ form.teachingMode }}　⌄</view></picker></view>
          </view>
          <view class="b-panel">
            <view class="b-section">教学安排</view>
            <view class="b-field"><text class="b-label">服务地区 *</text><input class="b-input" v-model="form.area" :disabled="busy || uncertain" maxlength="40" placeholder="例如：示例大学城"/></view>
            <view class="b-field"><text class="b-label">参考价格（元 / 小时）*</text><input class="b-input" v-model="price" :disabled="busy || uncertain" type="digit" placeholder="填写 1–1000 元"/></view>
            <view class="b-field"><text class="b-label">可授课时间 *</text><input class="b-input" v-model="form.availability" :disabled="busy || uncertain" maxlength="100" placeholder="例如：周末下午"/></view>
            <view class="b-field"><text class="b-label">个人介绍 *（10–500 字）</text><textarea class="b-textarea" v-model="form.introduction" :disabled="busy || uncertain" maxlength="500" placeholder="介绍虚构的教学经历与特点"/></view>
            <text class="b-muted">草稿可暂不完整；提交审核前需填写所有必填项。请勿填写真实身份信息或上传证件。</text>
            <view class="b-actions"><button class="b-button secondary" :disabled="busy || uncertain" @click="save(false)">保存草稿</button><button class="b-button" :disabled="busy || uncertain" :loading="busy" @click="save(true)">{{ application?.status === 'approved' ? '修改并重新送审' : '提交审核' }}</button></view>
          </view>
        </view>
      </view>
    </template>
  </RoleShell>
</template>
<style scoped src="./shared/workflow.css"></style>
