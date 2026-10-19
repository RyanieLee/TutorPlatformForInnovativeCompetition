<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import RoleShell from '../tutor/shared/RoleShell.vue'
import AsyncState from '../tutor/shared/AsyncState.vue'
import { useRolePage, identityKey, assertIdentity, confirmAction, isConflict, formatTime } from '../tutor/shared/page'
import { runConfirmedAction } from '../tutor/shared/operations'
import { groupApplications } from '../tutor/shared/admin'
import { currentSession, canAccess } from '../../utils/session'
import { businessService } from '../../services/business'
import { reviewStatusLabels } from '../../services/rules'
import { errorMessage } from '../../services/errors'
import type { TutorApplication, TutorReport, ReviewStatus, ReportStatus } from '../../types/business'
const applications = ref<TutorApplication[]>([]), reports = ref<TutorReport[]>([])
const appReady = ref(false), reportReady = ref(false), appError = ref(''), reportError = ref('')
const busyId = ref(''), feedback = ref('')
const applicationFilter = ref<ReviewStatus>('pending'), reportFilter = ref<ReportStatus>('open')
let latestApps = 0, latestReports = 0
const clear = () => { latestApps++; latestReports++; applications.value = []; reports.value = []; appError.value = ''; reportError.value = ''; feedback.value = ''; appReady.value = false; reportReady.value = false; applicationFilter.value = 'pending'; reportFilter.value = 'open' }
const { authorized, load, scope } = useRolePage('admin', clear)
watch(identityKey, () => { latestApps++; latestReports++ }, { flush: 'sync' })
onUnload(() => { latestApps++; latestReports++ })
onHide(() => { latestApps++; latestReports++ })
const groups = computed(() => groupApplications(applications.value))
const shownApplications = computed(() => groups.value[applicationFilter.value])
const shownReports = computed(() => reports.value.filter(r => r.status === reportFilter.value))
const applicationFilters: { value: ReviewStatus; label: string }[] = [{value:'pending',label:'待审核'}, {value:'approved',label:'已通过'}, {value:'rejected',label:'已拒绝'}, {value:'draft',label:'未提交草稿'}]
async function loadApps() {
  const version = ++latestApps, owner = identityKey(), user = currentSession.value?.user
  if (!user || !canAccess(['admin'])) return
  appReady.value = false; appError.value = ''
  try { const data = await businessService.listApplications(user); if (version === latestApps && identityKey() === owner) applications.value = data }
  catch (cause) { if (version === latestApps && identityKey() === owner) appError.value = errorMessage(cause) }
  finally { if (version === latestApps && identityKey() === owner) appReady.value = true }
}
async function loadReports() {
  const version = ++latestReports, owner = identityKey(), user = currentSession.value?.user
  if (!user || !canAccess(['admin'])) return
  reportReady.value = false; reportError.value = ''
  try { const data = await businessService.listReports(user); if (version === latestReports && identityKey() === owner) reports.value = data }
  catch (cause) { if (version === latestReports && identityKey() === owner) reportError.value = errorMessage(cause) }
  finally { if (version === latestReports && identityKey() === owner) reportReady.value = true }
}
function refresh() {
  if (busyId.value) return
  latestApps++; latestReports++
  void load(async () => { await Promise.all([loadApps(), loadReports()]); return true }, () => {})
}
onShow(refresh)
async function resolve(id: string) {
  const user = currentSession.value?.user, owner = identityKey()
  if (!user || busyId.value || !canAccess(['admin'])) return
  const operation = scope.begin()
  busyId.value = id; feedback.value = ''
  try {
    const result = await runConfirmedAction({ confirm: () => confirmAction('确认处理举报', '将此条演示举报标记为已处理，不会执行封禁或联系真实用户。是否继续？'), execute: () => { assertIdentity(owner); if (!operation.isCurrent()) throw new Error('操作已失效'); return businessService.resolveReport(user, id) } })
    if (result.kind === 'success' && operation.isCurrent()) { reports.value = reports.value.map(r => r.id === id ? result.value : r); feedback.value = '举报已标记为已处理。'; await loadReports() }
  } catch (cause) { if (operation.isCurrent()) { feedback.value = errorMessage(cause); if (isConflict(cause)) await loadReports() } }
  finally { busyId.value = '' }
}
const open = (id: string) => uni.navigateTo({ url: '/pages/admin/application-detail?id=' + encodeURIComponent(id) })
</script>
<template>
  <RoleShell title="管理员工作台" role="admin">
    <template v-if="authorized">
      <view class="b-toolbar"><text class="b-muted">申请审核与演示举报处理</text><button class="b-button secondary" :disabled="!!busyId" @click="refresh">刷新全部数据</button></view>
      <view v-if="feedback" class="b-info" role="status">{{ feedback }}</view>
      <view class="b-metrics"><view class="b-metric"><text class="b-muted">待审核申请</text><text class="b-number">{{ appReady && !appError ? groups.pending.length : '—' }}</text></view><view class="b-metric"><text class="b-muted">已通过申请</text><text class="b-number">{{ appReady && !appError ? groups.approved.length : '—' }}</text></view><view class="b-metric"><text class="b-muted">已拒绝申请</text><text class="b-number">{{ appReady && !appError ? groups.rejected.length : '—' }}</text></view><view class="b-metric"><text class="b-muted">待处理举报</text><text class="b-number">{{ reportReady && !reportError ? reports.filter(r => r.status === 'open').length : '—' }}</text></view><view class="b-metric"><text class="b-muted">已处理举报</text><text class="b-number">{{ reportReady && !reportError ? reports.filter(r => r.status === 'resolved').length : '—' }}</text></view></view>
      <view class="b-info">统计仅为本次加载记录，非全平台总量。开发服务最多返回 50 条申请、100 条举报。<text v-if="applications.length >= 50 || reports.length >= 100">当前已达到返回上限，记录可能不完整。</text></view>
      <view class="b-grid">
        <view class="b-panel"><view class="b-section">家教入驻审核</view>
          <view class="b-chips"><button v-for="f in applicationFilters" :key="f.value" class="b-chip" :class="{ active: applicationFilter === f.value }" @click="applicationFilter = f.value">{{ f.label }}</button></view>
          <AsyncState v-if="!appReady" state="loading" message="正在读取申请列表…" />
          <AsyncState v-else-if="appError" state="error" :message="appError" @retry="loadApps" />
          <AsyncState v-else-if="!shownApplications.length" state="empty" message="当前分类暂无申请。" />
          <template v-else><view v-for="a in shownApplications" :key="a.id" class="b-card"><view class="b-card-head"><text>{{ a.displayName || '未填写称呼' }}</text><text class="b-status">{{ reviewStatusLabels[a.status] }}</text></view><text class="b-muted">{{ a.university || '未填写学校' }} · {{ a.major || '未填写专业' }}</text><text class="b-muted">更新于 {{ formatTime(a.updatedAt) }}</text><text v-if="a.rejectionReason" class="b-muted">拒绝原因：{{ a.rejectionReason }}</text><button v-if="a.status !== 'draft'" class="b-button secondary" @click="open(a.id)">{{ a.status === 'pending' ? '查看并审核' : '查看审核结果' }}</button><text v-else class="b-muted">尚未提交，不能审核。</text></view></template>
        </view>
        <view class="b-panel"><view class="b-section">演示举报</view><view class="b-chips"><button class="b-chip" :class="{ active: reportFilter === 'open' }" @click="reportFilter = 'open'">待处理</button><button class="b-chip" :class="{ active: reportFilter === 'resolved' }" @click="reportFilter = 'resolved'">已处理</button></view>
          <AsyncState v-if="!reportReady" state="loading" message="正在读取举报列表…" />
          <AsyncState v-else-if="reportError" state="error" :message="reportError" @retry="loadReports" />
          <AsyncState v-else-if="!shownReports.length" state="empty" message="当前分类暂无举报。" />
          <template v-else><view v-for="r in shownReports" :key="r.id" class="b-card"><view class="b-card-head"><text>{{ r.reason }}</text><text class="b-status">{{ r.status === 'open' ? '待处理' : '已处理' }}</text></view><text class="b-muted">关联家教编号：{{ r.tutorId }}</text><view class="b-text">{{ r.description || '未填写补充说明。' }}</view><text class="b-muted">创建于 {{ formatTime(r.createdAt) }}</text><button v-if="r.status === 'open'" class="b-button secondary" :disabled="!!busyId" :loading="busyId === r.id" @click="resolve(r.id)">标记已处理</button></view></template>
        </view>
      </view>
    </template>
  </RoleShell>
</template>
<style scoped src="../tutor/shared/workflow.css"></style>

