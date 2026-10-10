<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import type {BookingOrder} from '../../types/tutor'
import {listBookings,cancelBooking} from '../../utils/bookings'
const bookings=ref<BookingOrder[]>([])
onShow(()=>{bookings.value=listBookings()})
function cancel(id:string){uni.showModal({title:'取消预约',content:'将本地演示预约标记为已取消？',success(r){if(r.confirm){cancelBooking(id);bookings.value=listBookings()}}})}
</script>
<template><view class="page"><view class="title">我的预约</view><view class="notice">仅本地演示记录，不会同步其他设备，也没有真实老师接单。</view><view v-if="!bookings.length" class="empty"><text>暂无预约记录</text><button @click="uni.redirectTo({url:'/pages/index/index'})">去找家教</button></view><view v-for="b in bookings" :key="b.id" class="card"><view class="head"><text>{{b.tutorName}}</text><text class="status">{{b.status}}</text></view><view class="line">辅导科目：{{b.subject}}</view><view class="line">期望时间：{{b.expectedTime}}</view><view class="line">预约称呼：{{b.studentName}}</view><view class="line">创建时间：{{b.createdAt}}</view><text v-if="b.status==='待沟通'" class="cancel" @click="cancel(b.id)">取消预约</text></view><view class="home" @click="uni.redirectTo({url:'/pages/index/index'})">← 返回首页</view></view></template>
<style scoped>.page{padding:28rpx}.title{font-size:36rpx;font-weight:800;margin-bottom:20rpx}.notice{background:#fff3dd;color:#946c38;padding:20rpx;border-radius:14rpx;font-size:23rpx;line-height:1.7}.card,.empty{background:#fff;border-radius:20rpx;padding:28rpx;margin-top:22rpx}.head{display:flex;justify-content:space-between;font-weight:700;font-size:29rpx;border-bottom:1rpx solid #eef1f5;padding-bottom:15rpx}.status{font-size:23rpx;color:#2868e4}.line{font-size:24rpx;color:#596a82;margin-top:15rpx}.cancel{display:block;text-align:right;color:#d65b54;margin-top:25rpx}.empty{text-align:center;color:#8c96a8}.empty button{margin-top:30rpx;background:#2868e4;color:#fff}.home{text-align:center;margin-top:35rpx;color:#2868e4}</style>
