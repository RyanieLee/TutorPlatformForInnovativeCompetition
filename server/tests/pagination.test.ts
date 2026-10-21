import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'
import { newToken, tokenHash } from '../src/core'

const db = new PrismaClient()
const app = buildApp(db)
const tokens: Record<string, string> = {}
const stamp = new Date('2100-01-01T00:00:00Z')
const fields = { displayName: '虚构分页资料', university: '示例大学', major: '数学', subjectsJson: '["数学"]', teachingMode: '线上', area: '示例地区', pricePerHour: 80, introduction: '仅用于分页自动化验证的虚构资料', availability: '周末' }
const padded = (i: number) => String(i).padStart(3, '0')
let applicationTotal = 0, reportTotal = 0

beforeAll(async () => {
  await app.ready()
  applicationTotal = await db.tutorApplication.count() + 55
  reportTotal = await db.report.count() + 105
  for (const role of ['parent', 'tutor', 'admin', 'foreign-parent', 'foreign-tutor']) {
    const id = `pagination-${role}`
    await db.user.create({ data: { id, loginId: id, displayName: '虚构分页账户', role: role.replace('foreign-', ''), passwordHash: 'unused-test-hash' } })
    tokens[role] = newToken()
    await db.session.create({ data: { userId: id, tokenHash: tokenHash(tokens[role]), expiresAt: new Date(Date.now() + 3600000) } })
  }
  for (const role of ['tutor', 'foreign-tutor']) {
    await db.tutorProfile.create({ data: { ...fields, id: `pagination-profile-${role}`, userId: `pagination-${role}` } })
  }
  await db.user.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ id: `pagination-app-user-${i}`, loginId: `pagination-app-user-${i}`, displayName: '虚构申请账户', role: 'tutor', passwordHash: 'unused-test-hash' })) })
  await db.tutorApplication.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ ...fields, id: `pagination-app-${padded(i)}`, userId: `pagination-app-user-${i}`, updatedAt: stamp })) })
  await db.booking.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ id: `pagination-booking-${padded(i)}`, parentId: 'pagination-parent', tutorProfileId: 'pagination-profile-tutor', studentName: '虚构同学', subject: '数学', expectedTime: '周末', createdAt: stamp })) })
  await db.booking.create({ data: { id: 'pagination-foreign-booking', parentId: 'pagination-foreign-parent', tutorProfileId: 'pagination-profile-foreign-tutor', studentName: '其他账户虚构同学', subject: '数学', expectedTime: '周末', createdAt: stamp } })
  await db.report.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ id: `pagination-report-${padded(i)}`, reporterId: 'pagination-parent', tutorProfileId: 'pagination-profile-tutor', reason: '其他', createdAt: stamp })) })
})
afterAll(async () => { await app.close() })

const endpoints = [
  { url: '/api/bookings/mine', role: 'parent', defaultSize: 100, total: () => 105, prefix: 'pagination-booking-', count: 105 },
  { url: '/api/bookings/received', role: 'tutor', defaultSize: 100, total: () => 105, prefix: 'pagination-booking-', count: 105 },
  { url: '/api/admin/tutor-applications', role: 'admin', defaultSize: 50, total: () => applicationTotal, prefix: 'pagination-app-', count: 55 },
  { url: '/api/admin/reports', role: 'admin', defaultSize: 100, total: () => reportTotal, prefix: 'pagination-report-', count: 105 }
]
function get(url: string, role?: string) {
  return app.inject({ method: 'GET', url, headers: role ? { authorization: `Bearer ${tokens[role]}` } : {} })
}
describe.each(endpoints)('$url 分页和权限', endpoint => {
  it('保持默认条数，并返回受权限约束的总数', async () => {
    const response = await get(endpoint.url, endpoint.role)
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(endpoint.defaultSize)
    expect(response.json().meta).toEqual({ total: endpoint.total(), page: 1, pageSize: endpoint.defaultSize })
  })
  it('越过旧上限可查全部记录，同一时间戳按 ID 稳定排序且不重不漏', async () => {
    const ids: string[] = []
    for (let page = 1; page <= Math.ceil(endpoint.total() / 10); page++) {
      const response = await get(`${endpoint.url}?page=${page}&pageSize=10`, endpoint.role)
      expect(response.statusCode).toBe(200)
      expect(response.json().meta).toEqual({ total: endpoint.total(), page, pageSize: 10 })
      ids.push(...response.json().data.map((row: { id: string }) => row.id))
    }
    expect(ids).toHaveLength(endpoint.total())
    expect(new Set(ids).size).toBe(ids.length)
    const fixtures = Array.from({ length: endpoint.count }, (_, i) => `${endpoint.prefix}${padded(i)}`).reverse()
    expect(ids.slice(0, endpoint.count)).toEqual(fixtures)
    expect(ids).not.toContain('pagination-foreign-booking')
    const beyond = await get(`${endpoint.url}?page=100000&pageSize=100`, endpoint.role)
    expect(beyond.statusCode).toBe(200)
    expect(beyond.json().data).toEqual([])
    expect(beyond.json().meta.total).toBe(endpoint.total())
  })
  it('拒绝越界、非整数及重复分页参数', async () => {
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=100001', 'pageSize=0', 'pageSize=101', 'pageSize=2.5', 'pageSize=', 'page=1&page=2']) {
      const response = await get(`${endpoint.url}?${query}`, endpoint.role)
      expect(response.statusCode, query).toBe(400)
      expect(response.json().error.code).toBe('INVALID')
    }
  })
  it('分页不能绕过认证与角色限制，也不泄露总数', async () => {
    const guest = await get(`${endpoint.url}?page=2`)
    expect(guest.statusCode).toBe(401)
    expect(guest.json().meta).toBeUndefined()
    const wrongRole = endpoint.role === 'parent' ? 'tutor' : 'parent'
    const forbidden = await get(`${endpoint.url}?page=2`, wrongRole)
    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.json().meta).toBeUndefined()
  })
})

