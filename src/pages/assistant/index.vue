<script setup lang="ts">
import AiCompanion from '../../components/AiCompanion.vue'
function back(){uni.navigateBack({fail:()=>uni.switchTab({url:'/pages/index/index'})})}
</script>
<template><view><button class="assistant-back" @click="back">← 返回平台</button><AiCompanion page/></view></template>
<style scoped>.assistant-back{margin:14px 18px 0;font-size:14px;background:#e7efe2;color:#345b3b;line-height:2.8;padding:0 16px;width:fit-content}</style>
