import type { BusinessService } from '../../../services/contracts'
import type { User } from '../../../types/auth'
import type { TutorApplication, TutorApplicationInput } from '../../../types/business'
export async function submitReviewedApplication(service: Pick<BusinessService, 'saveApplicationDraft' | 'submitApplication'>, user: User, current: TutorApplication | null, input: TutorApplicationInput, onDraftSaved: (draft: TutorApplication) => void): Promise<TutorApplication> {
  if (current?.status === 'approved') onDraftSaved(await service.saveApplicationDraft(user, input))
  return service.submitApplication(user, input)
}
