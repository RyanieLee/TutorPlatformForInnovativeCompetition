import { describe,expect,it } from 'vitest'
import { studyMatchContext,suggestionInput } from '../src/services/study-match'
import { learningTopics } from '../src/data/learning'
import { validateMatch } from '../src/services/matching'
describe('AI学习到家教匹配的上下文',()=>{
 it('只接受已知主题ID，不把查询参数当科目、价格或个人信息',()=>{
  expect(studyMatchContext('unknown')).toBeNull()
  expect(studyMatchContext(['topic-06'])).toBeNull()
  const context=studyMatchContext('topic-06')!
  expect(context.topic.title).toBe('一元一次方程')
  expect(context.input).toMatchObject({subject:'数学',grade:'初中（演示）',budget:'',preference:''})
  expect(validateMatch(context.input)).toContain('预算')
 })
 it('不支持的学科不静默改成数学，继续要求用户选择',()=>{
  const unsupported=learningTopics.find(t=>!['数学','语文','英语','物理','化学'].includes(t.subject))!
  const context=studyMatchContext(unsupported.id)!
  expect(context.supported).toBe(false);expect(context.input.subject).toBe('')
  expect(validateMatch(context.input)).toContain('科目')
 })
 it('未识别字段清空，不继承上一次预算或授课方式',()=>{
  const next=suggestionInput({subject:null,grade:null,budget:null,mode:null,preference:'耐心'})
  expect(next).toEqual({subject:'',grade:'',budget:'',mode:'均可',preference:'耐心'})
  expect(validateMatch(next)).toContain('科目')
 })
})
