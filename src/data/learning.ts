import rawTopics from '../../server/src/content/learning-topics.json'
import type { LearningTopic, ExamPaper, Question } from '../../shared/learning'
import bank from '../../shared/example-questions.json'
export const learningTopics = rawTopics as LearningTopic[]
export const resourceSources = [
  { id:'national', title:'国家中小学智慧教育平台 · 电子教材', provider:'国家中小学智慧教育平台', url:'https://basic.smartedu.cn/elecEdu', description:'在原站选择学段、学科、年级与教材版本；部分内容可能需要登录。', status:'官方入口已检索；具体资源按原站提供' },
  { id:'courses', title:'国家中小学智慧教育平台 · 课程教学', provider:'国家中小学智慧教育平台', url:'https://basic.smartedu.cn/', description:'进入“课程教学”，查找同步课程、学习任务及教学资源。', status:'官方首页已打开；课程内容需原站选择' },
  { id:'pep', title:'人教社 · 教材与电子版入口', provider:'人民教育出版社', url:'https://www.pep.com.cn/', description:'从“教材电子版”或教材栏目选择对应学段与科目，核对教材版本。', status:'官方检索收录；自动访问返回403，需在浏览器核验' },
  { id:'standard', title:'义务教育课程方案与课程标准（2022年版）', provider:'教育部', url:'https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html', description:'小学、初中各学科课程标准入口，适合教师确定学习目标，不是现成题库。', status:'教育部官方检索收录；自动打开超时' },
  { id:'highstandard', title:'普通高中课程方案与课程标准修订通知', provider:'教育部', url:'https://www.moe.gov.cn/srcsite/A26/s8001/202006/t20200603_462199.html', description:'普通高中课程标准修订入口，使用前核对本地课程与教材安排。', status:'官方通知入口；自动打开超时' }
]
export function examplePaper(topicId:string, grade:string): ExamPaper {
  const topic=learningTopics.find(t=>t.id===topicId)
  if(!topic || !topic.grades.includes(grade))throw new Error('请选择该主题支持的年级')
  const questions=(bank as Record<string,Question[]>)[topicId]
  if(!questions || questions.length!==3)throw new Error('此主题暂无示例试卷')
  return {title:`${topic.stage}${topic.subject} · ${topic.title}练习`,topicId,grade,difficulty:'固定示例',questions:questions.map(q=>({...q,options:[...q.options]})),totalPoints:questions.reduce((sum,q)=>sum+q.points,0),source:'example',createdAt:new Date().toISOString()}
}
