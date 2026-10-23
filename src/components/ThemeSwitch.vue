<script setup lang="ts">
import {appearance,setAppearance} from '../utils/appearance'
</script>
<template>
 <!-- #ifdef H5 -->
 <view class="appearance-switch" role="group" aria-label="网页外观">
  <button role="button" tabindex="0" :aria-pressed="appearance==='green'" :class="{selected:appearance==='green'}" @click="setAppearance('green')" @keydown.enter.prevent="setAppearance('green')" @keydown.space.prevent="setAppearance('green')">绿色玻璃</button>
  <button role="button" tabindex="0" :aria-pressed="appearance==='jenny'" :class="{selected:appearance==='jenny'}" @click="setAppearance('jenny')" @keydown.enter.prevent="setAppearance('jenny')" @keydown.space.prevent="setAppearance('jenny')">Jenny 浅蓝</button>
 </view>
 <!-- #endif -->
</template>
<style scoped>
.appearance-switch{display:inline-flex;flex-shrink:0;align-items:center;gap:4px;padding:3px;border:1px solid #a8bab2;border-radius:14px;background:#ffffffd9;backdrop-filter:blur(12px);color:#304f3b}.appearance-switch button{margin:0!important;min-height:44px!important;line-height:20px!important;padding:12px 10px!important;border:0!important;box-shadow:none!important;border-radius:10px!important;background:transparent!important;color:#3d5948!important;font-size:12px!important;font-weight:500!important;white-space:nowrap}.appearance-switch button.selected{background:#2b573d!important;color:#fff!important}.appearance-switch button:focus-visible{outline:3px solid #315b40!important;outline-offset:2px}
</style>
