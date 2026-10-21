import { z } from 'zod'
import topics from './content/learning-topics.json'
import { ApiError } from './core'
export const examRequestSchema=z.object({topicId:z.string().max(40),grade:z.string().max(20),difficulty:z.enum(['基础','巩固','提高']),count:z.union([z.literal(3),z.literal(5),z.literal(8)])}).strict().superRefine((value,ctx)=>{
 const topic=topics.find(t=>t.id===value.topicId)
 if(!topic||!topic.grades.includes(value.grade))ctx.addIssue({code:z.ZodIssueCode.custom,message:'主题与年级不匹配'})
})
export type ExamRequest=z.infer<typeof examRequestSchema>
const questionSchema=z.object({id:z.string().min(1).max(30),type:z.enum(['choice','short']),stem:z.string().trim().min(5).max(700),options:z.array(z.string().trim().min(1).max(200)).max(4),answer:z.string().trim().min(1).max(700),explanation:z.string().trim().min(5).max(1000),points:z.number().int().min(1).max(20)}).strict().superRefine((q,ctx)=>{
 if(q.type==='choice'&&(q.options.length!==4||!['A','B','C','D'].includes(q.answer)||new Set(q.options).size!==4))ctx.addIssue({code:'custom',message:'选择题需要四个不同选项和单个正确选项字母'})
 if(q.type==='short'&&q.options.length!==0)ctx.addIssue({code:'custom',message:'简答题不应包含选项'})
})
const outputSchema=z.object({title:z.string().trim().min(1).max(100),questions:z.array(questionSchema).min(3).max(8)}).strict()
export function validatePaper(value:unknown,input:ExamRequest){
 const parsed=outputSchema.safeParse(value)
 if(!parsed.success||parsed.data.questions.length!==input.count)throw new ApiError('MODEL_UPSTREAM',502,'试卷结构不符合要求，请重新生成或使用示例试卷')
 const data=parsed.data
 if(new Set(data.questions.map(q=>q.stem.replace(/\s/g,''))).size!==data.questions.length)throw new ApiError('MODEL_UPSTREAM',502,'题目存在重复，请重新生成')
 const questions=data.questions.map((q,i)=>({...q,id:`q${i+1}`,points:q.type==='choice'?5:10}))
 return {...data,questions,topicId:input.topicId,grade:input.grade,difficulty:input.difficulty,totalPoints:questions.reduce((sum,q)=>sum+q.points,0),source:'model' as const,createdAt:new Date().toISOString()}
}
export interface ExamModel{enabled:boolean;generate(input:ExamRequest):Promise<ReturnType<typeof validatePaper>>}
export function createExamModel(env:Record<string,string|undefined>=process.env,transport:typeof fetch=fetch):ExamModel{
 const unavailable=async()=>{throw new ApiError('MODEL_UNAVAILABLE',503,'尚未配置模型，可先使用原创示例试卷')}
 const base=env.MATCH_MODEL_BASE_URL?.trim(),name=env.MATCH_MODEL_NAME?.trim(),key=env.MATCH_MODEL_API_KEY?.trim()
 if(!base||!name)return{enabled:false,generate:unavailable}
 const url=new URL(base),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname)
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&local))||url.username||url.password||url.search||url.hash)throw new Error('模型地址必须是无凭据的HTTPS或本机HTTP')
 if(!local&&!key)return{enabled:false,generate:unavailable}
 const endpoint=new URL(url.pathname.replace(/\/+$/,'')+'/chat/completions',url.origin).toString()
 return {enabled:true,async generate(input){
  const topic=topics.find(t=>t.id===input.topicId)
  if(!topic)throw new ApiError('INVALID',400,'主题不存在')
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(45000,Math.max(1000,Number(env.EXAM_MODEL_TIMEOUT_MS)||30000)))
  try{
   const response=await transport(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify({model:name,temperature:0.4,max_tokens:5000,messages:[{role:'system',content:'你是练习题草稿编写助手。根据给定学段、年级、主题和原创笔记编写原创题，不声称来自真题或教材，不输出个人信息，不引用受版权保护的长文。只能输出JSON，不要Markdown。结构为{title:string,questions:[{id:string,type:"choice"或"short",stem:string,options:string[],answer:string,explanation:string,points:number}]}。选择题四个不同选项，answer仅A/B/C/D；简答题options为空数组，给出参考答案与解释。不需要图片、音频、外部材料，不生成未提供的时政事实。每道题应有完整作答条件，不重复。'},{role:'user',content:JSON.stringify({stage:topic.stage,subject:topic.subject,grade:input.grade,topic:topic.title,difficulty:input.difficulty,count:input.count,notes:topic.points,pitfalls:topic.pitfalls,example:topic.example})}]})})
   if(!response.ok||!response.body||Number(response.headers.get('content-length'))>65536)throw new Error('upstream')
   const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0
   try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>65536){await reader.cancel();throw new Error('oversize')}raw+=decoder.decode(chunk.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
   const content=JSON.parse(raw)?.choices?.[0]?.message?.content
   if(typeof content!=='string'||content.length>30000)throw new Error('invalid envelope')
   return validatePaper(JSON.parse(content),input)
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError('MODEL_UPSTREAM',controller.signal.aborted?504:502,controller.signal.aborted?'生成超时，请重试或使用示例试卷':'模型未返回可用试卷，请重试或使用示例试卷')}
  finally{clearTimeout(timer)}
 }}
}
