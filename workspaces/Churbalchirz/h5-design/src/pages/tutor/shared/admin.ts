import type { TutorApplication } from '../../../types/business'
export function groupApplications(items: readonly TutorApplication[]): Record<TutorApplication['status'], TutorApplication[]> {
  const groups: Record<TutorApplication['status'], TutorApplication[]> = { draft: [], pending: [], approved: [], rejected: [] }
  for (const item of items) groups[item.status].push(item)
  return groups
}
