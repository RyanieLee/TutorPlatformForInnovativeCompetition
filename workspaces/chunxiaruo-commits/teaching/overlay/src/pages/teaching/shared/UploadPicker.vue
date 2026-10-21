<script setup lang="ts">
import {ref,computed,watch,onBeforeUnmount} from 'vue'
import {teachingService} from '../../../services/teaching'
import {errorMessage} from '../../../services/errors'
import type {AttachmentDto,AttachmentPurpose,SelectedFile} from '../../../types/teaching'
import {selectFiles,validateSelected,formatSize} from './files'
import {teachingIdentity} from './page'
const props=defineProps<{lessonId:string;purpose:AttachmentPurpose;modelValue:AttachmentDto[];disabled?:boolean;label:string}>()
const emit=defineEmits<{(e:'update:modelValue',value:AttachmentDto[]):void;(e:'status',value:{busy:boolean;allReady:boolean;count:number}):void}>()
interface Row{key:string;file?:SelectedFile;attachment?:AttachmentDto;progress:number;error:string;uploading:boolean;removing?:boolean;removeError?:string;abort?:()=>void}
const rows=ref<Row[]>(props.modelValue.map(a=>({key:a.id,attachment:a,progress:100,error:'',uploading:false}))),message=ref('')
let alive=true
const uploading=computed(()=>rows.value.some(r=>r.uploading||r.removing))
watch(()=>rows.value.map(r=>[r.uploading,r.removing,r.attachment?.id,r.error,r.removeError]),()=>emit('status',{busy:uploading.value,allReady:rows.value.every(r=>Boolean(r.attachment)&&!r.removeError),count:rows.value.length}),{immediate:true,deep:true})
const update=()=>emit('update:modelValue',rows.value.flatMap(r=>r.attachment?[r.attachment]:[]))
function release(row:Row){row.abort?.();if(row.file?.path.startsWith('blob:'))URL.revokeObjectURL(row.file.path)}
function dispose(){alive=false;rows.value.forEach(release)}
onBeforeUnmount(dispose)
watch(teachingIdentity,()=>{rows.value.forEach(release);rows.value=[];update()},{flush:'sync'})
async function send(row:Row){
 if(!row.file||props.disabled||row.uploading)return
 row.error='';row.uploading=true
 const key=teachingIdentity()
 try{const job=teachingService.uploadAttachment(props.lessonId,props.purpose,row.file,n=>{if(alive&&key===teachingIdentity())row.progress=n});row.abort=job.abort;const data=await job.promise;if(alive&&key===teachingIdentity()&&rows.value.includes(row)){row.attachment=data;row.progress=100;update()}}
 catch(e){if(alive&&key===teachingIdentity())row.error=errorMessage(e)}
 finally{row.uploading=false;row.abort=undefined}
}
async function choose(){
 if(props.disabled||uploading.value)return
 message.value=''
 try{const selected=await selectFiles(5-rows.value.length);if(!alive)return;validateSelected(selected,rows.value.length);for(const file of selected){const row:Row={key:Date.now()+':'+Math.random(),file,progress:0,error:'',uploading:false};rows.value.push(row);await send(rows.value[rows.value.length-1])}}
 catch(e){message.value=errorMessage(e)}
}
async function remove(row:Row){
 if(props.disabled||row.uploading||row.removing)return
 const key=teachingIdentity();row.removeError='';row.removing=true
 try{
  if(row.attachment)await teachingService.discardAttachment(row.attachment.id)
  if(alive&&key===teachingIdentity()){release(row);rows.value=rows.value.filter(r=>r.key!==row.key);update()}
 }catch(e){if(alive&&key===teachingIdentity())row.removeError=errorMessage(e)}
 finally{row.removing=false}
}
</script>
<template>
 <view class="t-upload" :data-purpose="purpose">
  <view class="t-upload-head"><text class="t-label">{{label}}</text><text class="t-muted">{{rows.length}} / 5 个文件</text></view>
  <text class="t-muted">支持 JPG、PNG、WebP、PDF、DOCX、PPTX；每个不超过20 MiB。</text>
  <view v-for="row in rows" :key="row.key" class="t-upload-row">
   <view class="t-grow"><text class="t-filename">{{row.attachment?.originalName||row.file?.name}}</text><text class="t-muted">{{formatSize(row.attachment?.size||row.file?.size||0)}} · {{row.uploading?'上传中 '+row.progress+'%':row.attachment?'已上传，等待发布或提交':'尚未上传成功'}}</text><text v-if="row.error||row.removeError" class="t-error">{{row.removeError||row.error}}</text></view>
   <button v-if="row.error" role="button" class="t-btn secondary small" :disabled="disabled||uploading" @click="send(row)">重试上传</button>
   <button role="button" class="t-btn plain small" :disabled="disabled||row.uploading||row.removing" @click="remove(row)">{{row.removing?'移除中':row.removeError?'重试移除':'移除'}}</button>
  </view>
  <view v-if="message" class="t-error" role="alert">{{message}}</view>
  <button role="button" class="t-btn secondary" :disabled="disabled||uploading||rows.length>=5" @click="choose">选择{{label}}</button>
 </view>
</template>
<style scoped src="./teaching.css"></style>

