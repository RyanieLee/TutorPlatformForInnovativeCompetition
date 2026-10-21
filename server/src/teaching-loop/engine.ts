import preset from './course.json'
import {LoopError,type Course,type LoopState,type Command,type Feedback,type Suggestion,type ClassRecord,type ParentLoopView,type RecordInput,type EvidencePoint} from './types'
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value))
function invalid(message:string):never{throw new LoopError('INVALID',message)}
function conflict(message:string):never{throw new LoopError('CONFLICT',message)}
function text(v:any,max=2000){if(typeof v!=='string'||!v.trim()||v.length>max)invalid('请填写有效内容，且不要超过'+max+'字')}
function object(v:any,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))invalid('包含不支持的字段')}
function strings(v:any,min=1,max=20){if(!Array.isArray(v)||v.length<min||v.length>max)invalid('列表长度无效');v.forEach((x:unknown)=>text(x,500))}
export function validateCourse(value:unknown):asserts value is Course{
 const c=value as Course;object(c,['code','subject','grade','unit','student','goal','prerequisites','diagnostic','lessons'])
 for(const field of ['code','subject','grade','unit','student','goal','prerequisites'] as const)text(c[field],2000)
 if(c.subject!=='数学'||c.student!=='DEMO-STUDENT-01'||!Array.isArray(c.lessons)||c.lessons.length!==4)invalid('本轮演示为匿名初一数学四课课程')
 const questions=(list:any,ids:string[])=>{if(!Array.isArray(list)||list.length!==ids.length)invalid('请保留全部题目');list.forEach((q:any,i:number)=>{object(q,['id','prompt','answer','solution']);if(q.id!==ids[i])invalid('题目编号不能更改');for(const field of ['prompt','answer','solution'])text(q[field],1000)})}
 questions(c.diagnostic,preset.diagnostic.map(q=>q.id))
 c.lessons.forEach((l,i)=>{
  object(l,['id','title','goals','knowledge','blocks','examples','exercises','homework','observe']);if(l.id!=='L'+(i+1))invalid('课次编号不能更改')
  text(l.title,100);text(l.homework,2000);strings(l.goals);strings(l.knowledge);strings(l.observe)
  if(!Array.isArray(l.blocks)||l.blocks.length<3||l.blocks.length>12)invalid('请填写完整课堂安排')
  const ids=new Set<string>();let minutes=0
  for(const b of l.blocks){object(b,['id','minutes','teacher','student']);text(b.id,40);if(ids.has(b.id))invalid('环节编号不能重复');ids.add(b.id);if(!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>45)invalid('环节时长必须为正整数');minutes+=b.minutes;text(b.teacher,1500);text(b.student,1500)}
  if(minutes!==45)invalid('每节课的时间安排必须合计45分钟')
  questions(l.exercises,preset.lessons[i].exercises.map(q=>q.id));questions(l.examples,preset.lessons[i].examples.map(q=>q.id))
 })
}
export function createLoop(bookingId:string):LoopState{return{bookingId,revision:0,draft:null,versions:[],records:[],feedbacks:[],suggestions:[],receipts:[]}}
function currentCourse(s:LoopState):Course{return s.draft?.course??s.versions.at(-1)?.course??invalid('请先加载教学课程')}
function latestRecord(s:LoopState,id:string){const r=s.records.find(x=>x.id===id);if(!r)invalid('课堂记录不存在');if(s.records.filter(x=>x.lessonId===r.lessonId).at(-1)?.id!==r.id)conflict('课堂事实已更新，请重新生成反馈');return r}
function checkRecord(s:LoopState,r:RecordInput){
 object(r,['lessonId','date','completed','goalMet','results','errorTypes','observation','questions','consolidation'])
 const lesson=currentCourse(s).lessons.find(l=>l.id===r.lessonId);if(!lesson)invalid('课次不存在')
 if(typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date)invalid('授课日期无效')
 text(r.completed);text(r.goalMet,100);text(r.observation);text(r.questions);text(r.consolidation);strings(r.errorTypes,0,8)
 if(!Array.isArray(r.results)||r.results.length!==lesson.exercises.length)invalid('请逐题记录全部练习的正误')
 const ids=new Set();for(const result of r.results){object(result,['questionId','correct']);if(!lesson.exercises.some(q=>q.id===result.questionId)||ids.has(result.questionId)||typeof result.correct!=='boolean')invalid('题目记录无效');ids.add(result.questionId)}
}
function validateFeedback(s:LoopState,r:ClassRecord,f:Feedback){
 object(f,['id','recordId','lessonId','source','createdAt','promptVersion','correct','total','percent','strengths','consolidation','next','report','status','publishedAt'])
 const total=r.results.length,correct=r.results.filter(q=>q.correct).length
 if(f.recordId!==r.id||f.lessonId!==r.lessonId||f.total!==total||f.correct!==correct||f.percent!==Math.round(correct/total*100))invalid('反馈统计必须来自逐题事实')
 if(!['preset','model','manual'].includes(f.source))invalid('反馈来源无效');text(f.report,2000);text(f.promptVersion,80)
 const validRefs=new Set([...r.results.map(q=>q.questionId),'teacher-observation'])
 for(const field of ['strengths','consolidation','next'] as const){if(!Array.isArray(f[field])||!f[field].length||f[field].length>8)invalid('请提供结构化反馈');for(const point of f[field]){object(point,['text','evidenceRefs']);text(point.text,1000);strings(point.evidenceRefs,1,8);if(point.evidenceRefs.some(ref=>!validRefs.has(ref)))invalid('反馈引用了不存在的证据')}}
}
export function makePresetFeedback(s:LoopState,recordId:string,now:string):Feedback{
 const r=latestRecord(s,recordId),correct=r.results.filter(q=>q.correct),wrong=r.results.filter(q=>!q.correct),total=r.results.length,n=correct.length
 const evidence=[...wrong.map(q=>q.questionId),'teacher-observation']
 return{id:'',recordId:r.id,lessonId:r.lessonId,source:'preset',createdAt:now,promptVersion:'teaching-evidence-v1',correct:n,total,percent:Math.round(n/total*100),strengths:[{text:correct.length?'上述正确题目显示本次相应步骤能够完成；证据仅限本次练习。':'本次尚无正确题目证据，请教师进一步观察。',evidenceRefs:correct.length?correct.map(q=>q.questionId):['teacher-observation']}],consolidation:[{text:wrong.length?'结合教师观察，需巩固：'+r.consolidation:'继续通过迁移练习核对理解情况。',evidenceRefs:evidence}],next:[{text:wrong.length?'建议先安排10分钟针对性复习，再由教师决定后续进度。':'建议按原安排推进，并继续记录课堂证据。',evidenceRefs:evidence}],report:`本节已记录${n}/${total}题正确（${Math.round(n/total*100)}%）。完成内容：${r.completed}。需要继续巩固：${r.consolidation}。这是基于本次课堂记录的样例建议，需教师审核，不代表长期能力或提分效果。`,status:'draft',publishedAt:null}
}
export function makePresetRevision(s:LoopState,now:string):Suggestion{
 const plan=s.versions.at(-1);if(!plan)conflict('请先发布原始课程，保留可对比的v1')
 const r=s.records.filter(r=>r.lessonId==='L2').at(-1);if(!r)invalid('请先记录第二课课堂事实')
 const f=s.feedbacks.filter(f=>f.recordId===r.id&&f.status==='published').at(-1);if(!f)conflict('请先确认发布当前课堂事实的反馈')
 if(!['L2-Q4','L2-Q5'].every(id=>r.results.some(q=>q.questionId===id&&!q.correct))||!r.errorTypes.includes('移项符号'))invalid('此样例适用于Q4/Q5均错误且教师记录为移项符号问题；其他情况请手工备课或使用模型')
 const course=copy(plan.course),lesson=course.lessons[2],evidenceRefs=['L2-Q4','L2-Q5','teacher-observation']
 const original=lesson.blocks
 lesson.blocks=[copy(original[0]),{id:'sign-review',minutes:10,teacher:'依据第二课Q4/Q5进行移项符号专项复盘；引导用两边同时加2x、加4x解释变形。',student:'完成7−2x=x+1与9−4x=2x−3的迁移讲解，标出每步符号。'},copy(original[1]),{...copy(original[3]),minutes:15,teacher:'先完成去括号和移项分层练习，逐步核对负号；去分母专项推迟至后续补充课，经教师再确认。'},copy(original[4])]
 lesson.goals=['先巩固负系数和移项符号，再练习去括号','去分母教学推迟至后续补充课，由教师根据新证据安排']
 lesson.homework='先完成2道移项符号迁移题与2道去括号题，每步解释等式性质。原去分母练习保留为后续补充材料，本课不要求独立完成。'
 const changes=lesson.blocks.filter(b=>!original.some(o=>o.id===b.id&&JSON.stringify(o)===JSON.stringify(b))).map(b=>({originalBlock:original.find(o=>o.id===b.id)?.teacher??'无此专项环节',proposedBlock:b.teacher,durationDelta:b.minutes-(original.find(o=>o.id===b.id)?.minutes??0),why:'第二课Q4/Q5与教师记录提示需先巩固移项符号。',evidenceRefs}))
 changes.push({originalBlock:original[2].teacher,proposedBlock:'去分母环节移至后续补充课，待教师再确认。',durationDelta:-original[2].minutes,why:'为符号专项和练习腾出时间，总时长仍45分钟。',evidenceRefs})
 return{id:'',feedbackId:f.id,recordId:r.id,lessonId:'L3',baseVersion:plan.version,course,source:'preset',createdAt:now,why:'基于第二课Q4/Q5错误与已确认反馈，先复盘符号，再推进新内容；建议待教师确认。',evidenceRefs,changes,status:'pending'}
}
function checkSuggestion(s:LoopState,p:Suggestion){
 object(p,['id','feedbackId','recordId','lessonId','baseVersion','course','source','createdAt','why','evidenceRefs','changes','status']);validateCourse(p.course)
 const plan=s.versions.at(-1),r=latestRecord(s,p.recordId),f=s.feedbacks.find(x=>x.id===p.feedbackId&&x.recordId===r.id&&x.status==='published')
 if(!plan||p.baseVersion!==plan.version||!f)conflict('计划或已确认反馈已更新，请重新生成建议')
 if(p.lessonId!=='L3'||r.lessonId!=='L2')invalid('本轮修订支持第二课反馈调整第三课')
 if(p.course.lessons.some((l,i)=>i!==2&&JSON.stringify(l)!==JSON.stringify(plan.course.lessons[i])))invalid('调整建议只能修改第三课')
 for(const key of ['code','subject','grade','unit','student','goal','prerequisites','diagnostic'] as const)if(JSON.stringify(p.course[key])!==JSON.stringify(plan.course[key]))invalid('调整建议不能更改课程总体信息')
 if(!['preset','model','manual'].includes(p.source))invalid('建议来源无效');text(p.why,2000)
 const refs=new Set([...r.results.map(x=>x.questionId),'teacher-observation'])
 const evidence=(v:any)=>{strings(v,1,8);if(v.some((x:string)=>!refs.has(x)))invalid('修订引用了不存在的证据')};evidence(p.evidenceRefs)
 if(!Array.isArray(p.changes)||!p.changes.length||p.changes.length>15)invalid('请提供修订差异')
 for(const c of p.changes){object(c,['originalBlock','proposedBlock','durationDelta','why','evidenceRefs']);text(c.originalBlock);text(c.proposedBlock);text(c.why);if(!Number.isInteger(c.durationDelta)||Math.abs(c.durationDelta)>45)invalid('时长差异无效');evidence(c.evidenceRefs)}
 if(p.changes.reduce((n,c)=>n+c.durationDelta,0)!==0)invalid('修订环节的时长变化必须合计0分钟')
}
export function applyCommand(state:LoopState,command:Command,now:string):LoopState{
 object(command,['requestId','expectedRevision','type','payload']);text(command.requestId,100);if(command.requestId.length<8||!Number.isInteger(command.expectedRevision))invalid('请求标识或版本无效')
 const encoded=JSON.stringify(command),receipt=state.receipts.find(r=>r.id===command.requestId)
 if(receipt){if(receipt.command!==encoded)conflict('同一请求标识不能用于不同内容');return copy(state)}
 if(command.expectedRevision!==state.revision)conflict('内容已在其他窗口更新，请刷新后重试')
 const s=copy(state),p=command.payload??{},id=command.requestId;const source=()=>{if(p.source!==undefined&&!['preset','model','manual'].includes(p.source))invalid('课程来源无效');return p.source??'manual'}
 switch(command.type){
  case 'initialize':object(p,[]);if(s.draft||s.versions.length)conflict('已有教学计划，请继续编辑');s.draft={course:copy(preset),source:'preset',createdAt:now,explanation:'预置演示课程，非实时模型生成；请教师核对教学适配。'};break
  case 'saveDraft':object(p,['course','source']);validateCourse(p.course);s.draft={course:copy(p.course),source:source(),createdAt:now,explanation:'教师编辑草稿，发布前请核验题目与答案。'};break
  case 'discardDraft':object(p,[]);s.draft=null;break
  case 'publish':object(p,[]);if(!s.draft)conflict('没有待发布草稿');validateCourse(s.draft.course);s.versions.push({...s.draft,version:s.versions.length+1,publishedAt:now});s.draft=null;break
  case 'record':checkRecord(s,p as RecordInput);s.records.push({...copy(p as RecordInput),id,createdAt:now,planVersion:s.versions.at(-1)?.version??0});break
  case 'feedback':{object(p,['recordId','feedback']);const r=latestRecord(s,p.recordId);validateFeedback(s,r,p.feedback);s.feedbacks.push({...copy(p.feedback),id,createdAt:now,status:'draft',publishedAt:null});break}
  case 'editFeedback':{object(p,['feedbackId','report']);const f=s.feedbacks.find(f=>f.id===p.feedbackId);if(!f||f.status!=='draft')conflict('仅能编辑候选反馈');latestRecord(s,f.recordId);text(p.report);f.report=p.report;f.source='manual';break}
  case 'publishFeedback':{object(p,['feedbackId']);const f=s.feedbacks.find(f=>f.id===p.feedbackId);if(!f||f.status!=='draft')conflict('反馈已发布或不存在');latestRecord(s,f.recordId);f.status='published';f.publishedAt=now;break}
  case 'suggest':object(p,['suggestion']);if(s.draft)conflict('请先发布或撤销当前草稿，再比较已发布原版');checkSuggestion(s,p.suggestion);s.suggestions.push({...copy(p.suggestion),id,createdAt:now,status:'pending'});break
  case 'applyRevision':case 'rejectRevision':{object(p,['suggestionId']);const proposal=s.suggestions.find(x=>x.id===p.suggestionId);if(!proposal||proposal.status!=='pending')conflict('此建议已处理或不存在');checkSuggestion(s,proposal);if(command.type==='applyRevision'){if(s.draft)conflict('已有未发布草稿，请先处理');s.draft={course:copy(proposal.course),source:proposal.source,createdAt:now,explanation:proposal.why};proposal.status='applied'}else proposal.status='rejected';break}
  default:invalid('不支持的教学操作')
 }
 if(s.records.length>200||s.feedbacks.length>200||s.versions.length>100||s.suggestions.length>200||s.receipts.length>2000)invalid('演示历史已达上限，请使用其他演示预约')
 s.revision++;s.receipts.push({id,command:encoded});return s
}
export function parentView(s:LoopState):ParentLoopView{
 return copy({bookingId:s.bookingId,revision:s.revision,plan:s.versions.at(-1)??null,versions:s.versions,feedbacks:s.feedbacks.filter(f=>f.status==='published')})
}
export type {Course,LoopState,Command,Feedback,Suggestion,ClassRecord,ParentLoopView,EvidencePoint}
