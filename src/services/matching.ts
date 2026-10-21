import { BusinessError } from './errors'
import { areaReference, distanceKm, validLocation, type LocationPoint } from './location'
import type { Tutor, TeachingMode } from '../types/tutor'

export const matchSubjects = ['数学', '英语', '语文', '物理', '化学'] as const
export const demoGrades = ['小学（演示）', '初中（演示）', '高中（演示）'] as const
export interface MatchInput {
  subject: string
  grade: string
  budget: string
  mode: TeachingMode
  preference: string
  parentLocation?: LocationPoint | null
  radiusKm?: number
}
export interface MatchResult { tutor: Tutor; score: number; reasons: string[]; distanceKm?:number }
export interface MatchResponse { results: MatchResult[]; total: number; eligible: number; excluded: { subject: number; budget: number; mode: number; distance:number } }
/** Weights can be changed at the matching page; score always uses a 100 point scale. */
export const matchWeights = { experience: 30, academic: 20, teaching: 20, cases: 15, preference: 10, budget: 5 }
export type MatchWeights = typeof matchWeights
export const matchFactors = [
  { key: 'experience', label: '教学经历' }, { key: 'academic', label: '相关课程成绩' },
  { key: 'teaching', label: '教学能力' }, { key: 'cases', label: '匿名案例' },
  { key: 'preference', label: '偏好契合' }, { key: 'budget', label: '价格余量' }
] as const
export function validateMatchWeights(weights: MatchWeights): string {
  if (matchFactors.some(({key}) => !Number.isInteger(weights[key]) || weights[key] < 0 || weights[key] > 50)) return '各评分权重应为 0–50 的整数'
  if (matchFactors.every(({key}) => weights[key] === 0)) return '至少保留一项评分权重'
  return ''
}

export function validateMatch(input: MatchInput): string {
  if (!matchSubjects.some(s => s === input.subject)) return '请选择科目'
  if (!demoGrades.some(g => g === input.grade)) return '请选择演示年级'
  if (!/^(?:\d{1,4})(?:\.\d{1,2})?$/.test(input.budget.trim()) || Number(input.budget) <= 0 || Number(input.budget) > 2000) return '预算请输入 0.01–2000 元的数字，最多两位小数'
  if (!['线上', '线下', '均可'].includes(input.mode)) return '请选择授课方式'
  if (input.preference.length > 40) return '偏好最多填写 40 个字，请勿输入个人信息'
  if (input.parentLocation && !validLocation(input.parentLocation)) return '请选择有效的西安参考位置'
  if (input.radiusKm!==undefined && (![5,10,20].includes(input.radiusKm)||!input.parentLocation||input.mode!=='线下')) return '附近筛选需选择家长位置与线下授课，距离为 5、10 或 20 公里'
  return ''
}

/** 规则演示，无模型调用。硬条件绝不为凑结果而放宽。 */
export function matchTutors(tutors: Tutor[], input: MatchInput, weights: MatchWeights = matchWeights): MatchResponse {
  const error = validateMatch(input)
  if (error) throw new Error(error)
  const weightError = validateMatchWeights(weights)
  if (weightError) throw new Error(weightError)
  const totalWeight = matchFactors.reduce((sum, {key}) => sum + weights[key], 0)
  const budget = Number(input.budget)
  const terms = [...new Set(input.preference.trim().toLowerCase().split(/[\s,，、;；]+/).filter(Boolean))]
  const excluded = { subject: 0, budget: 0, mode: 0, distance:0 }
  const results: MatchResult[] = []
  for (const tutor of tutors) {
    // 排除数按首个不满足的条件统计，各项互斥。
    if (!tutor.subjects.includes(input.subject)) { excluded.subject++; continue }
    if (!Number.isFinite(tutor.pricePerHour) || tutor.pricePerHour < 0 || tutor.pricePerHour > budget) { excluded.budget++; continue }
    if (input.mode !== '均可' && tutor.teachingMode !== '均可' && tutor.teachingMode !== input.mode) { excluded.mode++; continue }
    const point=areaReference(tutor.area)
    const distance=input.parentLocation&&tutor.teachingMode!=='线上'&&input.mode!=='线上'&&point?distanceKm(input.parentLocation,point):undefined
    if(input.radiusKm!==undefined&&(distance===undefined||distance>input.radiusKm)){excluded.distance++;continue}
    const text = [tutor.introduction, tutor.area, tutor.major, ...tutor.tags].join(' ').toLowerCase()
    const hits = terms.filter(term => text.includes(term))
    const ratio = (value: number | null | undefined, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value / max, 1) : 0
    const factors: Record<keyof MatchWeights, number> = {
      experience: ratio(tutor.experienceMonths, 36), academic: ratio(tutor.academicScore, 100),
      teaching: ratio(tutor.teachingSkillLevel, 5), cases: ratio(tutor.caseCount, 10),
      preference: terms.length ? hits.length / terms.length : 0,
      budget: Math.max(0, 1 - tutor.pricePerHour / budget)
    }
    const points = Object.fromEntries(matchFactors.map(({key}) => [key, Math.round(100 * weights[key] * factors[key] / totalWeight)])) as Record<keyof MatchWeights, number>
    const reasons = [
      `科目符合：${input.subject}；方式兼容：${tutor.teachingMode}（硬条件）`,
      `教学经历：自述 ${tutor.experienceMonths ?? '未填写'} 个月 +${points.experience}`,
      `相关课程成绩：自述 ${tutor.academicScore ?? '未填写'}/100 +${points.academic}`,
      `教学能力：自评 ${tutor.teachingSkillLevel ?? '未填写'}/5 +${points.teaching}`,
      `匿名案例：自述 ${tutor.caseCount ?? '未填写'} 个 +${points.cases}`,
      terms.length ? `偏好命中 ${hits.length}/${terms.length}${hits.length ? '：' + hits.join('、') : ''} +${points.preference}` : '未填写偏好，偏好项 +0',
      `课时费 ¥${tutor.pricePerHour} ≤ 预算 ¥${budget}，价格余量 +${points.budget}`
    ]
    if(input.parentLocation)reasons.push(input.mode==='线上'||tutor.teachingMode==='线上'?'线上授课：不受地理距离限制':distance===undefined?'未识别服务片区，无法估算距离':`距所选位置约 ${distance.toFixed(1)} km（片区参考直线距离，不是路线，不加分）`)
    results.push({ tutor, score: Math.min(100, matchFactors.reduce((sum, {key}) => sum + points[key], 0)), reasons, distanceKm:distance })
  }
  results.sort((a, b) => b.score - a.score || ((a.distanceKm??Infinity)===(b.distanceKm??Infinity)?0:(a.distanceKm??Infinity)-(b.distanceKm??Infinity)) || a.tutor.pricePerHour - b.tutor.pricePerHour || (a.tutor.id < b.tutor.id ? -1 : a.tutor.id > b.tutor.id ? 1 : 0))
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
