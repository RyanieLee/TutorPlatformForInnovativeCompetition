import { BusinessError } from './errors'
import type { Tutor, TeachingMode } from '../types/tutor'

export const matchSubjects = ['数学', '英语', '语文', '物理', '化学'] as const
export const demoGrades = ['小学（演示）', '初中（演示）', '高中（演示）'] as const
export interface MatchInput {
  subject: string
  grade: string
  budget: string
  mode: TeachingMode
  preference: string
}
export interface MatchResult { tutor: Tutor; score: number; reasons: string[] }
export interface MatchResponse { results: MatchResult[]; total: number; eligible: number; excluded: { subject: number; budget: number; mode: number } }
export const matchWeights = { subject: 50, mode: 20, budget: 20, preference: 10 } as const

export function validateMatch(input: MatchInput): string {
  if (!matchSubjects.some(s => s === input.subject)) return '请选择科目'
  if (!demoGrades.some(g => g === input.grade)) return '请选择演示年级'
  if (!/^(?:\d{1,4})(?:\.\d{1,2})?$/.test(input.budget.trim()) || Number(input.budget) <= 0 || Number(input.budget) > 2000) return '预算请输入 0.01–2000 元的数字，最多两位小数'
  if (!['线上', '线下', '均可'].includes(input.mode)) return '请选择授课方式'
  if (input.preference.length > 40) return '偏好最多填写 40 个字，请勿输入个人信息'
  return ''
}

/** 规则演示，无模型调用。硬条件绝不为凑结果而放宽。 */
export function matchTutors(tutors: Tutor[], input: MatchInput): MatchResponse {
  const error = validateMatch(input)
  if (error) throw new Error(error)
  const budget = Number(input.budget)
  const terms = [...new Set(input.preference.trim().toLowerCase().split(/[\s,，、;；]+/).filter(Boolean))]
  const excluded = { subject: 0, budget: 0, mode: 0 }
  const results: MatchResult[] = []
  for (const tutor of tutors) {
    // 排除数按首个不满足的条件统计，三项互斥。
    if (!tutor.subjects.includes(input.subject)) { excluded.subject++; continue }
    if (!Number.isFinite(tutor.pricePerHour) || tutor.pricePerHour < 0 || tutor.pricePerHour > budget) { excluded.budget++; continue }
    if (input.mode !== '均可' && tutor.teachingMode !== '均可' && tutor.teachingMode !== input.mode) { excluded.mode++; continue }
    const priceScore = Math.round(matchWeights.budget * (1 - tutor.pricePerHour / budget))
    const text = [tutor.introduction, tutor.area, tutor.major, ...tutor.tags].join(' ').toLowerCase()
    const hits = terms.filter(term => text.includes(term))
    const preferenceScore = terms.length ? Math.round(matchWeights.preference * hits.length / terms.length) : 0
    const reasons = [`科目匹配：${input.subject} +50`, `方式兼容：${tutor.teachingMode} +20`, `课时费 ¥${tutor.pricePerHour} ≤ 预算 ¥${budget}，预算余量 +${priceScore}`,
      terms.length ? `偏好命中 ${hits.length}/${terms.length}${hits.length ? '：' + hits.join('、') : ''} +${preferenceScore}` : '未填写偏好，偏好项 +0']
    results.push({ tutor, score: 70 + priceScore + preferenceScore, reasons })
  }
  results.sort((a, b) => b.score - a.score || a.tutor.pricePerHour - b.tutor.pricePerHour || (a.tutor.id < b.tutor.id ? -1 : a.tutor.id > b.tutor.id ? 1 : 0))
  return { results, total: tutors.length, eligible: results.length, excluded }
}

/** 复用 C 的分页服务，完整读取公开候选；失败时不拿 Mock 冒充 API。 */
export async function loadMatchCandidates(service: { listTutors(query: {page:number;pageSize:number}): Promise<Tutor[]> }): Promise<Tutor[]> {
  const tutors = new Map<string, Tutor>()
  for (let page = 1; page <= 100; page++) {
    const batch = await service.listTutors({ page, pageSize: 50 })
    for (const tutor of batch) tutors.set(tutor.id, tutor)
    if (batch.length < 50) return [...tutors.values()]
  }
  throw new BusinessError('INVALID', '候选家教超过演示容量，请联系管理员缩小数据范围')
}
