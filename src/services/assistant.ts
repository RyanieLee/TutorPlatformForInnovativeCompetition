import { BusinessError } from './errors'
import { shallowRef } from 'vue'
import { apiRequest, apiUploadFile } from './api/client'
import {assistantApiMode as apiMode,demoAiGateway} from '../config/runtime'
import { parseBriefLocally } from './brief-parser'
import { learningTopics } from '../data/learning'
import { platformHelpAnswer } from './platform-guide'
export interface ChatMessage{role:'user'|'assistant';content:string}
export interface AssistantReply{reply:string;source:'model'|'local';matchBrief?:string}
export const pendingCompanionAuto=shallowRef(false)
export const pendingCompanionBrief=shallowRef<string|null>(null)
export function companionStatus():Promise<{enabled:boolean}>{return apiMode?apiRequest('GET','/api/assistant/status',undefined,false):Promise.resolve({enabled:false})}
export function remoteChat(messages:ChatMessage[]):Promise<AssistantReply>{return apiRequest('POST','/api/assistant/chat',{messages:demoAiGateway?messages.map(m=>m.role==='assistant'&&m.content.length>1500?{...m,content:m.content.slice(0,1480)+'\n（历史答复节选）'}:m):messages})}

export interface HomeworkImageReviewStatus { enabled: boolean; maxImageBytes: number; acceptedTypes: string[] }
export async function homeworkImageReviewStatus(): Promise<HomeworkImageReviewStatus> {
  return apiMode
    ? apiRequest<HomeworkImageReviewStatus>('GET', '/api/assistant/homework-review/status', undefined, false)
    : { enabled: false, maxImageBytes: 3 * 1024 * 1024, acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'] }
}
export function reviewHomeworkImage(filePath: string): Promise<AssistantReply> {
  if (!apiMode) throw new BusinessError('MODEL_UNAVAILABLE', '图片批改需要启动开发 API 并配置支持图片输入的模型')
  return apiUploadFile<AssistantReply>('/api/assistant/homework-review-image', filePath, 'image')
}

export function localChat(text:string):AssistantReply{
 const brief=text.trim()
 if(!brief||brief.length>500)throw new BusinessError('INVALID','请输入1–500字的问题')
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话|QQ号)/i.test(brief))throw new BusinessError('INVALID','请勿填写姓名、联系方式或地址')
 // 明确提出的教学问题不冒充已批改；模型未配置时提供真实能力引导。
 if(/(?:批改|检查|评价|改正).{0,8}(?:作业|答案|作文)|(?:作业|作文).{0,8}(?:批改|检查|评价)|判断.{0,6}对错/.test(brief)){
  return {source:'local',reply:platformHelpAnswer('批改作业')!}
 }
 // 简洁产品指引优先于搜索需求，防止“怎么预约”被当作一个找老师需求。
 const guide=platformHelpAnswer(brief)
 if(guide&&!/(?:预算|每小时|\d+元).{0,14}(?:老师|家教)|(?:老师|家教).{0,14}(?:预算|每小时|\d+元)/.test(brief))return {source:'local',reply:guide}
 if(brief.length>=6&&brief.length<=160){
  const s=parseBriefLocally(brief)
  if(s.subject&&(s.budget||s.grade||s.mode))return {source:'local',reply:`我先帮你整理：${s.subject}，${s.grade??'年级待补充'}，${s.budget==null?'预算待补充':'预算'+s.budget+'元/小时'}，${s.mode??'授课方式待补充'}。点击“带入匹配需求”，再核对表单、选择位置和老师；我不会自动提交预约。`,matchBrief:brief}
 }
 const topic=learningTopics.find(t=>brief.includes(t.title))
 if(topic)return {source:'local',reply:`本机原创笔记 · ${topic.title}\n${topic.points.slice(0,3).join('\n')}\n例子：${topic.example}\n可以打开AI学习中心继续练习。以上为固定笔记检索，未调用模型。`}
 if(/试卷|出题|练习|错题|学习|笔记/.test(brief))return {source:'local',reply:'可以先打开AI学习中心，选择学段、科目和知识点，读笔记后体验3道原创示例题。服务端配置模型后可生成新卷；选择题可核对，简答题需要自己或老师对照解析。'}
 return {source:'local',reply:'我可以帮你看平台操作指南、查找本站笔记或整理老师需求。新题解答和作业批改需要配置真实模型；当前仅是本机帮助演示，不会装作已经批改。你可以问“平台怎么用”“怎么找老师”或“如何批改作业”。'}
}
