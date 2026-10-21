<script setup lang="ts">
import {reactive,computed} from 'vue'
import type {CourseLesson,RecordInput} from '../../../services/teaching-loop'
const props=defineProps<{lesson:CourseLesson;version:number;disabled:boolean}>()
const emit=defineEmits<{(e:'save',value:RecordInput):void}>()
const form=reactive({date:'2026-10-22',completed:'',goalMet:'部分达成',errorTypes:'',observation:'',questions:'',consolidation:'',answers:{} as Record<string,boolean|undefined>})
const correct=computed(()=>Object.values(form.answers).filter(v=>v===true).length)
const filled=computed(()=>props.lesson.exercises.every(q=>typeof form.answers[q.id]==='boolean'))
function sample(){Object.assign(form,{completed:'完成合并同类项与移项；完成5道分层练习和订正',goalMet:'部分达成',errorTypes:'移项符号',observation:'题4/5在负号与移项步骤出现符号错误；能够完成简单合并同类项。下一课应强化−2x、−4x相关变形。',questions:'带负号的项移到另一边时应如何变形？',consolidation:'带负号移项与负系数变形'});form.answers=Object.fromEntries(props.lesson.exercises.map((q,i)=>[q.id,i<3]))}
function save(){emit('save',{planVersion:props.version,lessonId:props.lesson.id,date:form.date,completed:form.completed,goalMet:form.goalMet,results:props.lesson.exercises.map(q=>({questionId:q.id,correct:form.answers[q.id]!})),errorTypes:form.errorTypes.split(/[，,；;\n]/).map(x=>x.trim()).filter(Boolean),observation:form.observation,questions:form.questions,consolidation:form.consolidation})}
</script>
<template>
 <view class="t-card"><view class="t-section-title">第二课 · 课堂事实记录</view><view class="t-note">只录入观察到的事实。演示使用匿名案例，请勿填写真实学生姓名、联系方式或学校班级。</view>
  <view class="t-note">记录依据：已发布v{{version}}的题目与答案。未发布草稿的改题不会影响本表。</view>
  <button role="button" class="t-btn secondary" :disabled="disabled" data-testid="fill-class-sample" @click="sample">填入虚构演示记录（3/5）</button>
  <view class="t-field"><text>实际授课日期</text><input v-model="form.date" :disabled="disabled" placeholder="YYYY-MM-DD"/></view>
  <view class="t-field"><text>完成内容</text><textarea v-model="form.completed" :disabled="disabled" :maxlength="2000"/></view>
  <view class="t-field"><text>目标达成情况</text><input v-model="form.goalMet" :disabled="disabled" :maxlength="100"/></view>
  <view v-for="q in lesson.exercises" :key="q.id" class="record-question"><text>{{q.id}} · {{q.prompt}}</text><text class="t-muted">标准答案：{{q.answer}}；{{q.solution}}</text><view class="t-actions"><button role="button" class="t-btn secondary small" :class="{selected:form.answers[q.id]===true}" :disabled="disabled" @click="form.answers[q.id]=true">答对</button><button role="button" class="t-btn secondary small" :class="{selected:form.answers[q.id]===false}" :disabled="disabled" @click="form.answers[q.id]=false">答错</button></view></view>
  <view class="t-feedback">当前已标记{{Object.keys(form.answers).length}}题，正确{{correct}}题{{filled?'，正确率'+Math.round(correct/lesson.exercises.length*100)+'%':''}}</view>
  <view class="t-field"><text>错因类别（逗号分隔）</text><input v-model="form.errorTypes" :disabled="disabled" placeholder="例如：移项符号" :maxlength="200"/></view>
  <view class="t-field"><text>教师观察</text><textarea v-model="form.observation" :disabled="disabled" :maxlength="2000"/></view>
  <view class="t-field"><text>学生提问或理解困难</text><textarea v-model="form.questions" :disabled="disabled" :maxlength="2000"/></view>
  <view class="t-field"><text>需巩固知识点</text><textarea v-model="form.consolidation" :disabled="disabled" :maxlength="2000"/></view>
  <button role="button" class="t-btn" data-testid="save-class-record" :disabled="disabled||!filled" @click="save">保存课堂事实</button>
 </view>
</template>
<style scoped src="./teaching.css"></style>
<style scoped>.record-question{padding:16px 0;border-bottom:1px solid #dde5d7}.record-question>text{display:block;margin-bottom:8px;overflow-wrap:anywhere}.selected{background:#285940!important;color:white!important}textarea{width:100%;box-sizing:border-box;min-height:80px}</style>
