<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import type {BookingOrder} from '../../types/tutor'
import {listBookings,cancelBooking} from '../../utils/bookings'
import {canAccess,currentSession,restoreSession} from '../../utils/session'
const bookings=ref<BookingOrder[]>([])
const ready=ref(false)
onShow(async()=>{await restoreSession();bookings.value=canAccess(['parent'])?listBookings():[];ready.value=true})
const goLogin=()=>uni.navigateTo({url:'/pages/auth/login'})
const goProfile=()=>uni.switchTab({url:'/pages/profile/index'})
const goHome=()=>uni.switchTab({url:'/pages/index/index'})
function cancel(id:string){if(!canAccess(['parent']))return;uni.showModal({title:'取消预约',content:'将本地演示预约标记为已取消？',success(r){if(r.confirm){try{cancelBooking(id);bookings.value=listBookings()}catch{uni.showToast({title:'取消失败，请重试',icon:'none'})}}}})}
</script>
<template><view class="page"><view class="title">我的预约</view><view class="notice">仅本地演示记录，不会同步其他设备，也没有真实老师接单。</view><view v-if="!ready" class="surface-card empty-state">正在读取演示身份…</view><view v-else-if="!currentSession" class="surface-card empty-state"><text>登录后查看演示预约</text><button class="primary-button guide" @click="goLogin">进入演示登录</button></view><view v-else-if="!canAccess(['parent'])" class="surface-card empty-state"><text>当前身份不能查看家长预约</text><view class="muted-note">可在“我的”退出并切换为学生/家长。</view><button class="secondary-button guide" @click="goProfile">前往我的</button></view><template v-else><view v-if="!bookings.length" class="surface-card empty-state"><text>暂无预约记录</text><button class="primary-button guide" @click="goHome">去找家教</button></view><view v-for="b in bookings" :key="b.id" class="card"><view class="head"><text>{{b.tutorName}}</text><text class="status">{{b.status}}</text></view><view class="line">辅导科目：{{b.subject}}</view><view class="line">期望时间：{{b.expectedTime}}</view><view class="line">预约称呼：{{b.studentName}}</view><view class="line">创建时间：{{b.createdAt}}</view><text v-if="b.status==='待沟通'" class="cancel" @click="cancel(b.id)">取消预约</text></view></template></view></template>
<style scoped>.page{padding:28rpx}.title{font-size:36rpx;font-weight:800;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-top:22rpx}.head{display:flex;justify-content:space-between;font-weight:700;font-size:29rpx;border-bottom:1rpx solid #eef1f5;padding-bottom:15rpx}.status{font-size:23rpx;color:#2868e4}.line{font-size:24rpx;color:#596a82;margin-top:15rpx}.cancel{display:block;text-align:right;color:#d65b54;margin-top:25rpx}.surface-card{margin-top:22rpx}.guide{margin-top:28rpx}</style>
