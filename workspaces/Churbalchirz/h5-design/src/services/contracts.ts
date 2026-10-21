import type { User } from '../types/auth'
import type { BookingInput, BookingOrder, Tutor } from '../types/tutor'
import type { ReportReason, TutorApplication, TutorApplicationInput, TutorReport } from '../types/business'
import type { BookingAction } from './rules'

export interface TutorQuery {
  keyword?: string
  subject?: string
  teachingMode?: '线上' | '线下'
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}

export interface BusinessService {
  listTutors(query?: TutorQuery): Promise<Tutor[]>
  getTutor(id: string): Promise<Tutor | null>

  getMyApplication(user: User): Promise<TutorApplication | null>
  saveApplicationDraft(user: User, input: TutorApplicationInput): Promise<TutorApplication>
  submitApplication(user: User, input: TutorApplicationInput): Promise<TutorApplication>
  listApplications(admin: User): Promise<TutorApplication[]>
  getApplication(admin: User, id: string): Promise<TutorApplication>
  reviewApplication(admin: User, id: string, decision: 'approved' | 'rejected', reason?: string): Promise<TutorApplication>

  createBooking(parent: User, input: BookingInput): Promise<BookingOrder>
  listParentBookings(parent: User): Promise<BookingOrder[]>
  listTutorBookings(tutor: User): Promise<BookingOrder[]>
  getTutorBooking(tutor: User, id: string): Promise<BookingOrder>
  transitionBooking(user: User, id: string, action: BookingAction): Promise<BookingOrder>

  createReport(parent: User, tutorId: string, reason: ReportReason, description: string): Promise<TutorReport>
  listReports(admin: User): Promise<TutorReport[]>
  resolveReport(admin: User, id: string): Promise<TutorReport>
}
