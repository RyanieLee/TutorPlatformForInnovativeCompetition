import type { BookingInput, LegacyBookingOrder } from '../types/tutor'
/** V0.1/V0.2 存储键只用于兼容读取；新页面使用业务服务。 */
export const LEGACY_BOOKINGS_KEY = 'tutor-platform:demo-bookings:v1'
/** @deprecated 供尚未迁移的调用方使用。 */
export function listBookings(): LegacyBookingOrder[] { try { const v: unknown = uni.getStorageSync(LEGACY_BOOKINGS_KEY); return Array.isArray(v) ? v as LegacyBookingOrder[] : [] } catch { return [] } }
/** @deprecated 新调用方使用 businessService.createBooking。 */
export function createBooking(input: BookingInput): LegacyBookingOrder { const b: LegacyBookingOrder = { ...input, id: 'demo-' + Date.now() + '-' + Math.floor(Math.random() * 10000), createdAt: new Date().toLocaleString('zh-CN'), status: '待沟通' }; uni.setStorageSync(LEGACY_BOOKINGS_KEY, [b, ...listBookings()]); return b }
/** @deprecated 新调用方使用 businessService.transitionBooking。 */
export function cancelBooking(id: string): void { uni.setStorageSync(LEGACY_BOOKINGS_KEY, listBookings().map(b => b.id === id ? { ...b, status: '已取消' as const } : b)) }
