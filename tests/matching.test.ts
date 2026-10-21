import { describe, expect, it, vi } from 'vitest'
import { loadMatchCandidates, matchTutors, validateMatch, matchWeights, validateMatchWeights } from '../src/services/matching'
import type { MatchInput } from '../src/services/matching'
import type { Tutor } from '../src/types/tutor'
import { tutors as catalog } from '../src/mocks/tutors'
const tutors=catalog.slice(0,6)
const input: MatchInput = { subject:'数学',grade:'初中（演示）',budget:'100',mode:'均可',preference:'耐心 讲解' }
describe('可解释推荐', () => {
  it('硬过滤和解释对应真实字段；得分与公开公式一致', () => {
    const response = matchTutors(tutors,input)
    expect(response.results[0].tutor.id).toBe('t001')
    expect(response.results[0].score).toBe(86)
    expect(response.results[0].reasons.join(' ')).toContain('教学经历：自述 30 个月 +25')
    expect(response.results[0].reasons.join(' ')).toContain('价格余量 +1')
    expect(response.results[0].reasons.join(' ')).toContain('偏好命中 2/2：耐心、讲解 +10')
    expect(response.total).toBe(response.eligible+Object.values(response.excluded).reduce((a,b)=>a+b,0))
  })
  it('不因偏好放宽预算、科目或授课方式', () => {
    const response = matchTutors(tutors,{...input,budget:'80',mode:'线下'})
    expect(response.results.map(r=>r.tutor.id)).toEqual(['t001'])
    expect(matchTutors(tutors,{...input,budget:'1'}).results).toEqual([])
    expect(matchTutors(tutors,{...input,subject:'英语',mode:'线下'}).results).toEqual([])
  })
  it('空偏好不给额外分；年级只做摘要，不影响排序', () => {
    const a=matchTutors(tutors,{...input,preference:''})
    const b=matchTutors(tutors,{...input,preference:'',grade:'小学（演示）'})
    expect(a).toEqual(b)
    expect(a.results[0].tutor.id).toBe('t001')
    expect(a.results[0].score).toBe(76)
  })
  it('同分按价格和 ID 稳定排序，不修改输入数组', () => {
    const list=[{...tutors[0],id:'z'},{...tutors[0],id:'a'}]
    expect(matchTutors(list,input).results.map(r=>r.tutor.id)).toEqual(['a','z'])
    expect(list.map(t=>t.id)).toEqual(['z','a'])
  })
  it('可以提高某一因子权重，价格默认不压过教学经历', () => {
    const experienced={...tutors[0],id:'experienced',pricePerHour:80,experienceMonths:36,academicScore:0,teachingSkillLevel:0,caseCount:0,introduction:'',tags:[]}
    const cheap={...experienced,id:'cheap',pricePerHour:20,experienceMonths:0}
    const request={...input,preference:''}
    expect(matchTutors([cheap,experienced],request).results[0].tutor.id).toBe('experienced')
    const priceOnly={...matchWeights,experience:0,academic:0,teaching:0,cases:0,preference:0,budget:50}
    expect(matchTutors([cheap,experienced],request,priceOnly).results[0].tutor.id).toBe('cheap')
  })
  it('缺失经历和能力资料不推断为高分，拒绝全部为零的权重', () => {
    const absent={...tutors[0],experienceMonths:undefined,academicScore:undefined,teachingSkillLevel:undefined,caseCount:undefined}
    const result=matchTutors([absent],{...input,preference:''}).results[0]
    expect(result.score).toBe(1)
    expect(result.reasons.join(' ')).toContain('教学经历：自述 未填写 个月 +0')
    expect(validateMatchWeights({...matchWeights,experience:51})).toContain('0–50')
    expect(()=>matchTutors([absent],input,{experience:0,academic:0,teaching:0,cases:0,preference:0,budget:0})).toThrow('至少')
  })
  it.each(['','-1','0','2001','Infinity','NaN','abc','1e2','1.123'])('拒绝无效预算 %s', budget => {
    expect(validateMatch({...input,budget})).toContain('预算')
    expect(()=>matchTutors(tutors,{...input,budget})).toThrow()
  })
  it('拒绝缺失或无效必填条件和过长偏好', () => {
    expect(validateMatch({...input,subject:''})).toContain('科目')
    expect(validateMatch({...input,grade:''})).toContain('年级')
    expect(validateMatch({...input,mode:'其他' as '线上'})).toContain('方式')
    expect(validateMatch({...input,preference:'字'.repeat(41)})).toContain('40')
    expect(validateMatch({...input,budget:'0.01'})).toBe('')
    expect(validateMatch({...input,budget:'2000'})).toBe('')
  })
  it('无数据返回明确空结果，不引入虚构候选', () => {
    expect(matchTutors([],input)).toMatchObject({results:[],total:0,eligible:0})
  })
  it('读取第二页并按 ID 去重，避免只推荐第一页', async () => {
    const batch=Array.from({length:50},(_,i)=>({...tutors[0],id:String(i)}))
    const listTutors=vi.fn().mockResolvedValueOnce(batch).mockResolvedValueOnce([batch[0],{...tutors[0],id:'last'}])
    const result=await loadMatchCandidates({listTutors})
    expect(listTutors).toHaveBeenNthCalledWith(2,{page:2,pageSize:50})
    expect(result).toHaveLength(51)
    expect(result[50].id).toBe('last')
  })
  it('API 中途失败不静默回退或使用部分数据', async () => {
    const listTutors=vi.fn().mockResolvedValueOnce(Array.from({length:50},()=>tutors[0])).mockRejectedValueOnce(new Error('offline'))
    await expect(loadMatchCandidates({listTutors})).rejects.toThrow('offline')
  })
  it('异常超大数据终止读取而非无限请求', async () => {
    const listTutors=vi.fn().mockResolvedValue(Array.from({length:50},()=>tutors[0]))
    await expect(loadMatchCandidates({listTutors})).rejects.toThrow('容量')
    expect(listTutors).toHaveBeenCalledTimes(100)
  })
})
