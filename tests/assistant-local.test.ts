import { describe, expect, it } from 'vitest'
import { localChat } from '../src/services/assistant'

describe('小书灵本机演示能力', () => {
  it('优先检索相关笔记，不把学科问题误判成找老师需求', () => {
    const answer = localChat('初中数学方程怎么解')
    expect(answer.source).toBe('local')
    expect(answer.matchBrief).toBeUndefined()
    expect(answer.reply).toContain('一元一次方程')
    expect(answer.reply).toContain('本站原创笔记')
  })

  it('明确的找老师需求仍可带入匹配页面', () => {
    const answer = localChat('帮我找初中数学老师，预算100元，线上授课')
    expect(answer.matchBrief).toContain('初中数学老师')
    expect(answer.reply).toContain('不会自动提交预约')
  })

  it('未配置模型时不谎称已经批改作业', () => {
    const answer = localChat('请帮我批改作业')
    expect(answer.reply).toContain('不能判定')
    expect(answer.reply).toContain('视觉输入的模型')
  })
})
