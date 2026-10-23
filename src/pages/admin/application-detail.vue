<script setup lang="ts">
import { ref } from 'vue'
import TutorPhoto from '../../components/TutorPhoto.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import RoleShell from '../tutor/shared/RoleShell.vue'
import AsyncState from '../tutor/shared/AsyncState.vue'
import { useRolePage, identityKey, assertIdentity, confirmAction, isConflict, formatTime } from '../tutor/shared/page'
import { runConfirmedAction } from '../tutor/shared/operations'
import { currentSession, canAccess } from '../../utils/session'
import { businessService } from '../../services/business'
import { reviewStatusLabels } from '../../services/rules'
import { errorMessage } from '../../services/errors'
import type { TutorApplication } from '../../types/business'
const id = ref(''), application = ref<TutorApplication | null>(null), reason = ref(''), busy = ref(false), feedback = ref('')
const { ready, error, authorized, load, scope } = useRolePage('admin', () => { application.value = null; reason.value = ''; feedback.value = '' })
onLoad(o => { id.value = String(o?.id ?? '') })
const refresh = () => { if (!busy.value) void load(user => businessService.getApplication(user, id.value), data => { application.value = data }) }
onShow(refresh)
async function review(decision: 'approved' | 'rejected') {
  const user = currentSession.value?.user, target = application.value, owner = identityKey()
  if (busy.value || !user || !target || target.status !== 'pending' || !canAccess(['admin'])) return
  const operation = scope.begin()
  const explanation = reason.value.trim()
  if (decision === 'rejected' && !explanation) { feedback.value = '请填写拒绝原因，不能只填写空格。'; return }
  busy.value = true; feedback.value = ''
  try {
    const result = await runConfirmedAction({ confirm: () => confirmAction(decision === 'approved' ? '确认通过审核' : '确认拒绝申请', decision === 'approved' ? '通过后，这份演示家教资料将公开展示。确认通过吗？' : '申请将退回给家教修改，拒绝原因：' + explanation), execute: () => { assertIdentity(owner); if (!operation.isCurrent()) throw new Error('操作已失效'); return businessService.reviewApplication(user, target.id, decision, explanation) } })
    if (result.kind === 'success' && operation.isCurrent()) { application.value = result.value; reason.value = ''; feedback.value = decision === 'approved' ? '申请已通过审核。' : '申请已拒绝，家教可查看原因后重新提交。' }
  } catch (cause) {
    if (operation.isCurrent()) {
      feedback.value = errorMessage(cause)
      if (isConflict(cause)) { try { const latest = await businessService.getApplication(user, target.id); if (operation.isCurrent()) { application.value = latest; feedback.value += '，已刷新最新审核状态。' } } catch { if (operation.isCurrent()) { application.value = null; feedback.value += '；刷新失败，请重新加载。' } } }
    }
  } finally { busy.value = false }
}
</script>
<template>
  <RoleShell title="家教申请审核" role="admin">
    <template v-if="authorized">
      <AsyncState v-if="!ready" state="loading" message="正在读取申请详情…" />
      <AsyncState v-else-if="error" state="error" :message="error" @retry="refresh" />
      <view v-show="ready && !error">
        <view v-if="feedback" class="b-info" role="status">{{ feedback }}</view>
        <view v-if="application" class="b-grid">
          <view class="b-panel"><view class="b-section">演示申请资料</view><text class="b-status">{{ reviewStatusLabels[application.status] }}</text>
            <TutorPhoto class="tutor-photo" :src="application.photoUrl" :name="application.displayName" size="resume" private-photo/><view class="b-row"><text>展示称呼</text><text>{{ application.displayName }}</text></view><view class="b-row"><text>学校 / 专业</text><text>{{ application.university }} · {{ application.major }}</text></view><view class="b-row"><text>擅长科目</text><text>{{ application.subjects.join('、') }}</text></view><view class="b-row"><text>授课方式</text><text>{{ application.teachingMode }}</text></view><view class="b-row"><text>服务地区</text><text>{{ application.area }}</text></view><view class="b-row"><text>参考价格</text><text>{{ application.pricePerHour }} 元 / 小时</text></view><view class="b-row"><text>授课时间</text><text>{{ application.availability }}</text></view><view class="b-row"><text>教学经历</text><text>{{ application.experienceMonths == null ? '未填写' : application.experienceMonths + ' 个月' }}（自述）</text></view><view class="b-row"><text>相关课程成绩</text><text>{{ application.academicScore == null ? '未填写' : application.academicScore + '/100' }}（自评）</text></view><view class="b-row"><text>教学能力</text><text>{{ application.teachingSkillLevel == null ? '未填写' : application.teachingSkillLevel + '/5' }}（自评）</text></view><view class="b-row"><text>匿名案例数</text><text>{{ application.caseCount ?? '未填写' }}（自述）</text></view><view v-if="application.caseSummary" class="b-text">案例摘要：{{ application.caseSummary }}</view><view class="b-row"><text>更新时间</text><text>{{ formatTime(application.updatedAt) }}</text></view><view class="b-text">个人介绍：{{ application.introduction }}</view>
          </view>
          <view class="b-panel"><view class="b-section">审核处理</view><view class="b-info">仅审核演示资料和照片内容；不核验真实身份、学业成绩或教学成效。</view><view v-if="application.rejectionReason" class="b-reason">拒绝原因：{{ application.rejectionReason }}</view>
            <template v-if="application.status === 'pending'"><view class="b-field"><text class="b-label">拒绝原因（拒绝时必填）</text><textarea class="b-textarea" v-model="reason" :disabled="busy" maxlength="200" placeholder="请填写明确的演示审核原因，最多 200 字"/></view><view class="b-actions"><button class="b-button" :disabled="busy" :loading="busy" @click="review('approved')">批准申请</button><button class="b-button danger" :disabled="busy" @click="review('rejected')">拒绝申请</button></view></template>
            <view v-else class="b-muted">{{ application.status === 'draft' ? '申请仍为草稿，尚不能审核。' : '此申请已处理，不能重复审核。' }}</view>
            <button class="b-button secondary" :disabled="busy" @click="refresh">刷新审核状态</button>
          </view>
        </view>
        <view v-else class="b-panel"><text>申请暂时不可读取。</text><button class="b-button secondary" @click="refresh">重新加载</button></view>
      </view>
    </template>
  </RoleShell>
</template>
<style scoped src="../tutor/shared/workflow.css"></style>
<style scoped>.tutor-photo{display:block;width:112px;height:112px;border-radius:14px;margin:12px 0}</style>

