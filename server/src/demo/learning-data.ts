/** 完全虚构的教学展示资料；不调用模型、不代表真实学生或教学成效。 */
import {createArchive,applyArchiveCommand,SAMPLE_ANALYSIS} from '../shared/student-archive-engine'
import type {ArchiveAction,ArchiveBooking} from '../shared/student-archive'
import {createLoop,applyCommand,makePresetFeedback,makePresetRevision} from '../teaching-loop/engine'
import type {Command} from '../teaching-loop/types'

export function createDemoLearningData(parentId:string,teacherId:string,now=new Date().toISOString()){
 const at=(day:number)=>new Date(Date.parse(now)+day*86400000).toISOString()
 const profiles=[
  {nickname:'林小禾（演示）',grade:'初一',goals:'先巩固异分母分数加法，再练习一元一次方程；学习用步骤解释计算依据。',stage:'complete'},
  {nickname:'陈知远（演示）',grade:'初一',goals:'识别移项和负号易错点，用等式性质说明变形过程。',stage:'draft'},
  {nickname:'周星然（演示）',grade:'六年级',goals:'通过分数图理解通分；训练完成后主动检查答案是否合理。',stage:'learning'},
  {nickname:'许安宁（演示）',grade:'初一',goals:'先通过试课了解基础和学习需求，再由家长决定共享哪些学习记录。',stage:'trial'}
 ] as const
 const students=profiles.map((profile,i)=>{
  const id='demo-learning-student-'+(i+1),booking:ArchiveBooking={id:'demo-learning-booking-'+(i+1),parentId,teacherId,teacherName:'小林老师',subject:'数学',status:'accepted'}
  let archive=createArchive(id,parentId,profile,at(-10-i))
  const run=(role:'parent'|'tutor',action:ArchiveAction)=>{archive=applyArchiveCommand(archive,{...action,expectedRevision:archive.revision,requestId:`demo-learning-${i}-${archive.revision}`},{actor:{id:role==='parent'?parentId:teacherId,role},bookings:[booking],now:at(-5),generatedAnalysis:SAMPLE_ANALYSIS})}
  run('parent',{type:'bindBooking',payload:{bookingId:booking.id}})
  run('tutor',{type:'recordTrial',payload:{bookingId:booking.id,observation:'【虚构演示】能够口述计算想法，遇到异分母加法时把分母直接相加；用分数图提示后能说明单位需要一致。下一次核对独立作答情况。'}})
  if(profile.stage!=='trial'){
   run('parent',{type:'confirmTrial',payload:{trialId:archive.trials[0].id}})
   run('parent',{type:'grant',payload:{bookingId:booking.id,level:'learning',expiresAt:at(30)}})
   run('parent',{type:'createReview',payload:{bookingId:booking.id,mode:'sample',consent:true,question:'【固定演示题】计算 1/2 + 1/3，并写出过程。',answer:'2/5：分子相加、分母相加。',referenceAnswer:'5/6，先通分为 3/6 + 2/6。'}})
   const reviewId=archive.reviews[0].id
   run('tutor',{type:'confirmReview',payload:{reviewId,teacherNote:'【虚构演示确认】本例只反映这道题的通分问题。训练时请说明为什么不能直接相加分母。'}})
   run('parent',{type:'submitAttempt',payload:{reviewId,answers:[{questionId:'q1',answer:i===1?'3/6 + 2/6 = 5/12，分母还要相加吗？':'把每份大小统一成六分之一，3/6 + 2/6 = 5/6。'}]}})
   run('tutor',{type:'observe',payload:{bookingId:booking.id,text:'【虚构教学观察】本次能在分数图提示下解释通分；需要继续用不同分母的题目验证独立迁移。此记录不作人格或长期能力判断。'}})
   run('tutor',{type:'saveReport',payload:{reviewId,text:`【虚构演示学情报告】${profile.nickname}\n一、证据：原题 1/2+1/3 回答2/5；已完成一次针对训练。\n二、训练表现：${i===1?'仍把同分母分数的分母相加，主动提出疑问，尚需确认计算单位。':'能写出3/6+2/6=5/6，并解释统一每份大小。'}\n三、教学判断：${i===1?'先复习同分母加法，暂不推进复杂题。':'本次订正理解有进展，仍需独立迁移题核验。'}\n四、范围：所有资料为人工编写的演示样例，非真实模型分析或教学成效。`,nextLesson:'45分钟备课建议：5分钟回顾作答；10分钟分数图解释通分；15分钟独立迁移练习；10分钟讲解错因；5分钟出口题。课后安排1/3+1/4与2/5+1/10，要求写出通分依据；由教师核对后发布。'}})
   if(profile.stage!=='draft')run('tutor',{type:'confirmReport',payload:{reportId:archive.reports[0].id}})
   if(profile.stage==='complete')run('parent',{type:'handover',payload:{reportIds:[archive.reports[0].id]}})
  }
  let loop=createLoop(booking.id)
  const loopRun=(type:Command['type'],payload:Command['payload'])=>{loop=applyCommand(loop,{type,payload,requestId:`demo-course-${i}-${loop.revision}`,expectedRevision:loop.revision},at(-3))}
  // 原有四课教学闭环限定匿名初一数学样例，只在对应年级预约展示。
  if(i<2){
   loopRun('initialize',{});loopRun('publish',{})
   const lesson=loop.versions[0].course.lessons[1]
   loopRun('record',{planVersion:1,lessonId:'L2',date:at(-3).slice(0,10),completed:'【虚构演示】完成等式性质与移项五题练习。',goalMet:'部分达成，需复习符号',results:lesson.exercises.map((q,j)=>({questionId:q.id,correct:j<3})),errorTypes:['移项符号'],observation:'【虚构演示】前三题正确，后两题未保持等式两边同步变形。',questions:'为什么移项后符号发生改变？',consolidation:'用两边同加同减解释移项，先巩固负号。'})
   loopRun('feedback',{recordId:loop.records[0].id,feedback:makePresetFeedback(loop,loop.records[0].id,at(-3))})
   loopRun('publishFeedback',{feedbackId:loop.feedbacks[0].id})
   loopRun('suggest',{suggestion:makePresetRevision(loop,at(-3))})
  }
  return{stage:profile.stage,archive,booking,loop:i<2?loop:null,messages:[
   {id:`demo-message-${i}-1`,senderId:parentId,senderRole:'parent' as const,requestId:`demo-message-${i}-1`,text:'【虚构演示沟通】希望先了解孩子的解题过程，课后请给出下次课的重点；只共享平台授权范围内的信息。',createdAt:at(-4)},
   {id:`demo-message-${i}-2`,senderId:teacherId,senderRole:'tutor' as const,requestId:`demo-message-${i}-2`,text:'【虚构演示沟通】已收到，将先做诊断题并记录错因。线下通勤可参考公开片区地图，具体时间双方再确认。',createdAt:at(-3)}
  ]}
 })
 return{now,students}
}
