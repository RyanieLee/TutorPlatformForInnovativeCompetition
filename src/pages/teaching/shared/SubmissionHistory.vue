<script setup lang="ts">
import type {SubmissionDto} from '../../../types/teaching'
import AttachmentList from './AttachmentList.vue'
import {formatTime} from './page'
defineProps<{submissions:SubmissionDto[];total:number;busy?:boolean}>()
defineEmits<{(e:'more'):void}>()
</script>
<template>
 <view class="t-section-head"><view><view class="t-section-title">作业提交记录</view><text class="t-muted">每次重新提交均保留为独立版本</text></view><text class="t-badge" :class="{muted:!total}">{{total?'已提交 · '+total+' 个版本':'未提交'}}</text></view>
 <view v-if="!total" class="t-empty">暂未收到作业，提交后会显示在这里。</view>
 <view v-for="submission in submissions" :key="submission.id" class="t-history">
  <view class="t-section-head"><text class="t-label">第 {{submission.revision}} 版</text><text class="t-badge" :class="{late:submission.late}">{{submission.late?'逾期提交':'已提交'}}</text></view>
  <text class="t-muted">{{formatTime(submission.submittedAt)}}</text><view v-if="submission.note" class="t-content">{{submission.note}}</view>
  <AttachmentList :files="submission.attachments"/>
 </view>
 <button v-if="submissions.length<total" role="button" class="t-btn secondary" :disabled="busy" @click="$emit('more')">加载更多提交记录</button>
</template>
<style scoped src="./teaching.css"></style>
