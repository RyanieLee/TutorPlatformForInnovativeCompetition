import type { MatchSuggestion } from './api/match-assistant'
/** 明确标注的离线关键词解析；不将其冒充供应商模型响应。 */
export function parseBriefLocally(brief:string):MatchSuggestion {
 if(brief.trim().length<6||brief.length>160)throw new Error('请填写 6–160 字需求')
 if(/(?:1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|身份证|微信|住址|姓名|电话)/i.test(brief))throw new Error('需求中不要填写姓名、联系方式或地址')
 const subjects=['数学','英语','语文','物理','化学'].filter(s=>brief.includes(s))
 const grades=['小学','初中','高中'].filter(g=>brief.includes(g))
 const price=brief.match(/(?:预算|上限)[^\d]{0,4}(\d+(?:\.\d{1,2})?)(?![\d.])/)??brief.match(/(\d+(?:\.\d{1,2})?)(?![\d.])\s*元/)
 const budget=price?Number(price[1]):null
 const online=brief.includes('线上'),offline=brief.includes('线下')
 return {subject:subjects.length===1?subjects[0]:null,grade:grades.length===1?grades[0]+'（演示）':null,budget:budget&&budget<=2000?budget:null,mode:brief.includes('均可')||(online&&offline)?'均可':online?'线上':offline?'线下':null,preference:['耐心','基础','错题','阅读','口语','作文','实验','习惯'].filter(w=>brief.includes(w)).join(' ')||null}
}
