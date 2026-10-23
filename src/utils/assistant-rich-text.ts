import MarkdownIt from 'markdown-it'
import katex from 'katex'
import DOMPurify from 'dompurify'

const markdown=new MarkdownIt({html:false,breaks:true,linkify:true,typographer:false,maxNesting:20})
markdown.validateLink=url=>/^(?:https?:\/\/|#|\/(?!\/))/i.test(url)
const escape=markdown.utils.escapeHtml
function math(source:string,displayMode:boolean){
 if(source.length>4000)return `<code>${escape(source)}</code>`
 try{return katex.renderToString(source,{displayMode,throwOnError:false,trust:false,maxExpand:100,maxSize:12,output:'htmlAndMathml',strict:'ignore'})}
 catch{return `<code>${escape(source)}</code>`}
}
const delimiters=[['$$','$$',true],['\\[','\\]',true],['\\(','\\)',false],['$','$',false]] as const
markdown.inline.ruler.before('escape','assistant_math',(state,silent)=>{
 for(const [left,right,display] of delimiters){
  if(!state.src.startsWith(left,state.pos))continue
  const start=state.pos+left.length
  if(left==='$'&&/\s/.test(state.src[start]||''))return false
  let end=state.src.indexOf(right,start)
  while(end>=0){
   let escapes=0;for(let i=end-1;i>=start&&state.src[i]==='\\';i--)escapes++
   if(escapes%2===0)break
   end=state.src.indexOf(right,end+right.length)
  }
  if(end<0||end===start)return false
  // Avoid interpreting ordinary currency such as "$100 and $200" as math.
  if(left==='$'&&(/\s/.test(state.src[end-1])||/\d/.test(state.src[end+1]||'')))return false
  if(!silent){const token=state.push('assistant_math','',0);token.content=state.src.slice(start,end);token.meta={display}}
  state.pos=end+right.length;return true
 }
 return false
})
markdown.block.ruler.before('fence','assistant_math_block',(state,startLine,endLine,silent)=>{
 const first=state.src.slice(state.bMarks[startLine]+state.tShift[startLine],state.eMarks[startLine])
 const pair=first.startsWith('$$')?['$$','$$']:first.startsWith('\\[')?['\\[','\\]']:undefined
 if(!pair)return false
 let source=first.slice(pair[0].length),line=startLine,end=source.indexOf(pair[1])
 while(end<0&&line+1<endLine){line++;source+='\n'+state.src.slice(state.bMarks[line]+state.tShift[line],state.eMarks[line]);end=source.indexOf(pair[1])}
 if(end<0||source.slice(end+pair[1].length).trim())return false
 if(silent)return true
 const token=state.push('assistant_math_block','',0);token.content=source.slice(0,end).trim();token.map=[startLine,line+1];token.block=true
 state.line=line+1;return true
})
markdown.renderer.rules.assistant_math=(tokens,index)=>math(tokens[index].content,!!tokens[index].meta?.display)
markdown.renderer.rules.assistant_math_block=(tokens,index)=>`<div class="assistant-math-block">${math(tokens[index].content,true)}</div>\n`
// A model-supplied image must not silently fetch an arbitrary tracking URL.
markdown.renderer.rules.image=(tokens,index)=>`<span>${escape(tokens[index].content||'图片')}</span>`
const linkOpen=markdown.renderer.rules.link_open
markdown.renderer.rules.link_open=(tokens,index,options,env,self)=>{
 tokens[index].attrSet('target','_blank');tokens[index].attrSet('rel','noopener noreferrer')
 return linkOpen?linkOpen(tokens,index,options,env,self):self.renderToken(tokens,index,options)
}
export function renderAssistantRichText(source:string):string{
 const rendered=markdown.render(source.slice(0,12000))
 return DOMPurify.sanitize(rendered,{
  USE_PROFILES:{html:true,mathMl:true,svg:true},
  FORBID_TAGS:['img','video','audio','iframe','object','embed','form','input','button','style','foreignObject'],
  ADD_ATTR:['target'],ALLOW_DATA_ATTR:false,SANITIZE_NAMED_PROPS:true
 })
}
