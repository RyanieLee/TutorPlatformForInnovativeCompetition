<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ParentLayout from '../../components/ParentLayout.vue'
import TutorDirectory from '../../components/TutorDirectory.vue'
const mode=ref<'match'|'browse'>('match')
const directory=ref<{refresh:()=>void}|null>(null)
onShow(()=>{void directory.value?.refresh()})
function match(){uni.navigateTo({url:'/pages/match/index'})}
</script>
<template><ParentLayout title="找家教 · 选择适合你的方式" active="find"><view class="finder-page"><view class="section-hero"><text class="section-kicker">找到合适的学习伙伴</text><text class="section-heading">你想怎样找到老师？</text><text class="section-description">让平台帮你推荐，或按自己的条件浏览。</text></view><view class="mode-tabs"><button :class="{selected:mode==='match'}" @click="mode='match'">智能匹配</button><button :class="{selected:mode==='browse'}" @click="mode='browse'">自主选老师</button></view><view v-if="mode==='match'" class="finder-intro"><text class="section-heading">说清需求，看懂推荐理由</text><text class="section-description">选择学科、预算和授课方式，比较老师资料与匹配得分。</text><view class="mini-flow"><text>01 填写需求</text><text>02 查看推荐</text><text>03 了解老师并预约</text></view><button class="main-action" @click="match">填写需求，开始匹配 →</button></view><TutorDirectory v-else ref="directory"/></view></ParentLayout></template>

