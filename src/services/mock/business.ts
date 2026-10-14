import { tutors as seedTutors } from '../../mocks/tutors'
import type { User, UserRole } from '../../types/auth'
import type { BookingInput, BookingOrder, BookingStatus, LegacyBookingOrder, Tutor } from '../../types/tutor'
import type { ReportReason, TutorApplication, TutorApplicationInput, TutorReport } from '../../types/business'
import { LEGACY_BOOKINGS_KEY } from '../../utils/bookings'
import type { BusinessService } from '../contracts'
import { BusinessError } from '../errors'
import { nextBookingStatus, validateTutorApplication, type BookingAction } from '../rules'
import type { StoragePort } from './storage'

const APPLICATIONS_KEY = 'tutor-platform:demo-applications:v1'
const BOOKINGS_KEY = 'tutor-platform:demo-bookings:v2'
const REPORTS_KEY = 'tutor-platform:demo-reports:v1'
const bookingStatuses: BookingStatus[] = ['pending', 'accepted', 'rejected', 'cancelled', 'completed']

function requireRole(user: User, role: UserRole): void {
  if (!user?.id) throw new BusinessError('UNAUTHORIZED', '请先进入演示身份')
  if (user.role !== role) throw new BusinessError('FORBIDDEN', '当前身份不能执行此操作')
}
function uid(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
function now(): string { return new Date().toISOString() }
function cleanInput(input: TutorApplicationInput): TutorApplicationInput {
  const price = Number(input.pricePerHour)
  return {
    displayName: input.displayName.trim(), university: input.university.trim(), major: input.major.trim(),
    subjects: [...new Set(input.subjects.map(s => s.trim()).filter(Boolean))],
    teachingMode: input.teachingMode, area: input.area.trim(), pricePerHour: Number.isFinite(price) ? price : 0,
    introduction: input.introduction.trim(), availability: input.availability.trim()
  }
}
function isLegacyBooking(value: unknown): value is LegacyBookingOrder {
  if (!value || typeof value !== 'object') return false
  const b = value as Partial<LegacyBookingOrder>
  return typeof b.id === 'string' && typeof b.tutorId === 'string' && typeof b.tutorName === 'string' &&
    typeof b.studentName === 'string' && typeof b.contact === 'string' && typeof b.subject === 'string' &&
    typeof b.expectedTime === 'string' && typeof b.note === 'string' && typeof b.createdAt === 'string' &&
    (b.status === '待沟通' || b.status === '已取消')
}
function isBooking(value: unknown): value is BookingOrder {
  if (!value || typeof value !== 'object') return false
  const b = value as Partial<BookingOrder>
  return typeof b.id === 'string' && typeof b.parentId === 'string' && typeof b.tutorId === 'string' &&
    typeof b.tutorName === 'string' && typeof b.studentName === 'string' && typeof b.contact === 'string' &&
    typeof b.subject === 'string' && typeof b.expectedTime === 'string' && typeof b.note === 'string' &&
    typeof b.createdAt === 'string' && typeof b.updatedAt === 'string' && bookingStatuses.includes(b.status as BookingStatus)
}
function isApplication(value: unknown): value is TutorApplication {
  if (!value || typeof value !== 'object') return false
  const a = value as Partial<TutorApplication>
  return typeof a.id === 'string' && typeof a.userId === 'string' &&
    ['draft', 'pending', 'approved', 'rejected'].includes(a.status ?? '') &&
    typeof a.displayName === 'string' && typeof a.university === 'string' && typeof a.major === 'string' &&
    Array.isArray(a.subjects) && a.subjects.every(s => typeof s === 'string') &&
    ['线上', '线下', '均可'].includes(a.teachingMode ?? '') && typeof a.area === 'string' &&
    typeof a.pricePerHour === 'number' && typeof a.introduction === 'string' &&
    typeof a.availability === 'string' && typeof a.createdAt === 'string' && typeof a.updatedAt === 'string'
}
function isReport(value: unknown): value is TutorReport {
  if (!value || typeof value !== 'object') return false
  const r = value as Partial<TutorReport>
  return typeof r.id === 'string' && typeof r.reporterId === 'string' && typeof r.tutorId === 'string' &&
    ['资料不实', '内容不当', '其他'].includes(r.reason ?? '') && typeof r.description === 'string' &&
    ['open', 'resolved'].includes(r.status ?? '') && typeof r.createdAt === 'string' && typeof r.updatedAt === 'string'
}

/** 只负责本机演示；传入的角色可被客户端篡改，不能作为安全鉴权。 */
export class MockBusinessService implements BusinessService {
  constructor(private readonly storage: StoragePort) {}

  private readArray<T>(key: string, guard: (value: unknown) => value is T): T[] | null {
    const raw = this.storage.get(key)
    if (raw == null) return null
    if (!Array.isArray(raw) || !raw.every(guard)) throw new BusinessError('STORAGE', '本机演示数据格式异常，原数据已保留')
    return raw
  }
  private applications(): TutorApplication[] {
    return this.readArray(APPLICATIONS_KEY, isApplication) ?? []
  }
  private bookings(): BookingOrder[] {
    const current = this.readArray(BOOKINGS_KEY, isBooking)
    if (current) return current
    const legacy = this.readArray(LEGACY_BOOKINGS_KEY, isLegacyBooking) ?? []
    return legacy.map(b => ({ ...b, parentId: 'demo-parent', updatedAt: b.createdAt,
      status: b.status === '已取消' ? 'cancelled' as const : 'pending' as const }))
  }
  private reports(): TutorReport[] {
    return this.readArray(REPORTS_KEY, isReport) ?? []
  }

  async listTutors(query: { keyword?: string; subject?: string } = {}): Promise<Tutor[]> {
    const approved = this.applications().find(a => a.userId === 'demo-tutor' && a.status === 'approved')
    const list = seedTutors.map(t => t.id === 't001' && approved ? {
      ...t, name: approved.displayName, university: approved.university, major: approved.major,
      subjects: [...approved.subjects], teachingMode: approved.teachingMode, area: approved.area,
      pricePerHour: approved.pricePerHour, introduction: approved.introduction, availability: approved.availability
    } : { ...t, subjects: [...t.subjects], tags: [...t.tags] })
    const keyword = query.keyword?.trim().toLowerCase() ?? ''
    return list.filter(t => (!query.subject || query.subject === '全部' || t.subjects.includes(query.subject)) &&
      [t.name, t.university, t.area, ...t.subjects, ...t.tags].join(' ').toLowerCase().includes(keyword))
  }
  async getTutor(id: string): Promise<Tutor | null> { return (await this.listTutors()).find(t => t.id === id) ?? null }

  async getMyApplication(user: User): Promise<TutorApplication | null> {
    requireRole(user, 'tutor')
    return this.applications().find(a => a.userId === user.id) ?? null
  }
  async saveApplicationDraft(user: User, input: TutorApplicationInput): Promise<TutorApplication> {
    requireRole(user, 'tutor')
    const records = this.applications()
    const previous = records.find(a => a.userId === user.id)
    if (previous?.status === 'pending') throw new BusinessError('CONFLICT', '申请正在审核，暂不能修改')
    const timestamp = now()
    const draft: TutorApplication = { ...cleanInput(input), id: previous?.id ?? uid('application'), userId: user.id,
      status: 'draft', createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp }
    this.storage.set(APPLICATIONS_KEY, [draft, ...records.filter(a => a.userId !== user.id)])
    return draft
  }
  async submitApplication(user: User, input: TutorApplicationInput): Promise<TutorApplication> {
    requireRole(user, 'tutor')
    const cleaned = cleanInput(input)
    validateTutorApplication(cleaned)
    const records = this.applications()
    const previous = records.find(a => a.userId === user.id)
    if (previous?.status === 'pending') throw new BusinessError('CONFLICT', '申请已提交，请等待审核')
    const timestamp = now()
    const application: TutorApplication = { ...cleaned, id: previous?.id ?? uid('application'), userId: user.id,
      status: 'pending', createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp }
    this.storage.set(APPLICATIONS_KEY, [application, ...records.filter(a => a.userId !== user.id)])
    return application
  }
  async listApplications(admin: User): Promise<TutorApplication[]> {
    requireRole(admin, 'admin')
    return this.applications().filter(a => a.status !== 'draft')
  }
  async getApplication(admin: User, id: string): Promise<TutorApplication> {
    requireRole(admin, 'admin')
    const found = this.applications().find(a => a.id === id && a.status !== 'draft')
    if (!found) throw new BusinessError('NOT_FOUND', '未找到申请')
    return found
  }
  async reviewApplication(admin: User, id: string, decision: 'approved' | 'rejected', reason = ''): Promise<TutorApplication> {
    requireRole(admin, 'admin')
    const records = this.applications()
    const target = records.find(a => a.id === id)
    if (!target) throw new BusinessError('NOT_FOUND', '未找到申请')
    if (target.status !== 'pending') throw new BusinessError('CONFLICT', '该申请已处理或尚未提交')
    if (decision === 'rejected' && (!reason.trim() || reason.trim().length > 200)) throw new BusinessError('INVALID', '请填写 1–200 字的拒绝原因')
    const updated: TutorApplication = { ...target, status: decision, reviewedAt: now(), updatedAt: now(),
      rejectionReason: decision === 'rejected' ? reason.trim() : undefined }
    this.storage.set(APPLICATIONS_KEY, records.map(a => a.id === id ? updated : a))
    return updated
  }

  async createBooking(parent: User, input: BookingInput): Promise<BookingOrder> {
    requireRole(parent, 'parent')
    const tutor = await this.getTutor(input.tutorId)
    if (!tutor) throw new BusinessError('NOT_FOUND', '家教信息不存在')
    if (!tutor.subjects.includes(input.subject)) throw new BusinessError('INVALID', '辅导科目与家教资料不匹配')
    if (!input.studentName.trim() || !/^1\d{10}$/.test(input.contact.trim()) || !input.expectedTime.trim())
      throw new BusinessError('INVALID', '请填写称呼、11 位演示联系号码和期望时间')
    const timestamp = now()
    const booking: BookingOrder = { ...input, tutorName: tutor.name, studentName: input.studentName.trim(),
      contact: input.contact.trim(), expectedTime: input.expectedTime.trim(), note: input.note.trim(),
      id: uid('booking'), parentId: parent.id, createdAt: timestamp, updatedAt: timestamp, status: 'pending' }
    this.storage.set(BOOKINGS_KEY, [booking, ...this.bookings()])
    return booking
  }
  async listParentBookings(parent: User): Promise<BookingOrder[]> {
    requireRole(parent, 'parent')
    return this.bookings().filter(b => b.parentId === parent.id)
  }
  async listTutorBookings(tutor: User): Promise<BookingOrder[]> {
    requireRole(tutor, 'tutor')
    return this.bookings().filter(b => this.ownsTutor(tutor, b.tutorId))
  }
  async getTutorBooking(tutor: User, id: string): Promise<BookingOrder> {
    requireRole(tutor, 'tutor')
    const booking = this.bookings().find(b => b.id === id && this.ownsTutor(tutor, b.tutorId))
    if (!booking) throw new BusinessError('NOT_FOUND', '未找到预约')
    return booking
  }
  private ownsTutor(user: User, tutorId: string): boolean { return user.id === 'demo-tutor' && tutorId === 't001' }
  async transitionBooking(user: User, id: string, action: BookingAction): Promise<BookingOrder> {
    const records = this.bookings()
    const booking = records.find(b => b.id === id)
    if (!booking) throw new BusinessError('NOT_FOUND', '未找到预约')
    if (action === 'cancel') {
      requireRole(user, 'parent')
      if (booking.parentId !== user.id) throw new BusinessError('FORBIDDEN', '只能取消自己的预约')
    } else {
      requireRole(user, 'tutor')
      if (!this.ownsTutor(user, booking.tutorId)) throw new BusinessError('FORBIDDEN', '只能处理分配给自己的预约')
    }
    const updated: BookingOrder = { ...booking, status: nextBookingStatus(booking.status, action), updatedAt: now() }
    this.storage.set(BOOKINGS_KEY, records.map(b => b.id === id ? updated : b))
    return updated
  }

  async createReport(parent: User, tutorId: string, reason: ReportReason, description: string): Promise<TutorReport> {
    requireRole(parent, 'parent')
    if (!(await this.getTutor(tutorId))) throw new BusinessError('NOT_FOUND', '家教信息不存在')
    if (!['资料不实', '内容不当', '其他'].includes(reason) || description.trim().length > 200)
      throw new BusinessError('INVALID', '请选择原因，说明最多 200 字')
    const timestamp = now()
    const report: TutorReport = { id: uid('report'), reporterId: parent.id, tutorId, reason,
      description: description.trim(), status: 'open', createdAt: timestamp, updatedAt: timestamp }
    this.storage.set(REPORTS_KEY, [report, ...this.reports()])
    return report
  }
  async listReports(admin: User): Promise<TutorReport[]> { requireRole(admin, 'admin'); return this.reports() }
  async resolveReport(admin: User, id: string): Promise<TutorReport> {
    requireRole(admin, 'admin')
    const records = this.reports()
    const target = records.find(r => r.id === id)
    if (!target) throw new BusinessError('NOT_FOUND', '未找到举报')
    if (target.status !== 'open') throw new BusinessError('CONFLICT', '该举报已处理')
    const updated: TutorReport = { ...target, status: 'resolved', updatedAt: now() }
    this.storage.set(REPORTS_KEY, records.map(r => r.id === id ? updated : r))
    return updated
  }
}
