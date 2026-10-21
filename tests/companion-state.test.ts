import {describe,it,expect} from 'vitest'
import {companionState,clearCompanion,ownCompanion} from '../src/services/companion-state'
describe('小书灵会话归属',()=>{
 it('同账户跨页面保留；换账户清除草稿、历史和未完成请求',()=>{
  ownCompanion('account-a');clearCompanion()
  companionState.messages.push({id:5,role:'user',source:'guide',content:'上个账户的问题'})
  companionState.history=[{role:'user',content:'上个账户的问题'}];companionState.draft='未发送草稿';companionState.busy=true
  ownCompanion('account-a');expect(companionState.history).toHaveLength(1)
  const old=companionState.version;ownCompanion('account-b')
  expect(companionState.history).toEqual([]);expect(companionState.draft).toBe('');expect(companionState.busy).toBe(false)
  expect(companionState.version).toBeGreaterThan(old)
  expect(companionState.messages).toHaveLength(1);expect(companionState.messages[0].source).toBe('guide')
 })
})
