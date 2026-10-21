export type Source='preset'|'model'|'manual'
export interface Question{id:string;prompt:string;answer:string;solution:string}
export interface Block{id:string;minutes:number;teacher:string;student:string}
export interface CourseLesson{id:string;title:string;goals:string[];knowledge:string[];blocks:Block[];examples:Question[];exercises:Question[];homework:string;observe:string[]}
export interface Course{code:string;subject:string;grade:string;unit:string;student:string;goal:string;prerequisites:string;diagnostic:Question[];lessons:CourseLesson[]}
export interface Plan{version:number;course:Course;source:Source;createdAt:string;publishedAt:string;explanation:string}
export interface Draft{course:Course;source:Source;createdAt:string;explanation:string}
export interface RecordInput{lessonId:string;date:string;completed:string;goalMet:string;results:{questionId:string;correct:boolean}[];errorTypes:string[];observation:string;questions:string;consolidation:string}
export interface ClassRecord extends RecordInput{id:string;createdAt:string;planVersion:number}
export interface EvidencePoint{text:string;evidenceRefs:string[]}
export interface Feedback{ id:string;recordId:string;lessonId:string;source:Source;createdAt:string;promptVersion:string;correct:number;total:number;percent:number;strengths:EvidencePoint[];consolidation:EvidencePoint[];next:EvidencePoint[];report:string;status:'draft'|'published';publishedAt:string|null }
export interface Suggestion{id:string;feedbackId:string;recordId:string;lessonId:string;baseVersion:number;course:Course;source:Source;createdAt:string;why:string;evidenceRefs:string[];changes:{originalBlock:string;proposedBlock:string;durationDelta:number;why:string;evidenceRefs:string[]}[];status:'pending'|'applied'|'rejected'}
export interface LoopState{bookingId:string;revision:number;draft:Draft|null;versions:Plan[];records:ClassRecord[];feedbacks:Feedback[];suggestions:Suggestion[];receipts:{id:string;command:string}[]}
export interface ParentLoopView{bookingId:string;revision:number;plan:Plan|null;versions:Plan[];feedbacks:Feedback[]}
export interface Command{requestId:string;expectedRevision:number;type:'initialize'|'saveDraft'|'discardDraft'|'publish'|'record'|'feedback'|'editFeedback'|'publishFeedback'|'suggest'|'applyRevision'|'rejectRevision';payload:Record<string,any>}
export class LoopError extends Error{constructor(public code:'INVALID'|'CONFLICT',message:string){super(message)}}
