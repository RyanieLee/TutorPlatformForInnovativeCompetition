import { expect, it } from 'vitest'
import { parsePriceRange } from '../src/services/tutor-query'
it('空字段不构造价格限制，零和小数价格原样保留',()=>{
 expect(parsePriceRange('','')).toEqual({minPrice:undefined,maxPrice:undefined})
 expect(parsePriceRange('0','80.50')).toEqual({minPrice:0,maxPrice:80.5})
 expect(parsePriceRange(' 75 ', '')).toEqual({minPrice:75,maxPrice:undefined})
})
it.each([['100','80'],['-1','80'],['1e2',''],['','Infinity'],['0','2001'],['10.001','20']])('拒绝无效区间 %s / %s',(min,max)=>{
 expect(()=>parsePriceRange(min,max)).toThrow()
})
