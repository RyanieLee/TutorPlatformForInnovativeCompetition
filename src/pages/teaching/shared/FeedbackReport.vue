<script setup lang="ts">
import {ref,watch} from 'vue'
import type {Feedback} from '../../../services/teaching-loop'
import {formatTime} from './page'
const props=defineProps<{value:Feedback;disabled?:boolean;editable?:boolean}>()
const emit=defineEmits<{(e:'edit',report:string):void;(e:'publish'):void}>()
const report=ref(props.value.report)
watch(()=>props.value,v=>{report.value=v.report})
</script>
<template>
 <view class="t-card" data-testid="feedback-card"><view class="t-section-title">课后反馈 · {{value.correct}}/{{value.total}}（{{value.percent}}%）</view>
  <view class="t-note">{{value.source==='preset'?'预置演示样例（非实时生成）':value.source==='model'?'模型生成，教师审核':'教师编辑'}} · {{value.status==='published'?'教师已确认发布':'候选草稿，家长不可见'}} · {{formatTime(value.createdAt)}} · {{value.promptVersion}}</view>
  <view v-for="group in (['strengths','consolidation','next'] as const)" :key="group" class="group"><view class="t-label">{{group==='strengths'?'有限证据下的已观察优势':group==='consolidation'?'待巩固知识点':'下一课建议'}}</view><view v-for="(point,i) in value[group]" :key="i"><view class="t-content">{{point.text}}</view><view class="t-muted">依据：{{point.evidenceRefs.map(r=>r==='teacher-observation'?'教师观察':r).join('、')}}</view></view></view>
  <view class="t-field"><text>家长版短报告</text><textarea v-if="editable&&value.status==='draft'" v-model="report" :disabled="disabled" :maxlength="2000"/><view v-else class="t-content">{{value.report}}</view></view>
  <view v-if="editable&&value.status==='draft'" class="t-actions"><button role="button" class="t-btn secondary" :disabled="disabled||report===value.report" @click="emit('edit',report)">保存报告修改</button><button role="button" data-testid="publish-feedback" class="t-btn" :disabled="disabled||report!==value.report" @click="emit('publish')">确认发布课后反馈</button></view>
 </view>
</template>
<style scoped src="./teaching.css"></style>
<style scoped>.group{margin:20px 0}.t-content{white-space:pre-wrap;overflow-wrap:anywhere}textarea{width:100%;box-sizing:border-box;min-height:150px}</style>
