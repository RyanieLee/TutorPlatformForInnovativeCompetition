import { describe, it, expect } from 'vitest'
import { createRequestScope, runConfirmedAction } from '../../../src/pages/tutor/shared/operations'

describe('请求归属与确认', () => {
  it('较早请求、旧账号和离页后的响应不能回填页面', () => {
    let identity: string | null = 'server:tutor-1:tutor'
    const scope = createRequestScope(() => identity)
    const first = scope.begin()
    expect(first.isCurrent()).toBe(true)
    const second = scope.begin()
    expect(first.isCurrent()).toBe(false)
    identity = 'server:admin-1:admin'
    expect(second.isCurrent()).toBe(false)
    const third = scope.begin()
    scope.invalidate()
    expect(third.isCurrent()).toBe(false)
  })
  it('取消确认不执行操作', async () => {
    let sent = 0
    const result = await runConfirmedAction({ confirm: async () => false, execute: async () => ++sent })
    expect(result.kind).toBe('cancelled')
    expect(sent).toBe(0)
  })
  it('确认成功返回真实结果，失败保留错误供页面处理', async () => {
    expect(await runConfirmedAction({ confirm: async () => true, execute: async () => '已接受' })).toEqual({ kind: 'success', value: '已接受' })
    await expect(runConfirmedAction({ confirm: async () => true, execute: async () => { throw new Error('状态冲突') } })).rejects.toThrow('状态冲突')
    let sent = 0
    await expect(runConfirmedAction({ confirm: async () => { throw new Error('确认失败') }, execute: async () => ++sent })).rejects.toThrow('确认失败')
    expect(sent).toBe(0)
  })
})
