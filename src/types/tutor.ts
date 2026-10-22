/** 展示用家教资料。真实资质与报价须由服务端审核。 */
export type TeachingMode = '线上' | '线下' | '均可'
export interface Tutor {
  id: string
  name: string
  university: string
  major: string
  subjects: string[]
  area: string
  pricePerHour: number
  teachingMode: TeachingMode
  introduction: string
  tags: string[]
  availability?: string
  /** Optional public portrait URL. Published only after the application is approved. */
  photoUrl?: string
  /** Self reported demo claims; missing fields never receive evidence points. */
  experienceMonths?: number | null
  academicScore?: number | null
  teachingSkillLevel?: number | null
  caseCount?: number | null
  caseSummary?: string
}

/** 保留原表单字段，便于旧页面和旧本机数据兼容。 */
export interface BookingInput {
  areaLabel?: string
  tutorId: string
  tutorName: string
  studentName: string
  contact: string
  subject: string
  expectedTime: string
  note: string
}
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'
export interface BookingOrder extends BookingInput {
  id: string
  parentId: string
  createdAt: string
  status: BookingStatus
  updatedAt: string
}
export interface LegacyBookingOrder extends BookingInput {
  id: string
  createdAt: string
  status: '待沟通' | '已取消'
}
