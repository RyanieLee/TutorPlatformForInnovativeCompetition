import { BusinessError } from './errors'
import { shallowRef } from 'vue'
import { apiRequest } from './api/client'
import { apiMode } from '../config/runtime'
import { parseBriefLocally } from './brief-parser'
import { learningTopics } from '../data/learning'
export interface ChatMessage{role:'user'|'assistant';content:string}
export interface AssistantReply{reply:string;source:'model'|'local';matchBrief?:string}
export const pendingCompanionBrief=shallowRef<string|null>(null)
export function companionStatus():Promise<{enabled:boolean}>{return apiMode?apiRequest('GET','/api/assistant/status',undefined,false):Promise.resolve({enabled:false})}
export function remoteChat(messages:ChatMessage[]):Promise<AssistantReply>{return apiRequest('POST','/api/assistant/chat',{messages})}
export function localChat(text:string):AssistantReply{
 const brief=text.trim()
 if(!brief||brief.length>500)throw new BusinessError('INVALID','请输入1–500字的问题')
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话|QQ号)/i.test(brief))throw new BusinessError('INVALID','请勿填写姓名、联系方式或地址')
 if(/订单|地图|接单|预约/.test(brief))return {source:'local',reply:'我可以带你打开订单地图：登录后，家长查看自己的预约，家教查看收到的预约，管理员查看全部。页面每10秒刷新一次；我无法在对话中直接查询、接单或改动订单。'}
 if(brief.length>=6&&brief.length<=160){
  const s=parseBriefLocally(brief)
  if(s.subject&&(s.budget||s.grade||s.mode))return {source:'local',reply:`我先帮你整理：${s.subject}，${s.grade??'年级待补充'}，${s.budget==null?'预算待补充':'预算'+s.budget+'元/小时'}，${s.mode??'授课方式待补充'}。点击“带入匹配需求”，再核对表单、选择位置和老师；我不会自动提交预约。`,matchBrief:brief}
 }
 const topic=learningTopics.find(t=>brief.includes(t.title))
 if(topic)return {source:'local',reply:`本机原创笔记 · ${topic.title}\n${topic.points.slice(0,3).join('\n')}\n例子：${topic.example}\n可以打开AI学习中心继续练习。以上为固定笔记检索，未调用模型。`}
 if(/试卷|出题|练习|错题|学习|笔记/.test(brief))return {source:'local',reply:'可以先打开AI学习中心，选择学段、科目和知识点，读笔记后体验3道原创示例题。服务端配置模型后可生成新卷；选择题可核对，简答题需要自己或老师对照解析。'}
 return {source:'local',reply:'我是小书灵，可以帮你整理找家教的需求、查找本站知识点笔记，或带你打开学习中心和订单地图。试着说：“初中数学，预算100元，线上耐心讲解”。当前是有限的本机演示答复，未调用大模型。'}
}
