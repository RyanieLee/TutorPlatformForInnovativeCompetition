<script setup lang="ts">
import {ref,onBeforeUnmount,watch} from 'vue'
import type {AttachmentDto,DownloadedFile} from '../../../types/teaching'
import {teachingService} from '../../../services/teaching'
import {errorMessage} from '../../../services/errors'
import {saveDownload,formatSize} from './files'
import {teachingIdentity} from './page'
defineProps<{files:AttachmentDto[]}>()
const busy=ref(''),error=ref(''),preview=ref<DownloadedFile|null>(null)
const releases=new Set<()=>void>();let alive=true
function clear(){for(const release of releases)release();releases.clear();preview.value=null}
onBeforeUnmount(()=>{alive=false;clear()});watch(teachingIdentity,clear,{flush:'sync'})
function close(){preview.value?.dispose();if(preview.value)releases.delete(preview.value.dispose);preview.value=null}
async function open(file:AttachmentDto){
 if(busy.value)return
 busy.value=file.id;error.value='';const owner=teachingIdentity()
 try{const data=await teachingService.downloadAttachment(file);if(!alive||owner!==teachingIdentity()){data.dispose();return}releases.add(data.dispose);if(file.mediaType.startsWith('image/')){close();preview.value=data}else saveDownload(data)}
 catch(e){if(alive&&owner===teachingIdentity())error.value=errorMessage(e)}
 finally{busy.value=''}
}
</script>
<template>
 <view v-if="!files.length" class="t-muted">暂无附件</view>
 <view v-for="file in files" :key="file.id" class="t-file">
  <view class="t-grow"><text class="t-filename">{{file.originalName}}</text><text class="t-muted">{{formatSize(file.size)}}</text></view>
  <button role="button" class="t-btn secondary small" :disabled="Boolean(busy)" :loading="busy===file.id" :aria-label="(file.mediaType.startsWith('image/')?'查看 ':'下载 ')+file.originalName" @click="open(file)">{{file.mediaType.startsWith('image/')?'查看图片':'下载文件'}}</button>
 </view>
 <text v-if="error" class="t-error" role="alert">{{error}}</text>
 <view v-if="preview" class="t-preview" role="dialog" aria-label="作业图片预览">
  <view class="t-preview-head"><text>{{preview.name}}</text><button role="button" class="t-btn secondary small" @click="close">关闭预览</button></view>
  <image :src="preview.url" mode="widthFix" class="t-preview-image"/>
 </view>
</template>
<style scoped src="./teaching.css"></style>
