import { it, expect } from 'vitest'
import { tutorActions } from '../../../src/pages/tutor/shared/bookings'
it('家教只可接受拒绝待处理预约、完成已接受预约，终态不出现非法操作', () => {
  expect(tutorActions('pending')).toEqual(['accept', 'reject'])
  expect(tutorActions('accepted')).toEqual(['complete'])
  expect(tutorActions('completed')).toEqual([])
  expect(tutorActions('cancelled')).toEqual([])
  expect(tutorActions('rejected')).toEqual([])
})
