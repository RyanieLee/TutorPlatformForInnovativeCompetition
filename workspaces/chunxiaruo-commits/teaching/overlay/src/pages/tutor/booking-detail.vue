<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import RoleShell from './shared/RoleShell.vue'
import AsyncState from './shared/AsyncState.vue'
import { useRolePage, identityKey, assertIdentity, confirmAction, isConflict, formatTime } from './shared/page'
import { runConfirmedAction } from './shared/operations'
import { tutorActions } from './shared/bookings'
import { currentSession, canAccess } from '../../utils/session'
import { businessService } from '../../services/business'
import { bookingStatusLabels, type BookingAction } from '../../services/rules'
import { errorMessage } from '../../services/errors'
import type { BookingOrder } from '../../types/tutor'
const id = ref(''), booking = ref<BookingOrder | null>(null), busy = ref(false), feedback = ref('')
const { ready, error, authorized, load, scope } = useRolePage('tutor', () => { booking.value = null; feedback.value = '' })
const actions = computed(() => booking.value ? tutorActions(booking.value.status) : [])
const labels: Partial<Record<BookingAction, string>> = { accept: '接受预约', reject: '拒绝预约', complete: '标记已完成' }
onLoad(o => { id.value = String(o?.id ?? '') })
const teaching = () => uni.navigateTo({url:'/pages/teaching/index?bookingId='+encodeURIComponent(id.value)})
const refresh = () => { if (!busy.value) void load(user => businessService.getTutorBooking(user, id.value), data => { booking.value = data }) }
onShow(refresh)
async function act(action: BookingAction) {
  const user = currentSession.value?.user, target = booking.value, owner = identityKey()
  if (!user || !target || busy.value || !canAccess(['tutor']) || !actions.value.includes(action)) return
  const operation = scope.begin()
  busy.value = true; feedback.value = ''
  try {
    const result = await runConfirmedAction({ confirm: () => confirmAction(labels[action] ?? '确认操作', action === 'reject' ? '拒绝后该预约将结束，不能恢复。确认拒绝吗？' : action === 'complete' ? '请确认本次演示预约已完成，完成后不能再修改。' : '接受后预约将进入待完成状态。确认接受吗？'), execute: () => { assertIdentity(owner); if (!operation.isCurrent()) throw new Error('操作已失效'); return businessService.transitionBooking(user, target.id, action) } })
    if (result.kind === 'success' && operation.isCurrent()) { booking.value = result.value; feedback.value = '预约状态已更新为：' + bookingStatusLabels[result.value.status]; uni.showToast({ title: '预约状态已更新', icon: 'none' }) }
  } catch (cause) {
    if (operation.isCurrent()) {
      feedback.value = errorMessage(cause)
      if (isConflict(cause)) { try { const latest = await businessService.getTutorBooking(user, target.id); if (operation.isCurrent()) { booking.value = latest; feedback.value += '，已刷新最新状态。' } } catch { if (operation.isCurrent()) { booking.value = null; feedback.value += '；刷新失败，请重新加载。' } } }
    }
  } finally { busy.value = false }
}
</script>
<template>
  <RoleShell title="收到的预约" role="tutor">
    <template v-if="authorized">
      <AsyncState v-if="!ready" state="loading" message="正在读取预约详情…" />
      <AsyncState v-else-if="error" state="error" :message="error" @retry="refresh" />
      <template v-else>
        <view v-if="feedback" class="b-info" role="status">{{ feedback }}</view>
        <view v-if="booking" class="b-grid"><view v-if="booking.status === 'accepted' || booking.status === 'completed' || booking.status === 'cancelled'" class="b-panel"><view class="b-section">教学安排</view><text class="b-muted">按课次发布预习资料，布置作业并查看学生提交。</text><button role="button" class="b-button" @click="teaching">课次与作业</button></view>
          <view class="b-panel"><view class="b-section">预约信息</view><text class="b-status">{{ bookingStatusLabels[booking.status] }}</text><view class="b-row"><text>辅导科目</text><text>{{ booking.subject }}</text></view><view class="b-row"><text>预约称呼</text><text>{{ booking.studentName }}</text></view><view class="b-row"><text>期望时间</text><text>{{ booking.expectedTime }}</text></view><view class="b-row"><text>创建时间</text><text>{{ formatTime(booking.createdAt) }}</text></view><view class="b-row"><text>更新时间</text><text>{{ formatTime(booking.updatedAt) }}</text></view></view>
          <view class="b-panel"><view class="b-section">辅导需求与处理</view><view class="b-text">{{ booking.note || '未填写补充需求。' }}</view><view v-if="!actions.length" class="b-info">该预约已结束，仅可查看记录，不能继续处理。</view><view class="b-actions"><button v-for="a in actions" :key="a" class="b-button" :class="{ danger: a === 'reject' }" :disabled="busy" :loading="busy" @click="act(a)">{{ labels[a] }}</button></view><button class="b-button secondary" :disabled="busy" @click="refresh">刷新预约状态</button></view>
        </view>
        <view v-else class="b-panel"><text>预约暂时不可读取。</text><button class="b-button secondary" :disabled="busy" @click="refresh">重新加载</button></view>
      </template>
    </template>
  </RoleShell>
</template>
<style scoped src="./shared/workflow.css"></style>