describe.each([
  { ...endpoints[0], status: 'completed', ids: ['pagination-booking-104', 'pagination-booking-103'], table: 'booking' as const, original: 'pending' },
  { ...endpoints[1], status: 'completed', ids: ['pagination-booking-104', 'pagination-booking-103'], table: 'booking' as const, original: 'pending' },
  { ...endpoints[2], status: 'rejected', ids: ['pagination-app-054', 'pagination-app-053'], table: 'tutorApplication' as const, original: 'draft' },
  { ...endpoints[3], status: 'resolved', ids: ['pagination-report-104', 'pagination-report-103'], table: 'report' as const, original: 'open' }
])('$url 服务端状态筛选', endpoint => {
  it('先按状态和归属过滤，再分页和计数，忽略伪造归属', async () => {
    const update = async (status: string) => {
      const where = { id: { in: endpoint.ids } }
      if (endpoint.table === 'booking') return db.booking.updateMany({ where, data: { status } })
      if (endpoint.table === 'report') return db.report.updateMany({ where, data: { status } })
      return db.tutorApplication.updateMany({ where, data: { status, updatedAt: stamp } })
    }
    // Other test files may contain records with the same status. Fixture IDs sort first.
    await update(endpoint.status)
    try {
      const first = await get(`${endpoint.url}?status=${endpoint.status}&pageSize=1&userId=pagination-foreign-parent`, endpoint.role)
      const second = await get(`${endpoint.url}?status=${endpoint.status}&pageSize=1&page=2`, endpoint.role)
      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(200)
      expect(first.json().data[0].id).toBe(endpoint.ids[0])
      expect(second.json().data[0].id).toBe(endpoint.ids[1])
      expect(first.json().data[0].status).toBe(endpoint.status)
      expect(first.json().meta.total).toBeGreaterThanOrEqual(2)
      expect(second.json().meta.total).toBe(first.json().meta.total)
      if (endpoint.table === 'booking') expect(first.json().meta.total).toBe(2)
      expect(Object.keys(first.json().meta).sort()).toEqual(['page', 'pageSize', 'total'])
    } finally { await update(endpoint.original) }
  })
  it('拒绝无效、空和重复状态值', async () => {
    for (const query of ['status=invalid', 'status=', `status=${endpoint.status}&status=${endpoint.status}`]) {
      const response = await get(`${endpoint.url}?${query}`, endpoint.role)
      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('INVALID')
    }
  })
})

describe('管理员全量概览与请求边界', () => {
  it('只有管理员能读取概览', async () => {
    expect((await get('/api/admin/overview')).statusCode).toBe(401)
    for (const role of ['parent', 'tutor']) expect((await get('/api/admin/overview', role)).statusCode).toBe(403)
  })
  it('超过一页的记录仍计入全量统计，状态变化后统计同步', async () => {
    const before = (await get('/api/admin/overview', 'admin')).json().data
    expect(before.applications.draft).toBeGreaterThanOrEqual(55)
    expect(before.bookings.pending).toBeGreaterThanOrEqual(106)
    expect(before.reports.open).toBeGreaterThanOrEqual(105)
    expect(before.applications.total).toBe(await db.tutorApplication.count())
    expect(before.bookings.total).toBe(await db.booking.count())
    expect(before.reports.total).toBe(await db.report.count())
    expect(before.tutors.published).toBe((await get('/api/tutors')).json().meta.total)
    await db.booking.update({ where: { id: 'pagination-booking-104' }, data: { status: 'completed' } })
    try {
      const after = (await get('/api/admin/overview', 'admin')).json().data
      expect(after.bookings.total).toBe(before.bookings.total)
      expect(after.bookings.pending).toBe(before.bookings.pending - 1)
      expect(after.bookings.completed).toBe(before.bookings.completed + 1)
      for (const category of ['applications', 'bookings', 'reports']) {
        const { total, ...states } = after[category]
        expect(Object.values(states).reduce<number>((sum, count) => sum + Number(count), 0)).toBe(total)
      }
    } finally { await db.booking.update({ where: { id: 'pagination-booking-104' }, data: { status: 'pending' } }) }
  })
  it('账户停用后既有令牌立即失效，不能读取列表及统计', async () => {
    await db.user.update({ where: { id: 'pagination-admin' }, data: { status: 'disabled' } })
    try {
      expect((await get('/api/admin/overview', 'admin')).statusCode).toBe(401)
      expect((await get('/api/admin/reports', 'admin')).statusCode).toBe(401)
    } finally { await db.user.update({ where: { id: 'pagination-admin' }, data: { status: 'active' } }) }
  })
  it('未知接口、畸形JSON及过大请求使用统一错误结构', async () => {
    const missing = await get('/api/does-not-exist')
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ error: { code: 'NOT_FOUND', message: '接口不存在' } })
    for (const [payload, status] of [['{', 400], [JSON.stringify({ password: 'x'.repeat(33000) }), 413]] as const) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload, headers: { 'content-type': 'application/json' } })
      expect(response.statusCode).toBe(status)
      expect(response.json().error.code).toBe('INVALID')
      expect(response.json().error).not.toHaveProperty('stack')
    }
  })
  it('CORS仅允许配置的前端来源', async () => {
    const allowed = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://127.0.0.1:5173' } })
    expect(allowed.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173')
    const other = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://unlisted.invalid' } })
    expect(other.headers['access-control-allow-origin']).toBeUndefined()
  })
})
