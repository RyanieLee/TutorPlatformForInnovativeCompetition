import { it, expect } from 'vitest'
import { groupApplications } from '../../../src/pages/tutor/shared/admin'
import type { TutorApplication } from '../../../src/types/business'
it('草稿不归入已审核，分组保留顺序且不修改服务返回数据', () => {
  const make = (id: string, status: TutorApplication['status']): TutorApplication => ({ id, status, userId: 'tutor-'+id, displayName: '演示老师', university: '示例大学', major: '数学', subjects: ['数学'], teachingMode: '线上', area: '大学城', pricePerHour: 80, introduction: '虚构演示教学资料。', availability: '周末', createdAt: '', updatedAt: '' })
  const items = [make('1', 'draft'), make('2', 'pending'), make('3', 'approved'), make('4', 'pending'), make('5', 'rejected')]
  const before = JSON.stringify(items)
  const groups = groupApplications(items)
  expect(groups.draft.map(x => x.id)).toEqual(['1'])
  expect(groups.pending.map(x => x.id)).toEqual(['2', '4'])
  expect(groups.approved.map(x => x.id)).toEqual(['3'])
  expect(groups.rejected.map(x => x.id)).toEqual(['5'])
  expect(JSON.stringify(items)).toBe(before)
  expect(groupApplications([])).toEqual({ draft: [], pending: [], approved: [], rejected: [] })
})
