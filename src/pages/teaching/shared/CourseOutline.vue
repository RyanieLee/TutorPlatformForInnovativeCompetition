<script setup lang="ts">
import {ref} from 'vue'
import type {Course} from '../../../services/teaching-loop'
const props=defineProps<{course:Course;editable?:boolean;disabled?:boolean}>()
const emit=defineEmits<{(e:'update:course',value:Course):void}>()
const selected=ref(0)
function change(path:(string|number)[],value:any){const next=JSON.parse(JSON.stringify(props.course));let target=next;for(const key of path.slice(0,-1))target=target[key];target[path.slice(-1)[0]!]=value;emit('update:course',next)}
const lines=(v:string)=>v.split('\n').map(s=>s.trim()).filter(Boolean)
function inputValue(event:unknown):string{const value=event as {detail?:{value?:string};target?:{value?:string}};return value.detail?.value??value.target?.value??''}
</script>
<template>
 <view class="t-card outline">
  <view class="t-section-title">{{course.grade}} · {{course.unit}}</view>
  <view class="t-note">{{course.student}} · 4节 × 45分钟。适配示例，教材版本与进度请教师核对。</view>
  <view class="t-field"><text>课程总体目标</text><textarea v-if="editable" :value="course.goal" :disabled="disabled" :maxlength="2000" @input="change(['goal'],inputValue($event))" @blur="change(['goal'],inputValue($event))"/><view v-else class="t-content">{{course.goal}}</view></view>
  <view class="t-content">先备条件：{{course.prerequisites}}</view>
  <view class="diagnostic"><text class="t-label">先备预诊断（5题）</text><view v-for="q in course.diagnostic" :key="q.id" class="question"><text>{{q.prompt}}</text><text class="answer">参考答案：{{q.answer}}；{{q.solution}}</text></view></view>
  <view class="lesson-tabs"><button v-for="(l,i) in course.lessons" :key="l.id" role="button" :data-testid="'lesson-tab-'+l.id" class="t-btn secondary" :class="{chosen:selected===i}" @click="selected=i">第{{i+1}}课</button></view>
  <template v-for="(l,i) in course.lessons" :key="l.id">
   <view v-show="selected===i" :data-testid="'course-'+l.id">
    <view class="t-section-title">第{{i+1}}课 · {{l.title}}</view>
    <view class="t-content">教学资源：{{l.resources.join('；')}}</view>
    <view class="t-field"><text>可检验学习目标</text><textarea v-if="editable" :value="l.goals.join('\n')" :disabled="disabled" :maxlength="2000" @input="change(['lessons',i,'goals'],lines(inputValue($event)))" @blur="change(['lessons',i,'goals'],lines(inputValue($event)))"/><view v-else v-for="g in l.goals" :key="g" class="t-content">· {{g}}</view></view>
    <view class="t-field"><text>知识点与重点难点</text><textarea v-if="editable" :value="l.knowledge.join('\n')" :disabled="disabled" @input="change(['lessons',i,'knowledge'],lines(inputValue($event)))" @blur="change(['lessons',i,'knowledge'],lines(inputValue($event)))"/><view v-else class="t-content">{{l.knowledge.join('；')}}</view></view>
    <view class="t-section-title small-title">45分钟教学安排（当前合计{{l.blocks.reduce((n,b)=>n+Number(b.minutes),0)}}分钟）</view>
    <view v-for="(block,j) in l.blocks" :key="block.id" class="block">
     <view class="duration"><text>环节{{j+1}}</text><input v-if="editable" type="number" :value="String(block.minutes)" :disabled="disabled" @input="change(['lessons',i,'blocks',j,'minutes'],Number(inputValue($event)))" @blur="change(['lessons',i,'blocks',j,'minutes'],Number(inputValue($event)))"/><text v-else>{{block.minutes}}</text><text>分钟</text></view>
     <view class="t-field"><text>教师活动</text><textarea v-if="editable" :value="block.teacher" :disabled="disabled" :maxlength="1500" @input="change(['lessons',i,'blocks',j,'teacher'],inputValue($event))" @blur="change(['lessons',i,'blocks',j,'teacher'],inputValue($event))"/><view v-else class="t-content">{{block.teacher}}</view></view>
     <view class="t-field"><text>学生活动</text><textarea v-if="editable" :value="block.student" :disabled="disabled" :maxlength="1500" @input="change(['lessons',i,'blocks',j,'student'],inputValue($event))" @blur="change(['lessons',i,'blocks',j,'student'],inputValue($event))"/><view v-else class="t-content">{{block.student}}</view></view>
    </view>
    <view v-for="group in (['examples','exercises'] as const)" :key="group">
     <view class="t-section-title small-title">{{group==='examples'?'例题与分步讲解':'独立练习与标准答案'}}</view>
     <view v-for="(q,j) in l[group]" :key="q.id" class="question"><text class="t-muted">{{q.id}}</text>
      <template v-if="editable"><view class="t-field"><text>题目</text><textarea :value="q.prompt" :disabled="disabled" :maxlength="1000" @input="change(['lessons',i,group,j,'prompt'],inputValue($event))" @blur="change(['lessons',i,group,j,'prompt'],inputValue($event))"/></view><view class="t-field"><text>标准答案</text><input :value="q.answer" :disabled="disabled" :maxlength="1000" @input="change(['lessons',i,group,j,'answer'],inputValue($event))" @blur="change(['lessons',i,group,j,'answer'],inputValue($event))"/></view><view class="t-field"><text>解析</text><textarea :value="q.solution" :disabled="disabled" :maxlength="1000" @input="change(['lessons',i,group,j,'solution'],inputValue($event))" @blur="change(['lessons',i,group,j,'solution'],inputValue($event))"/></view></template>

      <template v-else><view class="t-content">{{q.prompt}}</view><text class="answer">标准答案：{{q.answer}}；{{q.solution}}</text></template>

     </view>
    </view>
    <view class="t-field"><text>课后作业</text><textarea v-if="editable" :value="l.homework" :disabled="disabled" :maxlength="2000" @input="change(['lessons',i,'homework'],inputValue($event))" @blur="change(['lessons',i,'homework'],inputValue($event))"/><view v-else class="t-content">{{l.homework}}</view></view>
    <view class="t-field"><text>观察指标</text><textarea v-if="editable" :value="l.observe.join('\n')" :disabled="disabled" @input="change(['lessons',i,'observe'],lines(inputValue($event)))" @blur="change(['lessons',i,'observe'],lines(inputValue($event)))"/><view v-else class="t-content">{{l.observe.join('；')}}</view></view>
   </view>
  </template>

 </view>
</template>

<style scoped src="./teaching.css"></style>
<style scoped>
.outline{min-width:0}.lesson-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.lesson-tabs button{flex:1;min-width:62px;margin:0}.chosen{background:#285940!important;color:#fff!important}.block{padding:16px;background:#f2f5ef;border-radius:12px;margin:12px 0}.duration{display:flex;align-items:center;gap:10px;font-weight:700}.duration input{width:60px;background:#fff;border:1px solid #aeb9a8;padding:5px}.question{padding:14px 0;border-bottom:1px solid #dce3d7;overflow-wrap:anywhere}.answer{display:block;color:#376449;line-height:1.8;margin-top:6px}.small-title{font-size:18px;margin-top:24px}.diagnostic{margin-top:20px}textarea{width:100%;box-sizing:border-box;min-height:80px}input{width:100%;box-sizing:border-box}.t-content{white-space:pre-wrap}
</style>
