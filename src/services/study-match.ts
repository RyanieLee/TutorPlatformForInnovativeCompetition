import { learningTopics } from '../data/learning'
import { matchSubjects, type MatchInput } from './matching'
import type { MatchSuggestion } from './api/match-assistant'

/** URL 只传白名单主题 ID，不携带作答、成绩或个人资料。 */
export function studyMatchContext(topicId:unknown){
 if(typeof topicId!=='string')return null
 const topic=learningTopics.find(t=>t.id===topicId)
 if(!topic)return null
 const supported=matchSubjects.some(s=>s===topic.subject)
 return {topic,supported,input:{subject:supported?topic.subject:'',grade:topic.stage+'（演示）',budget:'',mode:'均可',preference:''} satisfies MatchInput}
}
/** 核对框显示未识别时，确认后也必须为空，不能静默沿用上一次需求。 */
export function suggestionInput(value:MatchSuggestion):MatchInput {
 return {subject:value.subject??'',grade:value.grade??'',budget:value.budget==null?'':String(value.budget),mode:value.mode??'均可',preference:value.preference??''}
}
