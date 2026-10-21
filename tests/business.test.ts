import { describe, expect, it } from 'vitest'
import { MockBusinessService } from '../src/services/mock/business'
import { MemoryStorage } from '../src/services/mock/storage'
import { validateTutorApplication } from '../src/services/rules'
import type { User } from '../src/types/auth'
import type { TutorApplicationInput } from '../src/types/business'
import { LEGACY_BOOKINGS_KEY } from '../src/utils/bookings'
import { hasRole } from '../src/services/auth'

const parent: User = { id: 'demo-parent', displayName: '演示家长', role: 'parent' }
const otherParent: User = { id: 'another-parent', displayName: '其他家长', role: 'parent' }
const tutor: User = { id: 'demo-tutor', displayName: '演示家教', role: 'tutor' }
const otherTutor: User = { id: 'another-tutor', displayName: '其他家教', role: 'tutor' }
const admin: User = { id: 'demo-admin', displayName: '演示管理员', role: 'admin' }
const input: TutorApplicationInput = {
  displayName: '演示老师', university: '示例大学', major: '数学', subjects: ['数学'],
  teachingMode: '均可', area: '大学城', pricePerHour: 80,
  introduction: '擅长数学基础梳理与错题讲解。', availability: '周末下午'
}
const bookingInput = { tutorId: 't001', tutorName: '小林老师', studentName: '测试同学',
  contact: '13800138000', subject: '数学', expectedTime: '周六下午', note: '' }
const service = () => new MockBusinessService(new MemoryStorage())

