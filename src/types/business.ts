import type { TeachingMode } from './tutor'

export type ReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export interface TutorApplicationInput {
  displayName: string
  university: string
  major: string
  subjects: string[]
  teachingMode: TeachingMode
  area: string
  pricePerHour: number
  introduction: string
  availability: string
}
export interface TutorApplication extends TutorApplicationInput {
  id: string
  userId: string
  status: ReviewStatus
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  rejectionReason?: string
}

export type ReportReason = '资料不实' | '内容不当' | '其他'
export type ReportStatus = 'open' | 'resolved'
export interface TutorReport {
  id: string
  reporterId: string
  tutorId: string
  reason: ReportReason
  description: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
}
