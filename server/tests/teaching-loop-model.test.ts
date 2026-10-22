import {it,expect} from 'vitest'
import {createTeachingModel} from '../src/teaching-loop/model'
import {createLoop,applyCommand} from '../src/teaching-loop/engine'
import course from '../src/teaching-loop/course.json'
const config={MATCH_MODEL_BASE_URL:'https://model.example.test/v1',MATCH_MODEL_NAME:'test',MATCH_MODEL_API_KEY:'fake-test-only'}
it('keeps model disabled without configuration',()=>{expect(createTeachingModel({}).enabled).toBe(false)})
it('generates a validated anonymous course command and rejects incorrect mathematics',async()=>{
 let sent=''
 const transport=async(_url:any,init:any)=>{sent=init.body;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(course)}}]}),{status:200})}
 const model=createTeachingModel(config,transport as any),cmd=await model.generate('course',createLoop('PRIVATE-BOOKING-ID'),'2026-10-22T00:00:00Z')
 expect(sent).not.toContain('PRIVATE-BOOKING-ID');expect(cmd.payload.source).toBe('model')
 expect(applyCommand(createLoop('PRIVATE-BOOKING-ID'),{...cmd,requestId:'model-command-1',expectedRevision:0},'2026-10-22').draft?.course.lessons).toHaveLength(4)
 const wrong=structuredClone(course);wrong.lessons[1].exercises[3].answer='x = 100'
 const invalid=createTeachingModel(config,(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(wrong)}}]})))as any)
 await expect(invalid.generate('course',createLoop('b'),'2026-10-22')).rejects.toMatchObject({code:'MODEL_UPSTREAM'})
})
it('rejects oversized and malformed upstream responses',async()=>{
 for(const response of [new Response('x'.repeat(200001)),new Response('{bad json')]){
  const model=createTeachingModel(config,(async()=>response)as any)
  await expect(model.generate('course',createLoop('b'),'2026-10-22')).rejects.toMatchObject({code:'MODEL_UPSTREAM'})
 }
})