describe('申请与审核', () => {
  it('统一角色判断只接受允许的角色', () => {
    expect(hasRole('parent', ['parent'])).toBe(true)
    expect(hasRole('tutor', ['parent'])).toBe(false)
    expect(hasRole(undefined, ['admin'])).toBe(false)
  })
  it('允许不完整草稿，但提交必须通过表单校验', async () => {
    const api = service()
    const draft = await api.saveApplicationDraft(tutor, { ...input, university: '' })
    expect(draft.status).toBe('draft')
    expect(() => validateTutorApplication({ ...input, university: '' })).toThrow()
    await expect(api.submitApplication(tutor, { ...input, university: '' })).rejects.toMatchObject({ code: 'INVALID' })
  })
  it('审核只处理待审核申请，拒绝须有原因，结果可由家教查看', async () => {
    const api = service()
    const submitted = await api.submitApplication(tutor, input)
    await expect(api.submitApplication(tutor, input)).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(api.reviewApplication(admin, submitted.id, 'rejected')).rejects.toMatchObject({ code: 'INVALID' })
    const rejected = await api.reviewApplication(admin, submitted.id, 'rejected', '资料需补充')
    expect((await api.getMyApplication(tutor))?.rejectionReason).toBe('资料需补充')
    expect(rejected.status).toBe('rejected')
    await expect(api.reviewApplication(admin, submitted.id, 'approved')).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(api.listApplications(parent)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('通过审核后更新演示家教展示资料', async () => {
    const api = service()
    const submitted = await api.submitApplication(tutor, input)
    await api.reviewApplication(admin, submitted.id, 'approved')
    expect((await api.getTutor('t001'))?.name).toBe('演示老师')
  })
  it('资料撤回、待审和驳回时不再公开旧资料，重新通过审核后恢复', async () => {
    const api = service()
    expect(await api.getTutor('t001')).not.toBeNull()
    const submitted = await api.submitApplication(tutor, input)
    expect(await api.getTutor('t001')).toBeNull()
    await api.reviewApplication(admin, submitted.id, 'approved')
    expect((await api.getTutor('t001'))?.name).toBe(input.displayName)
    await api.saveApplicationDraft(tutor, { ...input, displayName: '修改后的老师' })
    expect(await api.getTutor('t001')).toBeNull()
    await expect(api.createBooking(parent, bookingInput)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await api.submitApplication(tutor, { ...input, displayName: '修改后的老师' })
    await api.reviewApplication(admin, submitted.id, 'rejected', '请补充资料')
    expect(await api.getTutor('t001')).toBeNull()
    await api.submitApplication(tutor, { ...input, displayName: '修改后的老师' })
    await api.reviewApplication(admin, submitted.id, 'approved')
    expect((await api.getTutor('t001'))?.name).toBe('修改后的老师')
  })
  it('被拒后可修改并重新提交，其他家教不能读取申请', async () => {
    const api = service()
    const submitted = await api.submitApplication(tutor, input)
    await api.reviewApplication(admin, submitted.id, 'rejected', '请补充介绍')
    expect(await api.getMyApplication(otherTutor)).toBeNull()
    const draft = await api.saveApplicationDraft(tutor, { ...input, introduction: '修改后重新提交的数学教学介绍。' })
    expect(draft.status).toBe('draft')
    expect((await api.submitApplication(tutor, { ...input, introduction: '修改后重新提交的数学教学介绍。' })).status).toBe('pending')
  })
})

describe('预约状态与隔离', () => {
  it('家长创建后只见自己的记录，指定家教能接受并完成', async () => {
    const api = service()
    const booking = await api.createBooking(parent, bookingInput)
    expect((await api.listParentBookings(otherParent))).toHaveLength(0)
    expect((await api.listTutorBookings(otherTutor))).toHaveLength(0)
    expect((await api.listTutorBookings(tutor))).toHaveLength(1)
    await expect(api.transitionBooking(otherParent, booking.id, 'cancel')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(api.transitionBooking(parent, booking.id, 'accept')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(api.transitionBooking(otherTutor, booking.id, 'accept')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect((await api.transitionBooking(tutor, booking.id, 'accept')).status).toBe('accepted')
    expect((await api.transitionBooking(tutor, booking.id, 'complete')).status).toBe('completed')
    await expect(api.transitionBooking(tutor, booking.id, 'complete')).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('拒绝、取消与重复操作遵守状态机', async () => {
    const api = service()
    const rejected = await api.createBooking(parent, bookingInput)
    expect((await api.transitionBooking(tutor, rejected.id, 'reject')).status).toBe('rejected')
    await expect(api.transitionBooking(parent, rejected.id, 'cancel')).rejects.toMatchObject({ code: 'CONFLICT' })
    const cancelled = await api.createBooking(parent, bookingInput)
    expect((await api.transitionBooking(parent, cancelled.id, 'cancel')).status).toBe('cancelled')
    await expect(api.transitionBooking(parent, cancelled.id, 'cancel')).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('兼容旧预约且保留原键；新操作写入 v2', async () => {
    const storage = new MemoryStorage()
    storage.set(LEGACY_BOOKINGS_KEY, [{ ...bookingInput, id: 'old-1', createdAt: '2026-01-01', status: '待沟通' }])
    const api = new MockBusinessService(storage)
    expect((await api.listParentBookings(parent))[0].status).toBe('pending')
    await api.transitionBooking(parent, 'old-1', 'cancel')
    expect((storage.get(LEGACY_BOOKINGS_KEY) as { status: string }[])[0].status).toBe('待沟通')
    expect((await api.listParentBookings(parent))[0].status).toBe('cancelled')
  })
  it('格式损坏时报告错误并保留原数据', async () => {
    const storage = new MemoryStorage()
    storage.set(LEGACY_BOOKINGS_KEY, [{ id: 'broken' }])
    const api = new MockBusinessService(storage)
    await expect(api.listParentBookings(parent)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(storage.get(LEGACY_BOOKINGS_KEY)).toEqual([{ id: 'broken' }])
  })
})

describe('举报', () => {
  it('家长提交后仅管理员可查看和标记处理', async () => {
    const api = service()
    const report = await api.createReport(parent, 't001', '资料不实', '演示说明')
    await expect(api.listReports(tutor)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect((await api.listReports(admin))[0].id).toBe(report.id)
    expect((await api.resolveReport(admin, report.id)).status).toBe('resolved')
    await expect(api.resolveReport(admin, report.id)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})


describe('授课方式与分页组合', () => {
  it('线上/线下都包含均可，并在过滤后分页', async () => {
    const s=service()
    const online=await s.listTutors({subject:'数学',teachingMode:'线上'})
    const offline=await s.listTutors({subject:'数学',teachingMode:'线下'})
    expect(online.map(t=>t.id)).toEqual(expect.arrayContaining(['t001','t005','t006']))
    expect(offline.map(t=>t.id)).toEqual(expect.arrayContaining(['t001','t003','t005']))
    expect(online.every(t=>t.subjects.includes('数学')&&t.teachingMode!=='线下')).toBe(true)
    expect(offline.every(t=>t.subjects.includes('数学')&&t.teachingMode!=='线上')).toBe(true)
    expect((await s.listTutors({subject:'数学',teachingMode:'线下',page:2,pageSize:1})).map(t=>t.id)).toEqual(['t003'])
    expect(await s.listTutors({keyword:'小何',subject:'数学',teachingMode:'线下'})).toEqual([])
  })
})

it('价格区间为包含边界，组合过滤在 Mock 分页之前执行',async()=>{
 const api=service()
 expect((await api.listTutors({minPrice:80,maxPrice:80})).map(t=>t.id)).toEqual(['t001'])
 expect((await api.listTutors({subject:'数学',minPrice:80,maxPrice:90,page:2,pageSize:1})).map(t=>t.id)).toEqual(['t003'])
 expect(await api.listTutors({maxPrice:60})).toEqual([])
})
