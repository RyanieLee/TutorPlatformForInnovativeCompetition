import type { BookingStatus } from '../../../types/tutor'
import type { BookingAction } from '../../../services/rules'
export function tutorActions(status: BookingStatus): readonly BookingAction[] {
  if (status === 'pending') return ['accept', 'reject']
  if (status === 'accepted') return ['complete']
  return []
}
