<script setup lang="ts">
defineProps<{ state: 'loading' | 'error' | 'empty'; message: string }>()
defineEmits<{ (e: 'retry'): void }>()
</script>
<template><view class="feedback" :class="state" role="status" aria-live="polite"><text class="symbol">{{ state === 'loading' ? '…' : state === 'error' ? '!' : '○' }}</text><text>{{ message }}</text><button v-if="state === 'error'" class="retry" @click="$emit('retry')">重新加载</button></view></template>
<style scoped>.feedback{background:#fff;border:1px solid #dfe5de;border-radius:16px;padding:32px 20px;display:flex;align-items:center;flex-direction:column;gap:14px;color:#61716a;text-align:center;line-height:1.7;overflow-wrap:anywhere}.symbol{font-size:28px;color:#61716a}.error{color:#ad3939;background:#fffafa}.retry{margin:0;font-size:14px;background:#edf3ed;color:#185448;border-radius:10px;line-height:2.8;padding:0 24px}</style>
