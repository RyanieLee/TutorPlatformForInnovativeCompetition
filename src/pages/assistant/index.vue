<script setup lang="ts">
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
const starter=ref<'match'|'guide'|''>('')
onLoad(options=>{if(options?.starter==='match'||options?.starter==='guide')starter.value=options.starter})
import AiCompanion from '../../components/AiCompanion.vue'
function back(){uni.navigateBack({fail:()=>uni.switchTab({url:'/pages/index/index'})})}
</script>
<template><view><button class="assistant-back" @click="back">← 返回平台</button><AiCompanion page :starter="starter"/></view></template>
<style scoped>.assistant-back{margin:14px 18px 0;font-size:14px;background:#e7efe2;color:#345b3b;line-height:2.8;padding:0 16px;width:fit-content}</style>
