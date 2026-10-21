import { z } from 'zod'
import { ApiError } from './core'

const suggestionSchema = z.object({
 subject: z.enum(['数学','英语','语文','物理','化学']).nullable(),
 grade: z.enum(['小学（演示）','初中（演示）','高中（演示）']).nullable(),
 budget: z.number().min(0.01).max(2000).nullable(),
 mode: z.enum(['线上','线下','均可']).nullable(),
 preference: z.string().trim().max(40).nullable()
}).strict()

export type MatchSuggestion = z.infer<typeof suggestionSchema>
export interface MatchModel {
 readonly enabled: boolean
 parse(brief: string): Promise<MatchSuggestion>
}

const systemPrompt = `你只负责把家教需求整理成 JSON，不推荐家教、不修改预算、不推断缺失信息。\n必须只返回一个 JSON 对象，且恰好包含 subject、grade、budget、mode、preference 五个字段。\nsubject 只能是 数学/英语/语文/物理/化学；grade 只能是 小学（演示）/初中（演示）/高中（演示）；mode 只能是 线上/线下/均可；budget 是每小时人民币预算数字；preference 是不超过 40 字的教学偏好。未明确给出的字段必须为 null。不要输出姓名、联系方式、地址或解释。`
const unavailable = () => { throw new ApiError('MODEL_UNAVAILABLE',503,'模型解析尚未配置，请使用规则匹配表单') }

/** 用户主动提交的简短需求才会发送给模型；拦截常见联系方式和身份字段。 */
export function containsPersonalInfo(brief: string): boolean {
 return /(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{15,18}[xX]?|微信|手机号|电话|身份证|详细地址|住址|姓名|QQ号)/i.test(brief)
}

export function createMatchModel(env: Record<string,string|undefined> = process.env, transport: typeof fetch = fetch): MatchModel {
 const base=env.MATCH_MODEL_BASE_URL?.trim(),name=env.MATCH_MODEL_NAME?.trim(),key=env.MATCH_MODEL_API_KEY?.trim()
 if(!base||!name)return {enabled:false,parse:unavailable}
 let url:URL
 try { url=new URL(base) } catch { throw new Error('MATCH_MODEL_BASE_URL 不是有效 URL') }
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname)
 if((url.protocol!=='https:' && !(url.protocol==='http:'&&local))||url.username||url.password||url.search||url.hash)throw new Error('模型地址必须使用 HTTPS，或本机 HTTP，且不能包含凭据或查询参数')
 if(!local&&!key)return {enabled:false,parse:unavailable}
 const endpoint=new URL(url.pathname.replace(/\/+$/,'')+'/chat/completions',url.origin).toString()
 const timeout=Math.min(15000,Math.max(1000,Number(env.MATCH_MODEL_TIMEOUT_MS)||8000))
 return {
  enabled:true,
  async parse(brief:string):Promise<MatchSuggestion> {
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout)
   try {
    const response=await transport(endpoint,{
     method:'POST',signal:controller.signal,redirect:'error',
     headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},
     body:JSON.stringify({model:name,temperature:0,max_tokens:180,messages:[{role:'system',content:systemPrompt},{role:'user',content:brief}]})
    })
    if(!response.ok)throw new ApiError('MODEL_UPSTREAM',502,'模型服务暂时不可用，请手动填写需求')
    if(Number(response.headers.get('content-length'))>8192)throw new ApiError('MODEL_UPSTREAM',502,'模型响应过大，请手动填写需求')
    const raw=await response.text()
    if(raw.length>8192)throw new ApiError('MODEL_UPSTREAM',502,'模型响应过大，请手动填写需求')
    const envelope=z.object({choices:z.array(z.object({message:z.object({content:z.string()})})).min(1)}).safeParse(JSON.parse(raw))
    if(!envelope.success||envelope.data.choices[0].message.content.length>2000)throw new Error('invalid model response')
    const suggestion=suggestionSchema.safeParse(JSON.parse(envelope.data.choices[0].message.content))
    if(!suggestion.success)throw new Error('invalid model suggestion')
    if(suggestion.data.preference&&containsPersonalInfo(suggestion.data.preference))throw new Error('personal information in model suggestion')
    return suggestion.data
   } catch(error) {
    if(error instanceof ApiError)throw error
    if(controller.signal.aborted)throw new ApiError('MODEL_UPSTREAM',504,'模型解析超时，请手动填写需求')
    throw new ApiError('MODEL_UPSTREAM',502,'模型解析结果无效，请手动填写需求')
   } finally { clearTimeout(timer) }
  }
 }
}
