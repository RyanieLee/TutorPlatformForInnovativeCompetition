import { BusinessError } from './errors'
import { shallowRef } from 'vue'
import { apiRequest, apiUploadFile } from './api/client'
import { apiMode } from '../config/runtime'
import { parseBriefLocally } from './brief-parser'
import { learningTopics } from '../data/learning'
import { platformHelpAnswer } from './platform-guide'
export interface ChatMessage{role:'user'|'assistant';content:string}
export interface AssistantReply{reply:string;source:'model'|'local';matchBrief?:string}
export const pendingCompanionAuto=shallowRef(false)
export const pendingCompanionBrief=shallowRef<string|null>(null)
export function companionStatus():Promise<{enabled:boolean}>{return apiMode?apiRequest('GET','/api/assistant/status',undefined,false):Promise.resolve({enabled:false})}
export function remoteChat(messages:ChatMessage[]):Promise<AssistantReply>{return apiRequest('POST','/api/assistant/chat',{messages})}

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

const topicAliases:Record<string,string[]> = {
 '阅读概括':['段落大意','概括中心','阅读概括'],
 '分数与单位1':['单位1','分数整体','分数单位'],
 '一般现在时':['现在时','三单','习惯用法'],
 '公平实验':['控制变量','公平实验','对照实验'],
 '阅读证据与表达':['原文依据','阅读证据','证据表达'],
 '一元一次方程':['方程怎么解','解方程','移项','未知数','等式两边'],
 '一般过去时':['过去时','did用法','was were','过去发生'],
 '速度与单位换算':['速度公式','路程除以时间','单位换算'],
 '质量守恒与配平':['质量守恒','化学配平','配平'],
 '细胞与光合作用':['光合作用','细胞结构','叶绿体'],
 '史料与时间线':['历史时间线','史料分析','历史年代'],
 '经纬网与地图':['经纬度','经纬网','地图方向'],
 '规则与权利义务':['权利义务','规则意识','道德与法治'],
 '论证结构与证据':['论点论据','论证结构','议论文'],
 '函数与定义域':['函数定义域','定义域','函数怎么求'],
 '定语从句':['定语从句','先行词','关系代词'],
 '牛顿第二定律':['牛顿第二定律','受力分析','F=ma'],
 '物质的量与计量':['物质的量','摩尔质量','n=m/M'],
 '遗传概率':['遗传概率','基因型','配子'],
 '历史解释与比较':['历史比较','历史解释','历史背景'],
 '地球运动与区位':['地球运动','昼夜长短','地理区位'],
 '逻辑与情境分析':['逻辑推理','情境分析','权利义务判断']
}
export function localChat(text:string):AssistantReply{
 const brief=text.trim()
 if(!brief||brief.length>500)throw new BusinessError('INVALID','请输入1–500字的问题')
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话|QQ号)/i.test(brief))throw new BusinessError('INVALID','请勿填写姓名、联系方式或地址')
 // 本机模式不假装批改新作业；明确告知可用流程与模型前置条件。
 if(/(?:批改|检查|评价|改正).{0,8}(?:作业|答案|作文)|(?:作业|作文).{0,8}(?:批改|检查|评价)|判断.{0,6}对错/.test(brief)){
  return {source:'local',reply:platformHelpAnswer('批改作业')!}
 }
 const hasTeacherIntent=/(?:找老师|找家教|匹配|老师|家教|预算|每小时|课时费|授课|线上|线下|辅导老师)/.test(brief)
 // 先查本平台已有笔记，避免把“方程怎么解”误判成找老师需求。
 const exactTopic=learningTopics.find(t=>brief.includes(t.title))
 const learningIntent=/(?:知识点|题目|怎么解|解题|讲解|公式|语法|错题|为什么|怎么计算|不会做|练习|概念|步骤|求解|方程|配平|单位换算|从句|定义域|受力分析|阅读理解)/i.test(brief)
 const aliasTopic=learningTopics.find(t=>(topicAliases[t.title]??[]).some(alias=>brief.toLowerCase().includes(alias.toLowerCase()))&&(brief.includes(t.subject)||brief.includes(t.stage)||learningIntent))
 const topic=exactTopic??aliasTopic
 if(topic&&!hasTeacherIntent){
  const notes='本站原创笔记 · '+topic.stage+topic.subject+' · '+topic.title+'\n'+topic.points.slice(0,4).join('\n')+'\n例子：'+topic.example+'\n易错提醒：'+topic.pitfalls.slice(0,2).join('；')+'\n这是本机固定笔记检索，并非实时大模型批改。可打开「AI学习中心」查看完整笔记、练习和解析。'
  return {source:'local',reply:notes}
 }
 // 通用平台指引只在没有命中具体笔记时返回；带匹配条件的需求仍继续解析。
 const guide=platformHelpAnswer(brief)
 if(guide&&!hasTeacherIntent)return {source:'local',reply:guide}
 if(brief.length>=6&&brief.length<=160){
  const s=parseBriefLocally(brief)
  if((hasTeacherIntent||(!learningIntent&&(s.budget!==null||s.mode!==null)))&&s.subject&&(s.budget||s.grade||s.mode))return {source:'local',reply:'我先帮你整理：'+s.subject+'，'+(s.grade??'年级待补充')+'，'+(s.budget==null?'预算待补充':'预算'+s.budget+'元/小时')+'，'+(s.mode??'授课方式待补充')+'。点击“带入匹配需求”，再核对表单、选择位置和老师；我不会自动提交预约。',matchBrief:brief}
 }
 if(learningIntent)return {source:'local',reply:'我能检索本站已有的固定知识点笔记，但当前是本机演示模式，不能可靠地解答所有新题或实际批改作业。你可以打开「AI学习中心」按学段和学科查笔记、练习与解析；如果服务端已配置模型并登录，可在对话里粘贴完整题目和自己的作答，请求分步讲解与批改建议。'}
 if(/试卷|出题|练习|错题|学习|笔记/.test(brief))return {source:'local',reply:'可以先打开AI学习中心，选择学段、科目和知识点，读原创笔记后体验3道固定示例题。服务端配置模型且登录后可尝试生成新卷；选择题可核对，简答题需要自己或老师对照解析。'}
 return {source:'local',reply:'我可以介绍领航云学堂的使用方法、查找本站笔记、整理找老师需求，也可以在模型配置后回答新题、检查文字作业和修改作文。当前本机演示不冒充大模型；你可以问“平台怎么用”“一元一次方程怎么解”或“如何批改作业”。'}
}
