import {it,expect} from 'vitest'
import {applicationSchema,draftSchema} from '../src/validation'
const base={displayName:'示例老师',university:'示例大学',major:'数学',subjects:['数学'],teachingMode:'均可',area:'长安区 · 大学城',pricePerHour:80,introduction:'字'.repeat(1000),availability:'周六下午'}
it('简介草稿和提交均接受1000字并拒绝1001字，片区可持久化到原审核流程',()=>{
 for(const schema of [applicationSchema,draftSchema]){
  expect(schema.safeParse(base).success).toBe(true)
  expect(schema.safeParse({...base,introduction:'字'.repeat(1001)}).success).toBe(false)
 }
})
