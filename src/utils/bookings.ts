import type { BookingInput, BookingOrder } from '../types/tutor'
const KEY = 'tutor-platform:demo-bookings:v1'
/** 仅本机演示，不会同步到服务器。 */
export function listBookings():BookingOrder[] { try { const v:unknown=uni.getStorageSync(KEY); return Array.isArray(v)?v as BookingOrder[]:[] } catch { return [] } }
export function createBooking(input:BookingInput):BookingOrder { const b:BookingOrder={...input,id:'demo-'+Date.now()+'-'+Math.floor(Math.random()*10000),createdAt:new Date().toLocaleString('zh-CN'),status:'待沟通'}; uni.setStorageSync(KEY,[b,...listBookings()]); return b }
export function cancelBooking(id:string):void { uni.setStorageSync(KEY,listBookings().map(b=>b.id===id?{...b,status:'已取消' as const}:b)) }
