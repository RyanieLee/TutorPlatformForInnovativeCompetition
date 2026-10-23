<script setup lang="ts">
import {computed} from 'vue'
// #ifdef H5
import {renderAssistantRichText} from '../utils/assistant-rich-text'
import 'katex/dist/katex.min.css'
// #endif
const props=defineProps<{content:string}>()
const formatted=computed(()=>{
 let html=''
 // #ifdef H5
 html=renderAssistantRichText(props.content)
 // #endif
 return html
})
</script>
<template>
 <!-- #ifdef H5 -->
 <view class="assistant-rich-text" style="white-space:normal" v-html="formatted"/>
 <!-- #endif -->
 <!-- #ifndef H5 -->
 <text class="assistant-rich-text-plain" selectable>{{content}}</text>
 <!-- #endif -->
</template>
<style scoped>
/* #ifdef H5 */
.assistant-rich-text{font:inherit;line-height:1.8;white-space:normal;min-width:0;overflow-wrap:anywhere;color:inherit;user-select:text}.assistant-rich-text :deep(>*:first-child){margin-top:0}.assistant-rich-text :deep(>*:last-child){margin-bottom:0}.assistant-rich-text :deep(p){margin:0 0 .8em}.assistant-rich-text :deep(strong){font-weight:700}.assistant-rich-text :deep(h1),.assistant-rich-text :deep(h2),.assistant-rich-text :deep(h3),.assistant-rich-text :deep(h4){font-size:1.12em;line-height:1.55;font-weight:700;margin:1.25em 0 .55em}.assistant-rich-text :deep(ul),.assistant-rich-text :deep(ol){padding-left:1.6em;margin:.7em 0}.assistant-rich-text :deep(li){margin:.3em 0}.assistant-rich-text :deep(li>p){margin:.25em 0}.assistant-rich-text :deep(pre){max-width:100%;overflow:auto;padding:12px 14px;border:1px solid #a8bbb233;border-radius:10px;background:#294b3510;white-space:pre;line-height:1.6}.assistant-rich-text :deep(code){font-family:ui-monospace,Consolas,monospace;font-size:.9em;background:#294b3510;border-radius:4px;padding:.1em .3em}.assistant-rich-text :deep(pre code){background:none;padding:0}.assistant-rich-text :deep(blockquote){margin:.8em 0;padding:.1em .9em;border-left:3px solid #6b8e77;color:inherit;background:#294b3508}.assistant-rich-text :deep(table){display:block;max-width:100%;overflow:auto;border-collapse:collapse;font-size:.95em;margin:.8em 0}.assistant-rich-text :deep(th),.assistant-rich-text :deep(td){border:1px solid #a8bbb266;padding:7px 10px;min-width:70px}.assistant-rich-text :deep(th){font-weight:700;background:#294b3510}.assistant-rich-text :deep(a){color:inherit;text-decoration:underline;text-underline-offset:3px}.assistant-rich-text :deep(a:focus-visible){outline:2px solid currentColor;outline-offset:3px}.assistant-rich-text :deep(.katex){font-size:1.12em;white-space:nowrap}.assistant-rich-text :deep(p>.katex){display:inline-block;max-width:100%;overflow-x:auto;overflow-y:hidden;vertical-align:middle}.assistant-rich-text :deep(.katex-display){margin:.85em 0;padding:4px 0;overflow-x:auto;overflow-y:hidden;max-width:100%;text-align:left}.assistant-rich-text :deep(.katex-display>.katex){text-align:left}.assistant-rich-text :deep(.katex-error){font-family:ui-monospace,Consolas,monospace!important;font-size:.9em;white-space:pre-wrap;overflow-wrap:anywhere}.assistant-rich-text-plain{white-space:pre-wrap;line-height:1.8}
/* #endif */
.assistant-rich-text-plain{white-space:pre-wrap;line-height:1.8}
</style>
