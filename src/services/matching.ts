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
  desiredTime?: string
  parentLocation?: LocationPoint | null
  radiusKm?: number
}
export interface MatchResult { tutor: Tutor; score: number; reasons: string[]; distanceKm?:number }
export interface MatchResponse { results: MatchResult[]; total: number; eligible: number; excluded: { subject: number; budget: number; mode: number; distance:number } }
export const matchWeights = { subject: 35, time: 30, experience: 20, budget: 10, other: 5 } as const

/** 时间只按明确的星期/时段关键词比较，不能判断的资料不冒充吻合。 */
function timeCompatibility(wanted: string, offered: string): { score: number; note: string } {
  const tokens = ['周一','周二','周三','周四','周五','周六','周日','上午','下午','晚上']
  const normalize = (s: string) => s.replace(/星期([一二三四五六日天])/g, '周$1').replace(/周天/g, '周日')
  const a = normalize(wanted), b = normalize(offered)
  const requested = tokens.filter(x => a.includes(x))
  if (!requested.length) return {score: 0, note: '未指定可比较的星期或时段，时间项 +0'}
  if (/随时|时间灵活|均可/.test(b)) return {score: matchWeights.time, note: '老师标注时间灵活，需再次确认 +30'}
  const days = requested.filter(x => x.startsWith('周'))
  const periods = requested.filter(x => !x.startsWith('周'))
  const weekdays = /工作日|周一至周五|周一到周五/.test(b)
  const weekends = /周末|双休日/.test(b)
  const matchDay = (x: string) => b.includes(x) || (weekdays && ['周一','周二','周三','周四','周五'].includes(x)) || (weekends && ['周六','周日'].includes(x))
  const dayOK = !days.length || days.some(matchDay)
  const periodOK = !periods.length || periods.some(x => b.includes(x))
  const score = dayOK && periodOK ? matchWeights.time : 0
  return {score, note: score ? '期望星期与时段均吻合（待双方确认） +30' : '时间未确认吻合 +0'}
}

/** 仅识别公开介绍中明确写出的教学年限，不推断资历。 */
function experienceScore(tutor: Tutor): {score: number; note: string} {
  const text = [tutor.introduction, ...tutor.tags].join(' ')
  const years = [...text.matchAll(/(?:教学|家教|授课|辅导)(?:经验|经历)?\s*(\d{1,2})\s*年|(\d{1,2})\s*年(?:教学|家教|授课|辅导)(?:经验|经历)?/g)]
    .map(m => Number(m[1] || m[2]))
  const n = years.length ? Math.max(...years) : 0
  const score = Math.round(matchWeights.experience * Math.min(n, 3) / 3)
  return {score, note: n ? '简介声明约' + n + '年相关教学经历（未核实） +' + score : '未填写可核对的教学年限 +0'}
}

export function validateMatch(input: MatchInput): string {
  if (!matchSubjects.some(s => s === input.subject)) return '请选择科目'
  if (!demoGrades.some(g => g === input.grade)) return '请选择演示年级'
  if (!/^(?:\d{1,4})(?:\.\d{1,2})?$/.test(input.budget.trim()) || Number(input.budget) <= 0 || Number(input.budget) > 2000) return '预算请输入 0.01–2000 元的数字，最多两位小数'
  if (!['线上', '线下', '均可'].includes(input.mode)) return '请选择授课方式'
  if ((input.desiredTime ?? '').length > 100) return '期望授课时间最多100字'
  if (input.preference.length > 40) return '偏好最多填写 40 个字，请勿输入个人信息'
  if (input.parentLocation && !validLocation(input.parentLocation)) return '请选择有效的西安参考位置'
  if (input.radiusKm!==undefined && (![5,10,20].includes(input.radiusKm)||!input.parentLocation||input.mode!=='线下')) return '附近筛选需选择家长位置与线下授课，距离为 5、10 或 20 公里'
  return ''
}

/** 规则演示，无模型调用。硬条件绝不为凑结果而放宽。 */
export function matchTutors(tutors: Tutor[], input: MatchInput): MatchResponse {
  const error = validateMatch(input)
  if (error) throw new Error(error)
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
    const priceScore = Math.round(matchWeights.budget * (1 - tutor.pricePerHour / budget))
    const time = timeCompatibility(input.desiredTime?.trim() ?? '', tutor.availability ?? '')
    const experience = experienceScore(tutor)
    const text = [tutor.introduction, tutor.area, tutor.major, ...tutor.tags].join(' ').toLowerCase()
    const hits = terms.filter(term => text.includes(term))
    const preferenceScore = terms.length ? Math.round(matchWeights.other * hits.length / terms.length) : 0
    const reasons = [`科目匹配：${input.subject} +35`, time.note, experience.note, `授课方式兼容：${tutor.teachingMode}（必要条件，不加分）`, `课时费 ¥${tutor.pricePerHour} ≤ 预算 ¥${budget}，价格优势 +${priceScore}`,
      terms.length ? `偏好命中 ${hits.length}/${terms.length}${hits.length ? '：' + hits.join('、') : ''} +${preferenceScore}` : '未填写偏好，偏好项 +0']
    if(input.parentLocation)reasons.push(input.mode==='线上'||tutor.teachingMode==='线上'?'线上授课：不受地理距离限制':distance===undefined?'未识别服务片区，无法估算距离':`距所选位置约 ${distance.toFixed(1)} km（片区参考直线距离，不是路线，不加分）`)
    results.push({ tutor, score: matchWeights.subject + time.score + experience.score + priceScore + preferenceScore, reasons, distanceKm:distance })
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
