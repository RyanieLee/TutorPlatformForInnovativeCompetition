import {parseBriefLocally} from './brief-parser'
import {suggestionInput} from './study-match'
import {validateMatch} from './matching'
export function desiredSchedule(text:string):string{
 const normalized=text.replace(/星期/g,'周').replace(/周天/g,'周日')
 return normalized.match(/(?:周[一二三四五六日]|周末|工作日)(?:上午|下午|晚上)/)?.[0]??''
}
/** Explicit matching commands can run a read-only recommendation; never create an order. */
export function matchingCommand(text:string,prior:string[]=[]){
 if(/怎么|如何|说明|不要|不想|取消|别帮/.test(text)||!/(?:帮我|请|开始|直接|我要).*(?:匹配|找.*老师|推荐.*老师)/.test(text))return null
 const brief=[...prior.slice(-2),text].join('，')
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话|QQ号)/i.test(brief))return null
 const parsed=parseBriefLocally(brief.slice(-160))
 const input={...suggestionInput(parsed),desiredTime:desiredSchedule(brief)}
 const error=validateMatch(input)
 return {input,brief:brief.slice(-160),error}
}
