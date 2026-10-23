import {it,expect} from 'vitest'
import {createChatModel} from '../src/assistant'
it('uses a bounded structured-analysis profile without changing the conversational budget',async()=>{
 let content='学习'.repeat(1600)
 const calls:any[]=[],transport:typeof fetch=async(_url,init)=>{calls.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content}}]}))}
 const model=createChatModel({MATCH_MODEL_BASE_URL:'http://127.0.0.1:9999',MATCH_MODEL_NAME:'fixture'},transport)
 await expect(model.reply([{role:'user',content:'严格结构化学习分析'}],'learning-analysis')).resolves.toHaveLength(3200)
 expect(calls[0].max_tokens).toBe(4096)
 expect(calls[0].messages[0].content).toContain('严格JSON')
 await expect(model.reply([{role:'user',content:'普通对话'}])).resolves.toHaveLength(3200)
 expect(calls[1].max_tokens).toBe(4096)
 content='学习'.repeat(4000)
 await expect(model.reply([{role:'user',content:'严格JSON'}],'learning-analysis')).rejects.toMatchObject({code:'MODEL_UPSTREAM'})
 await expect(model.reply([{role:'user',content:'完整讲解'}])).resolves.toHaveLength(8000)
})
