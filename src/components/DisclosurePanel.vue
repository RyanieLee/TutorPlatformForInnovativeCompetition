<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ title:string }>()
const expanded=ref(false)
</script>
<template><view class="disclosure"><button class="disclosure-toggle" :aria-expanded="expanded" @click="expanded=!expanded"><text>{{title}}</text><text aria-hidden="true">{{expanded?'收起 −':'展开 ＋'}}</text></button><view v-if="expanded" class="disclosure-content"><slot/></view></view></template>
<style scoped>.disclosure{width:100%;margin:16px 0;border:1px solid #cde4eb;border-radius:18px;background:#f8fdffde;overflow:hidden}.disclosure-toggle{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;margin:0;background:transparent;color:#275970;padding:14px 20px;line-height:1.6;font-size:16px}.disclosure-toggle text:last-child{font-size:14px;color:#358389;flex-shrink:0}.disclosure-content{padding:4px 20px 20px}.disclosure-toggle:focus-visible{outline:3px solid #208c91;outline-offset:-4px}@media print{.disclosure{display:none}}</style>
