/** Shared API contracts. Private persisted state and receipts are never returned by the API. */
export type ArchiveAccess = 'owner' | 'basic' | 'summary' | 'learning'
export interface ArchiveProfile { nickname: string; grade: string; goals: string }
export interface ArchiveBooking { id: string; parentId: string; teacherId: string; teacherName: string; subject: string; status: string; archiveId?: string }
export interface ArchiveTrial { id: string; bookingId: string; teacherId: string; observation: string; createdAt: string; confirmedAt?: string }
export interface ArchiveGrant { bookingId: string; level: 'summary' | 'learning'; expiresAt: string; revokedAt?: string }
export interface ArchiveQuestion { id: string; stem: string; answer: string; explanation: string }
export interface ArchiveAnalysis { knowledgePoints: string[]; analysis: string; teachingAdvice: string; trainingTargets: string[]; questions: ArchiveQuestion[] }
export interface ArchiveReview { id: string; bookingId: string; teacherId: string; question: string; answer: string; referenceAnswer: string; submissionId?: string; source: 'sample' | 'model'; analysis: ArchiveAnalysis; createdAt: string; confirmedAt?: string; teacherNote?: string; revisedAt?: string }
export interface ArchiveAttempt { id: string; reviewId: string; answers: { questionId: string; answer: string }[]; createdAt: string }
export interface ArchiveReport { id: string; bookingId: string; teacherId: string; reviewId: string; text: string; nextLesson: string; createdAt: string; updatedAt: string; confirmedAt?: string }
export interface ArchiveObservation { id: string; bookingId: string; teacherId: string; text: string; createdAt: string; updatedAt?: string }
export interface ArchiveHandover { id: string; reportIds: string[]; snapshots: { reportId: string; text: string; nextLesson: string; confirmedAt: string }[]; createdAt: string }
export interface StudentArchiveDTO extends ArchiveProfile { id: string; revision: number; access: ArchiveAccess; createdAt: string; bookings: ArchiveBooking[]; trials: ArchiveTrial[]; grants?: ArchiveGrant[]; reviews?: ArchiveReview[]; attempts?: ArchiveAttempt[]; reports?: ArchiveReport[]; observations?: ArchiveObservation[]; handovers?: ArchiveHandover[]; modelEnabled?: boolean }
export interface CreateStudentArchive extends ArchiveProfile { requestId: string }
export interface ReviewInput { bookingId: string; question: string; answer: string; referenceAnswer: string; submissionId?: string; consent: boolean; mode: 'sample' | 'model' }
export type ArchiveAction =
 | { type: 'updateProfile'; payload: ArchiveProfile }
 | { type: 'bindBooking'; payload: { bookingId: string } }
 | { type: 'recordTrial'; payload: { bookingId: string; observation: string } }
 | { type: 'confirmTrial'; payload: { trialId: string } }
 | { type: 'grant'; payload: { bookingId: string; level: 'summary' | 'learning'; expiresAt: string } }
 | { type: 'revoke'; payload: { bookingId: string } }
 | { type: 'createReview'; payload: ReviewInput }
 | { type: 'reviseReview'; payload: { reviewId: string; analysis: ArchiveAnalysis; teacherNote: string } }
 | { type: 'confirmReview'; payload: { reviewId: string; teacherNote: string } }
 | { type: 'submitAttempt'; payload: { reviewId: string; answers: { questionId: string; answer: string }[] } }
 | { type: 'saveReport'; payload: { reviewId: string; reportId?: string; text: string; nextLesson: string } }
 | { type: 'confirmReport'; payload: { reportId: string } }
 | { type: 'updateObservation'; payload: { observationId: string; text: string } }
 | { type: 'observe'; payload: { bookingId: string; text: string } }
 | { type: 'handover'; payload: { reportIds: string[]; revokeBookingId?: string } }
export type ArchiveCommand = ArchiveAction & { requestId: string; expectedRevision: number }
export interface ArchiveState extends ArchiveProfile { id: string; parentId: string; revision: number; createdAt: string; bookingIds: string[]; trials: ArchiveTrial[]; grants: ArchiveGrant[]; reviews: ArchiveReview[]; attempts: ArchiveAttempt[]; reports: ArchiveReport[]; observations: ArchiveObservation[]; handovers: ArchiveHandover[]; receipts: { requestId: string; actorId: string; fingerprint: string }[] }
export interface ArchiveContext { actor: { id: string; role: string }; bookings: ArchiveBooking[]; now: string; generatedAnalysis?: ArchiveAnalysis; validatedSubmissionId?: string }
