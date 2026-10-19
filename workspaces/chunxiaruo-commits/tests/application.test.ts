import { describe, it, expect } from 'vitest'
import { submitReviewedApplication } from '../../../src/pages/tutor/shared/application'
import { MockBusinessService } from '../../../src/services/mock/business'
import { MemoryStorage } from '../../../src/services/mock/storage'
import type { User } from '../../../src/types/auth'
import type { TutorApplicationInput, TutorApplication } from '../../../src/types/business'

const tutor: User = { id: 'demo-tutor', displayName: '演示家教', role: 'tutor' }
const admin: User = { id: 'demo-admin', displayName: '演示管理员', role: 'admin' }
const input: TutorApplicationInput = { displayName: '中文演示老师', university: '示例大学', major: '数学', subjects: ['数学'], teachingMode: '均可', area: '大学城', pricePerHour: 80, introduction: '使用虚构资料演示耐心的数学辅导。', availability: '周末下午' }
async function approved() {
  const service = new MockBusinessService(new MemoryStorage())
  const pending = await service.submitApplication(tutor, input)
  const current = await service.reviewApplication(admin, pending.id, 'approved')
  return { service, current }
}
describe('入驻资料重新送审', () => {
  it('已通过申请先保存草稿再提交，并通知页面草稿已保存', async () => {
    const { service, current } = await approved()
    let saved: TutorApplication | null = null
    const result = await submitReviewedApplication(service, tutor, current, { ...input, major: '应用数学' }, d => { saved = d })
    expect(result.status).toBe('pending')
    expect(saved).toMatchObject({ status: 'draft', major: '应用数学' })
    expect((await service.getMyApplication(tutor))?.status).toBe('pending')
    expect(input.major).toBe('数学')
  })
  it('第二步提交失败时页面与存储都保留已保存草稿', async () => {
    const { service, current } = await approved()
    let saved: TutorApplication | null = null
    await expect(submitReviewedApplication(service, tutor, current, { ...input, university: '' }, d => { saved = d })).rejects.toThrow()
    expect(saved).toMatchObject({ status: 'draft', university: '' })
    expect((await service.getMyApplication(tutor))?.status).toBe('draft')
  })
  it('保存失败不提交，避免以旧资料进行审核', async () => {
    const { service, current } = await approved()
    await expect(submitReviewedApplication(service, admin, current, input, () => { throw new Error('不应保存成功') })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect((await service.getMyApplication(tutor))?.status).toBe('approved')
  })
  it('被拒绝资料可直接重提，待审核资料仍由服务层阻止重提', async () => {
    const service = new MockBusinessService(new MemoryStorage())
    const a = await service.submitApplication(tutor, input)
    const rejected = await service.reviewApplication(admin, a.id, 'rejected', '补充资料')
    let saved = 0
    const pending = await submitReviewedApplication(service, tutor, rejected, input, () => saved++)
    expect(pending.status).toBe('pending')
    expect(saved).toBe(0)
    await expect(submitReviewedApplication(service, tutor, pending, input, () => saved++)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
