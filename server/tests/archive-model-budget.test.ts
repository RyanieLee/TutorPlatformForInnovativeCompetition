import {it,expect} from 'vitest'
import {createChatModel} from '../src/assistant'
it('uses a bounded structured-analysis profile without changing the conversational budget',async()=>{
 const calls:any[]=[],transport:typeof fetch=async(_url,init)=>{calls.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'学习'.repeat(1600)}}]}))}
 const model=createChatModel({MATCH_MODEL_BASE_URL:'http://127.0.0.1:9999',MATCH_MODEL_NAME:'fixture'},transport)
 await expect(model.reply([{role:'user',content:'严格结构化学习分析'}],'learning-analysis')).resolves.toHaveLength(3200)
 expect(calls[0].max_tokens).toBe(1800)
 expect(calls[0].messages[0].content).toContain('严格JSON')
 await expect(model.reply([{role:'user',content:'普通对话'}])).rejects.toMatchObject({code:'MODEL_UPSTREAM'})
 expect(calls[1].max_tokens).toBe(700)
})
