<script setup lang="ts">
import type {Suggestion,CourseLesson} from '../../../services/teaching-loop'
defineProps<{suggestion:Suggestion;original:CourseLesson;disabled:boolean}>()
defineEmits<{(e:'accept'):void;(e:'reject'):void}>()
</script>
<template>
 <view class="t-card"><view class="t-section-title">第三课修订对比</view><view class="t-note">{{suggestion.source==='model'?'模型建议':'预置演示建议（非实时生成）'}} · {{suggestion.status==='pending'?'待教师确认':suggestion.status==='applied'?'已采纳为草稿，发布后家长可见':'已拒绝，保留原版'}}</view>
  <view class="t-content">调整理由：{{suggestion.why}}</view><view class="t-muted">证据：{{suggestion.evidenceRefs.map(r=>r==='teacher-observation'?'教师观察':r).join('、')}}</view>
  <view class="compare"><view><view class="t-section-title">原版 v{{suggestion.baseVersion}}</view><view v-for="b in original.blocks" :key="b.id" class="old-block">{{b.minutes}}分钟 · {{b.teacher}}</view></view><view><view class="t-section-title">建议安排 · 仍为45分钟</view><view v-for="b in suggestion.course.lessons[2].blocks" :key="b.id" class="new-block">{{b.minutes}}分钟 · {{b.teacher}}</view></view></view>
  <view v-for="(change,i) in suggestion.changes" :key="i" class="change"><text>原安排：{{change.originalBlock}}</text><text>建议：{{change.proposedBlock}}</text><text>时长变化：{{change.durationDelta>0?'+':''}}{{change.durationDelta}}分钟；{{change.why}}</text><text class="t-muted">依据：{{change.evidenceRefs.map(r=>r==='teacher-observation'?'教师观察':r).join('、')}}</text></view>
  <view v-if="suggestion.status==='pending'" class="t-actions"><button role="button" class="t-btn" :disabled="disabled" data-testid="accept-revision" @click="$emit('accept')">确认采纳，生成新草稿</button><button role="button" class="t-btn secondary" :disabled="disabled" @click="$emit('reject')">拒绝建议，保留原版</button></view>
 </view>
</template>
<style scoped src="./teaching.css"></style>
<style scoped>.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0}.old-block,.new-block{padding:12px;margin:8px 0;border-radius:8px;line-height:1.8;overflow-wrap:anywhere}.old-block{background:#f7efe5}.new-block{background:#e9f3e9}.change{border-top:1px solid #dde5d7;padding:14px 0}.change text{display:block;line-height:1.8;overflow-wrap:anywhere}@media(max-width:680px){.compare{grid-template-columns:1fr}}</style>
