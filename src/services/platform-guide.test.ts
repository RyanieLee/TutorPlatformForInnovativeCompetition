import { describe, expect, it } from 'vitest'
import { platformHelpAnswer, platformGuideSummary, platformWelcome } from './platform-guide'

describe('领航云学堂小书灵平台指南', () => {
  it('提供家长可以直接照做的四步使用说明', () => {
    expect(platformHelpAnswer('平台怎么用')).toBe(platformGuideSummary)
    expect(platformGuideSummary).toContain('① 首页筛选老师')
    expect(platformGuideSummary).toContain('④ 「我的预约」')
    expect(platformWelcome).toContain('领航云学堂')
  })
  it('按任务解释匹配、预约和订单，而不是夸大自动操作', () => {
    expect(platformHelpAnswer('怎么匹配老师')).toContain('生成推荐')
    expect(platformHelpAnswer('怎么预约')).toContain('我的预约')
    expect(platformHelpAnswer('怎么取消预约')).toContain('无法在对话中直接查询')
  })
  it('作业批改明确要求文本作答和真实模型', () => {
    const answer=platformHelpAnswer('帮我批改作业')!
    expect(answer).toContain('题目 + 我的答案')
    expect(answer).toContain('模型')
    expect(answer).toContain('不能判定')
    expect(answer).toContain('无法读取上传的作业或图片')
  })
  it('学习和隐私指引忠于演示能力', () => {
    expect(platformHelpAnswer('学习中心能做什么')).toContain('固定示例题')
    expect(platformHelpAnswer('软件会泄露隐私吗')).toContain('未成年人个人信息')
    expect(platformHelpAnswer('随便说个冷笑话')).toBeNull()
  })
})
