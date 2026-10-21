export const stages = ['小学', '初中', '高中'] as const
export type Stage = typeof stages[number]
export interface LearningTopic {
  id: string; stage: Stage; subject: string; title: string; grades: string[]
  points: string[]; pitfalls: string[]; example: string; tasks: string[]
}
export interface Question {
  id: string; type: 'choice' | 'short'; stem: string; options: string[]
  answer: string; explanation: string; points: number
}
export interface PaperRequest { topicId: string; grade: string; difficulty: '基础'|'巩固'|'提高'; count: 3|5|8 }
export interface ExamPaper {
  title: string; topicId: string; grade: string; difficulty: string; questions: Question[]
  totalPoints: number; source: 'model'|'example'; createdAt: string
}
export function paperText(paper: ExamPaper, answers: boolean): string {
  const lines = [paper.title, `${paper.grade} · ${paper.difficulty} · ${paper.totalPoints} 分`, paper.source === 'model' ? 'AI 生成草案，使用前请核对题目与答案。' : '原创示例题库组卷，未调用 AI。', '']
  paper.questions.forEach((q, i) => { lines.push(`${i+1}. ${q.stem}（${q.points}分）`, ...q.options.map((option,j)=>`${'ABCD'[j]}. ${option}`), '答：________________', '') })
  if (answers) { lines.push('参考答案与解析'); paper.questions.forEach((q,i)=>lines.push(`${i+1}. ${q.answer}`, q.explanation, '')) }
  return lines.join('\n')
}
