<script setup lang="ts">
import {computed,reactive,ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {findTutor} from '../../mocks/tutors'
import {createBooking} from '../../utils/bookings'
import type {Tutor} from '../../types/tutor'
const tutor=ref<Tutor|undefined>()
const form=reactive({studentName:'',contact:'',subject:'',expectedTime:'',note:''})
const subjects=computed(()=>tutor.value?.subjects??[])
const subjectIndex=computed(()=>Math.max(0,subjects.value.indexOf(form.subject)))
onLoad(options=>{tutor.value=findTutor(String(options?.tutorId??''));form.subject=tutor.value?.subjects[0]??''})
function changeSubject(event:{detail:{value:string|number}}){form.subject=subjects.value[Number(event.detail.value)]??''}
function submit(){if(!tutor.value)return;if(!form.studentName.trim()||!form.contact.trim()||!form.expectedTime.trim()){uni.showToast({title:'请填写必填项',icon:'none'});return}if(!/^1\d{10}$/.test(form.contact.trim())){uni.showToast({title:'请填写11位演示手机号格式',icon:'none'});return}try{createBooking({...form,tutorId:tutor.value.id,tutorName:tutor.value.name});uni.showToast({title:'已保存演示预约',icon:'success'});uni.redirectTo({url:'/pages/orders/index'})}catch{uni.showToast({title:'保存失败，请重试',icon:'none'})}}
</script>
<template><view class="page" v-if="tutor"><view class="notice">仅保存在当前设备，不会通知老师。请勿填写真实私人信息。</view><view class="panel"><view class="title">预约 {{tutor.name}}</view><view class="field"><text>称呼 *</text><input v-model="form.studentName" maxlength="20" placeholder="例如：测试同学"/></view><view class="field"><text>联系电话 *</text><input v-model="form.contact" type="number" maxlength="11" placeholder="11位演示数字"/></view><view class="field"><text>辅导科目</text><picker :range="subjects" :value="subjectIndex" @change="changeSubject"><view class="input">{{form.subject}} ⌄</view></picker></view><view class="field"><text>期望时间 *</text><input v-model="form.expectedTime" maxlength="40" placeholder="例如：周六下午2点"/></view><view class="field"><text>辅导需求</text><textarea v-model="form.note" maxlength="200" placeholder="例如：初二数学基础巩固"/></view></view><button class="button" @click="submit">保存演示预约</button></view><view v-else class="page">家教信息不存在。</view></template>
<style scoped>.page{padding:26rpx}.notice{background:#fff3dd;color:#946c38;padding:22rpx;border-radius:15rpx;font-size:24rpx;line-height:1.7}.panel{background:#fff;padding:28rpx;border-radius:20rpx;margin:24rpx 0}.title{font-size:32rpx;font-weight:700}.field{display:flex;flex-direction:column;margin-top:25rpx;gap:13rpx;font-size:26rpx}.field input,.input,.field textarea{background:#fbfcfe;border:1rpx solid #e5eaf2;border-radius:12rpx;padding:18rpx;min-height:80rpx;width:100%;font-size:26rpx}.field textarea{min-height:120rpx}.button{background:#2868e4;color:#fff;border-radius:15rpx}</style>
