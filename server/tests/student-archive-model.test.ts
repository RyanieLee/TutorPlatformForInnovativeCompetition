import {it,expect} from 'vitest'
import {validateArchiveAnalysis} from '../src/student-archive/model'
it('strictly rejects invented fields and malformed training while accepting a bounded structured result',()=>{
 expect(()=>validateArchiveAnalysis({analysis:'unchecked'})).toThrow()
 expect(()=>validateArchiveAnalysis({knowledgePoints:['分数'],analysis:'通分遗漏',teachingAdvice:'检查',trainingTargets:['通分'],questions:[{id:'q1',stem:'计算1/2+1/3',answer:'5/6',explanation:'公分母6'}],masteryRate:99})).toThrow()
 expect(validateArchiveAnalysis({knowledgePoints:['分数'],analysis:'通分遗漏',teachingAdvice:'检查',trainingTargets:['通分'],questions:[{id:'q1',stem:'计算1/2+1/3',answer:'5/6',explanation:'公分母6'}]}).questions).toHaveLength(1)
})
