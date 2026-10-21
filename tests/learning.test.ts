import { describe, it, expect } from 'vitest'
import { examplePaper, learningTopics, resourceSources } from '../src/data/learning'
import { paperText } from '../shared/learning'
describe('原创学习资料与示例试卷',()=>{
 it('主要学科学段均有完整笔记与三道示例，答案选项有效',()=>{
  expect(learningTopics).toHaveLength(22)
  expect(new Set(learningTopics.map(t=>t.id)).size).toBe(22)
  for(const t of learningTopics){
   expect(t.points.length).toBeGreaterThanOrEqual(2)
   expect(t.example.length).toBeGreaterThan(10)
   const paper=examplePaper(t.id,t.grades[0])
   expect(paper.source).toBe('example');expect(paper.questions).toHaveLength(3)
   expect(paper.totalPoints).toBe(20)
   for(const q of paper.questions){
    if(q.type==='choice'){expect(q.options).toHaveLength(4);expect('ABCD').toContain(q.answer);expect(q.answer).toHaveLength(1)}
    else expect(q.options).toEqual([])
    expect(q.explanation.length).toBeGreaterThan(4)
   }
  }
 })
 it('拒绝不存在的主题或错配年级，不把示例称为AI生成',()=>{
  expect(()=>examplePaper('bad','七年级')).toThrow()
  expect(()=>examplePaper('topic-06','高一')).toThrow()
  expect(paperText(examplePaper('topic-06','七年级'),false)).toContain('未调用 AI')
 })
 it('无答案导出不含参考答案与解析，含答案版本可独立核对',()=>{
  const paper=examplePaper('topic-06','七年级')
  const plain=paperText(paper,false),withAnswers=paperText(paper,true)
  expect(plain).toContain('2x+3=11');expect(plain).not.toContain('参考答案与解析')
  expect(plain).not.toContain(paper.questions[0].explanation)
  expect(withAnswers).toContain('参考答案与解析');expect(withAnswers).toContain(paper.questions[0].explanation)
 })
 it('外链只使用经过整理的官方HTTPS入口',()=>{
  for(const r of resourceSources){const url=new URL(r.url);expect(url.protocol).toBe('https:');expect(['basic.smartedu.cn','www.pep.com.cn','www.moe.gov.cn']).toContain(url.hostname)}
 })
})
