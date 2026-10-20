<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import RoleShell from './shared/RoleShell.vue'
import AsyncState from './shared/AsyncState.vue'
import { useRolePage, formatTime } from './shared/page'
import { businessService } from '../../services/business'
import { bookingStatusLabels, reviewStatusLabels } from '../../services/rules'
import type { BookingOrder, BookingStatus } from '../../types/tutor'
import type { TutorApplication } from '../../types/business'
const application = ref<TutorApplication | null>(null), bookings = ref<BookingOrder[]>([])
const filter = ref<BookingStatus | 'all'>('all')
const { ready, error, authorized, load } = useRolePage('tutor', () => { application.value = null; bookings.value = []; filter.value = 'all' })
const filters: { value: BookingStatus | 'all'; label: string }[] = [{value:'all',label:'全部'}, {value:'pending',label:'待确认'}, {value:'accepted',label:'已接受'}, {value:'completed',label:'已完成'}, {value:'rejected',label:'已拒绝'}, {value:'cancelled',label:'已取消'}]
const visible = computed(() => filter.value === 'all' ? bookings.value : bookings.value.filter(b => b.status === filter.value))
const pendingCount = computed(() => bookings.value.filter(b => b.status === 'pending').length)
const acceptedCount = computed(() => bookings.value.filter(b => b.status === 'accepted').length)
const refresh = () => { void load(async user => { const [a,b] = await Promise.all([businessService.getMyApplication(user), businessService.listTutorBookings(user)]); return { a,b } }, data => { application.value = data.a; bookings.value = data.b }) }
onShow(refresh)
const edit = () => uni.navigateTo({ url: '/pages/tutor/application' })
const open = (id: string) => uni.navigateTo({ url: '/pages/tutor/booking-detail?id=' + encodeURIComponent(id) })
</script>
<template>
  <RoleShell title="家教工作台" role="tutor">
    <template v-if="authorized">
      <AsyncState v-if="!ready" state="loading" message="正在读取家教工作台…" />
      <AsyncState v-else-if="error" state="error" :message="error" @retry="refresh" />
      <template v-else>
        <view class="b-toolbar"><text class="b-muted">管理入驻资料与收到的演示预约</text><button class="b-button secondary" @click="refresh">刷新工作台</button></view>
        <view class="b-grid">
          <view class="b-panel">
            <view class="b-section">我的入驻资料</view><text class="b-status">{{ application ? reviewStatusLabels[application.status] : '未申请' }}</text>
            <view class="b-row"><text>展示称呼</text><text>{{ application?.displayName || '尚未填写' }}</text></view>
            <view class="b-row"><text>学校 / 专业</text><text>{{ application ? application.university + ' · ' + application.major : '尚未填写' }}</text></view>
            <view v-if="application?.rejectionReason" class="b-reason">拒绝原因：{{ application.rejectionReason }}</view>
            <view class="b-actions"><button class="b-button" @click="edit">{{ application?.status === 'pending' ? '查看审核状态' : '查看 / 编辑资料' }}</button></view>
          </view>
          <view class="b-panel"><view class="b-section">预约概况</view><view class="b-row"><text>待家教确认</text><text>{{ pendingCount }} 条</text></view><view class="b-row"><text>已接受待完成</text><text>{{ acceptedCount }} 条</text></view><view class="b-row"><text>本次加载记录</text><text>{{ bookings.length }} 条</text></view><text class="b-muted">页面重新进入或点击刷新后读取最新状态；无实时消息通知。</text><text v-if="bookings.length >= 100" class="b-muted">已达到单次返回上限，列表可能不完整。</text></view>
        </view>
        <view class="b-panel">
          <view class="b-section">收到的预约</view>
          <view class="b-chips"><button v-for="f in filters" :key="f.value" class="b-chip" :class="{ active: filter === f.value }" @click="filter = f.value">{{ f.label }}</button></view>
          <AsyncState v-if="!visible.length" state="empty" message="当前分类暂无预约，可切换其他状态或稍后刷新。" />
          <view v-for="b in visible" :key="b.id" class="b-card">
            <view class="b-card-head"><text>{{ b.subject }} · {{ b.studentName }}</text><text class="b-status">{{ bookingStatusLabels[b.status] }}</text></view>
            <text class="b-muted">期望时间：{{ b.expectedTime }}</text><text class="b-muted">创建时间：{{ formatTime(b.createdAt) }}</text>
            <button class="b-button secondary" @click="open(b.id)">查看预约详情</button>
          </view>
        </view>
      </template>
    </template>
  </RoleShell>
</template>
<style scoped src="./shared/workflow.css"></style>

