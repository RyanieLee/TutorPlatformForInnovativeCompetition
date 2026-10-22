import {parseBriefLocally} from './brief-parser'
import type {MatchSuggestion} from './api/match-assistant'
import {suggestionInput} from './study-match'
import {validateMatch} from './matching'
export function desiredSchedule(text:string):string{
 const normalized=text.replace(/星期/g,'周').replace(/周天/g,'周日')
 return normalized.match(/(?:周[一二三四五六日])\s*\d{1,2}[:：]\d{2}\s*[-–—~～至到]\s*\d{1,2}[:：]\d{2}/)?.[0]??normalized.match(/(?:周[一二三四五六日]|周末|工作日)(?:上午|下午|晚上)/)?.[0]??''
}
/** Explicit matching commands only query recommendations; they never create an order. */
export function matchingCommand(text:string,prior:string[]=[]){
 if(/怎么|如何|说明|不要|不想|取消|别帮/.test(text)||!/(?:帮我|请|开始|继续|按刚才|直接|我要).*(?:匹配|找.*老师|推荐.*老师)/.test(text))return null
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话|QQ号)/i.test(text))return null
 const parsed=parseBriefLocally((text.length<6?'需求：':'')+text.slice(0,157))
 const useHistory=/^(?:请帮我|帮我|请|现在)?(?:开始匹配|继续匹配|按刚才的需求匹配)[。！!]?$/.test(text.trim())
 // New requests start afresh. Only explicit continuation commands may reuse history.
 if(useHistory){
  for(const previous of [...prior.slice(-2)].reverse()){
   try{const old=parseBriefLocally(previous.slice(0,160));for(const key of ['subject','grade','budget','mode','preference'] as const){if(parsed[key]==null)(parsed as Record<keyof MatchSuggestion,unknown>)[key]=old[key]}}catch{/* unrelated/short turns supply no fields */}
  }
 }
 const time=desiredSchedule(text)||(!useHistory?'':[...prior.slice(-2)].reverse().map(desiredSchedule).find(Boolean)??'')
 const input={...suggestionInput(parsed),desiredTime:time}
 const error=validateMatch(input)
 // Pass canonical validated fields to the matching page, never ambiguous old prose.
 const brief=[input.grade.replace('（演示）',''),input.subject,input.budget?'预算'+input.budget+'元':'',input.mode,input.preference,time].filter(Boolean).join('，')
 return {input,brief,error}
}
