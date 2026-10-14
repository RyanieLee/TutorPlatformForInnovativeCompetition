import type { BookingStatus } from '../types/tutor'
import type { TutorApplicationInput } from '../types/business'
import { BusinessError } from './errors'

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: '待家教确认', accepted: '家教已接受', rejected: '家教已拒绝',
  cancelled: '预约已取消', completed: '预约已完成'
}
export type BookingAction = 'accept' | 'reject' | 'cancel' | 'complete'
const transitions: Record<BookingStatus, Partial<Record<BookingAction, BookingStatus>>> = {
  pending: { accept: 'accepted', reject: 'rejected', cancel: 'cancelled' },
  accepted: { cancel: 'cancelled', complete: 'completed' },
  rejected: {}, cancelled: {}, completed: {}
}
export function nextBookingStatus(current: BookingStatus, action: BookingAction): BookingStatus {
  const next = transitions[current]?.[action]
  if (!next) throw new BusinessError('CONFLICT', '当前预约状态不能执行此操作')
  return next
}
export const reviewStatusLabels = {
  draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已拒绝'
} as const
/** 提交时校验；草稿允许不完整。返回首个可直接显示的错误。 */
export function validateTutorApplication(input: TutorApplicationInput): void {
  if (!input.displayName.trim() || input.displayName.trim().length > 20) throw new BusinessError('INVALID', '请填写 1–20 字的展示称呼')
  if (!input.university.trim() || input.university.trim().length > 40) throw new BusinessError('INVALID', '请填写学校（最多 40 字）')
  if (!input.major.trim() || input.major.trim().length > 40) throw new BusinessError('INVALID', '请填写专业（最多 40 字）')
  if (input.subjects.length === 0 || input.subjects.length > 6) throw new BusinessError('INVALID', '请选择 1–6 个擅长科目')
  if (!['线上', '线下', '均可'].includes(input.teachingMode)) throw new BusinessError('INVALID', '请选择授课方式')
  if (!input.area.trim() || input.area.trim().length > 40) throw new BusinessError('INVALID', '请填写服务地区（最多 40 字）')
  if (!Number.isFinite(input.pricePerHour) || input.pricePerHour < 1 || input.pricePerHour > 1000) throw new BusinessError('INVALID', '参考价格应为 1–1000 元/小时')
  if (!input.availability.trim() || input.availability.trim().length > 100) throw new BusinessError('INVALID', '请填写可授课时间（最多 100 字）')
  if (input.introduction.trim().length < 10 || input.introduction.trim().length > 500) throw new BusinessError('INVALID', '个人介绍需 10–500 字')
}
