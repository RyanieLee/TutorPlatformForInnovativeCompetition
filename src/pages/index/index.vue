<script setup lang="ts">
import ParentLayout from '../../components/ParentLayout.vue'
import LessonFlip from '../../components/LessonFlip.vue'
const find=()=>uni.navigateTo({url:'/pages/tutors/index'})
const learning=()=>uni.navigateTo({url:'/pages/learning/index'})
</script>
<template><ParentLayout title="AI辅助学习 · 大学生家教服务" active="home"><view class="home-page">
<view class="home-hero"><view class="home-copy"><text class="section-kicker">领航云学堂 · 让优质教育更容易遇见</text><text class="home-title">找到合适的老师，<br/>让每一次学习都有方向。</text><text class="home-description">从学习需求到家教匹配，从知识练习到课后反馈。<br/>把学习的每一步，清楚地连接起来。</text><view class="home-actions"><button class="main-action" @click="find">开始找家教 →</button><button class="secondary-action" @click="learning">进入 AI 学习中心 →</button></view><text class="home-note">先选择你要做的事，其余设置随步骤展开。</text></view><view class="home-lesson"><text class="lesson-section-label">一题一解 · 看见学习的过程</text><LessonFlip/></view></view>
<view class="journey-heading"><text class="section-kicker">一条清晰的学习服务链</text><text class="section-heading">找老师、学知识、看成长</text></view>
<view class="journey-grid"><view class="journey-card"><text class="journey-number">01</text><text class="journey-title">找到合适的老师</text><text>智能推荐或自主筛选，查看照片、资料与匹配理由。</text><text class="journey-location">从「找家教」开始</text></view><view class="journey-card"><text class="journey-number">02</text><text class="journey-title">围绕知识点学习</text><text>看笔记、问小书灵、做练习，把问题带给老师。</text><text class="journey-location">在「AI学习中心」体验</text></view><view class="journey-card"><text class="journey-number">03</text><text class="journey-title">跟进教学与反馈</text><text>在预约中查看教学计划、课次作业与老师确认的反馈。</text><text class="journey-location">到「我的学习」查看</text></view></view>
</view></ParentLayout></template>