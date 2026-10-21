<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import ParentLayout from '../../components/ParentLayout.vue'
import { learningTopics, resourceSources, examplePaper } from '../../data/learning'
import { stages, paperText, type Stage, type ExamPaper, type PaperRequest } from '../../../shared/learning'
import { examModelStatus, generateExam } from '../../services/learning'
import { apiMode } from '../../config/runtime'
import { restoreSession, currentSession } from '../../utils/session'
import { errorMessage } from '../../services/errors'
const tab=ref<'notes'|'exam'>('notes'),stage=ref<Stage>('初中'),subject=ref('数学'),selectedId=ref('topic-06')
const topic=computed(()=>learningTopics.find(t=>t.id===selectedId.value)!)
const subjects=computed(()=>[...new Set(learningTopics.filter(t=>t.stage===stage.value).map(t=>t.subject))])
const shown=computed(()=>learningTopics.filter(t=>t.stage===stage.value&&t.subject===subject.value))
const grade=ref('七年级'),difficulty=ref<PaperRequest['difficulty']>('基础'),count=ref<3|5|8>(5)
const paper=ref<ExamPaper|null>(null),showAnswers=ref(false),busy=ref(false),error=ref(''),checked=ref(false)
const answers=ref<Record<string,string>>({}),status=ref<'checking'|'enabled'|'disabled'|'error'>('checking')
const loginNeeded=ref(false),notice=ref('')
let version=0,statusVersion=0
onLoad(options=>{const found=learningTopics.find(t=>t.id===options?.topicId);if(found){stage.value=found.stage;subject.value=found.subject;pick(found.id)}})
onShow(()=>{const v=++statusVersion;void examModelStatus().then(s=>{if(v===statusVersion)status.value=s.enabled?'enabled':'disabled'}).catch(()=>{if(v===statusVersion)status.value='error'})})
onHide(()=>{version++;statusVersion++;busy.value=false})
function reset(){version++;paper.value=null;checked.value=false;answers.value={};showAnswers.value=false;error.value='';notice.value='';loginNeeded.value=false}
function pick(id:string){if(busy.value)return;selectedId.value=id;grade.value=topic.value.grades[0];reset()}
function chooseStage(value:Stage){if(busy.value)return;stage.value=value;subject.value=learningTopics.find(t=>t.stage===value)!.subject;pick(learningTopics.find(t=>t.stage===value&&t.subject===subject.value)!.id)}
function chooseSubject(value:string){if(busy.value)return;subject.value=value;pick(shown.value[0].id)}
function setGrade(index:number){grade.value=topic.value.grades[index]??topic.value.grades[0];reset()}
function demo(){reset();paper.value=examplePaper(topic.value.id,grade.value);tab.value='exam'}
async function generate(){
 if(busy.value||status.value!=='enabled')return
 reset();busy.value=true;const v=version
 try{
  const session=await restoreSession()
  if(!session){loginNeeded.value=true;error.value='请先登录演示账户，再返回此页生成AI试卷';return}
  if(v!==version)return
  const owner=session.user.id,input:PaperRequest={topicId:topic.value.id,grade:grade.value,difficulty:difficulty.value,count:count.value}
  const result=await generateExam(input)
  if(v===version&&currentSession.value?.user.id===owner)paper.value=result
 }catch(cause){if(v===version)error.value=errorMessage(cause)}finally{if(v===version)busy.value=false}
}
const choices=computed(()=>paper.value?.questions.filter(q=>q.type==='choice')??[])
const score=computed(()=>choices.value.reduce((sum,q)=>sum+(answers.value[q.id]===q.answer?q.points:0),0))
const maxScore=computed(()=>choices.value.reduce((sum,q)=>sum+q.points,0))
const correct=computed(()=>choices.value.filter(q=>answers.value[q.id]===q.answer).length)
function check(){checked.value=true;showAnswers.value=true}
function useTopic(){tab.value='exam';uni.pageScrollTo({scrollTop:0,duration:100})}
function openResource(url:string){
 // #ifdef H5
 window.open(url,'_blank','noopener,noreferrer')
 // #endif
 // #ifndef H5
 uni.setClipboardData({data:url,success:()=>uni.showToast({title:'已复制，请在浏览器打开',icon:'none'})})
 // #endif
}
function exportPaper(withAnswers:boolean){
 if(!paper.value)return
 const content=paperText(paper.value,withAnswers)
 // #ifdef H5
 const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${paper.value.title.replace(/[\\/:*?"<>|]/g,'-')}${withAnswers?'_含答案':'_无答案'}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 // #endif
 // #ifndef H5
 uni.setClipboardData({data:content})
 // #endif
 notice.value=withAnswers?'已导出试卷和参考答案':'已导出不含答案的试卷'
}
function printPaper(){
 // #ifdef H5
 window.print()
 // #endif
 // #ifndef H5
 notice.value='请使用导出或复制功能，再在电脑打印'
 // #endif
}
const login=()=>uni.navigateTo({url:'/pages/auth/login'})
const match=()=>uni.navigateTo({url:'/pages/match/index?topicId='+encodeURIComponent(topic.value.id)})
</script>
<template>
 <ParentLayout title="AI学习中心 · 资料、笔记与试卷" active="learning">
  <view class="learning-page">
   <view class="learning-hero no-print"><view><text class="kicker">AI LEARNING STUDIO</text><text class="title">先学一个知识点，再练一份专属卷。</text><text class="intro">小初高主要学科原创速记与官方资源入口。选主题即可练习，接入模型后可生成新题。</text></view><view class="hero-mark">学 · 练 · 讲</view></view>
   <view class="top-tabs no-print"><button :class="{active:tab==='notes'}" @click="tab='notes'">资料与笔记</button><button :class="{active:tab==='exam'}" @click="tab='exam'">AI生成试卷</button><button @click="match">AI匹配教师 ↗</button></view>
   <view class="selection no-print">
    <view class="chips"><button v-for="s in stages" :key="s" :disabled="busy" :class="{active:stage===s}" @click="chooseStage(s)">{{s}}</button></view>
    <view class="chips subjects"><button v-for="s in subjects" :key="s" :disabled="busy" :class="{active:subject===s}" @click="chooseSubject(s)">{{s}}</button></view>
    <view class="topic-select"><text>当前主题</text><button v-for="t in shown" :key="t.id" :disabled="busy" :class="{active:t.id===selectedId}" @click="pick(t.id)">{{t.title}}</button><text class="muted">{{learningTopics.length}}份原创入门笔记，非全学期教材</text></view>
   </view>
   <template v-if="tab==='notes'">
    <view class="content-grid">
     <view class="note-card"><text class="tag">原创速记 · {{topic.stage}} / {{topic.subject}}</text><text class="section-title">{{topic.title}}</text><text class="muted">适用参考：{{topic.grades.join('、')}}；按学习进度选用，不宣称对应某一版本的具体章节。</text>
      <text class="subheading">知识要点</text><view v-for="(p,i) in topic.points" :key="p" class="point">{{i+1}}. {{p}}</view>
      <text class="subheading">例子</text><view class="example">{{topic.example}}</view>
      <text class="subheading">易错提醒</text><view v-for="p in topic.pitfalls" :key="p" class="point">{{p}}</view>
      <text class="subheading">复习任务</text><view v-for="p in topic.tasks" :key="p" class="point">□ {{p}}</view><button class="primary" @click="useTopic">围绕这份笔记出一张卷 →</button>
     </view>
     <view class="sources"><text class="section-title">去官方原站继续学</text><text class="muted">仅整理链接，不转载教材或付费笔记。按当前的{{stage}}{{subject}}条件，在原站选择版本和年级。</text><view v-for="r in resourceSources.filter(r=>stage==='高中'?r.id!=='standard':r.id!=='highstandard')" :key="r.id" class="source-card"><text class="source-title">{{r.title}}</text><text class="muted">{{r.provider}}</text><text>{{r.description}}</text><text class="source-status">{{r.status}} · 检索日期 2026-10-21</text><button @click="openResource(r.url)">打开官方资料 ↗</button></view></view>
    </view>
   </template>
   <template v-else>
    <view class="exam-layout">
     <view class="exam-settings no-print"><text class="section-title">生成设置</text><text class="muted">{{topic.stage}} · {{topic.subject}} · {{topic.title}}</text><text class="subheading">年级</text><picker :range="topic.grades" :value="topic.grades.indexOf(grade)" :disabled="busy" @change="setGrade(Number($event.detail.value))"><view class="picker">{{grade}} ▾</view></picker>
      <text class="subheading">难度</text><view class="chips"><button v-for="d in (['基础','巩固','提高'] as const)" :key="d" :disabled="busy" :class="{active:difficulty===d}" @click="difficulty=d;reset()">{{d}}</button></view>
      <text class="subheading">题量</text><view class="chips"><button v-for="n in ([3,5,8] as const)" :key="n" :disabled="busy" :class="{active:count===n}" @click="count=n;reset()">{{n}}题</button></view>
      <button class="primary" :loading="busy" :disabled="busy||status!=='enabled'" @click="generate">{{busy?'AI正在出题…':'AI生成新试卷'}}</button>
      <text class="model-status">{{!apiMode?'当前为本机示例模式，未调用模型。':status==='enabled'?'模型已配置，点击生成会发送所选主题、年级和本站原创笔记，不发送答题内容。':status==='checking'?'正在检查模型配置…':status==='error'?'暂时无法连接模型状态，可使用示例试卷。':'后端尚未配置模型，可使用示例试卷。'}}</text>
      <button class="secondary" :disabled="busy" @click="demo">先体验3道原创示例题</button><text class="muted">示例为固定题库，题量与难度不随上方AI设置改变。AI输出是练习草案，需核对后使用。</text>
      <view v-if="error" class="error" role="alert">{{error}}<button v-if="loginNeeded" @click="login">前往登录</button></view>
     </view>
     <view class="paper-area">
      <view v-if="!paper" class="empty"><text class="empty-icon">✦</text><text class="section-title">一份练习，从一个知识点开始</text><text class="muted">选择左侧设置生成，或立即体验原创示例。支持答题、答案解析和有／无答案导出。</text></view>
      <view v-else class="paper" :class="{'answers-visible':showAnswers}"><text class="tag">{{paper.source==='model'?'AI生成 · 待核对':'原创示例题库 · 未调用AI'}}</text><text class="section-title">{{paper.title}}</text><text class="muted">{{paper.grade}} · {{paper.difficulty}} · {{paper.questions.length}}题 · {{paper.totalPoints}}分</text><text class="muted">本页为练习自测，答案在浏览器内可访问，不用于保密考试。简答题由老师或学生对照参考答案核对。</text>
       <view class="paper-actions no-print"><button @click="showAnswers=!showAnswers">{{showAnswers?'隐藏答案与解析':'显示答案与解析'}}</button><button @click="exportPaper(false)">导出无答案卷</button><button @click="exportPaper(true)">导出含答案卷</button><button @click="printPaper">打印当前试卷</button></view>
       <view v-if="notice" class="feedback no-print" role="status">{{notice}}</view>
       <view v-for="(q,i) in paper.questions" :key="q.id" class="question"><text class="question-title">{{i+1}}. {{q.stem}} <text class="muted">（{{q.points}}分）</text></text><view v-if="q.type==='choice'" class="options"><button v-for="(o,j) in q.options" :key="j" :class="{chosen:answers[q.id]==='ABCD'[j]}" @click="answers[q.id]='ABCD'[j];checked=false">{{'ABCD'[j]}}. {{o}}</button></view><textarea v-else v-model="answers[q.id]" class="short-answer" maxlength="1000" placeholder="写下你的思路，仅留在当前页面，不上传"/>
        <view v-if="showAnswers" class="answer"><text>参考答案：{{q.answer}}</text><text>{{q.explanation}}</text><text v-if="checked&&q.type==='choice'">{{!answers[q.id]?'尚未作答':answers[q.id]===q.answer?'选择正确':'建议回看笔记后重做'}}</text></view>
       </view>
       <view class="no-print"><button class="primary" @click="check">核对选择题并查看解析</button><view v-if="checked" class="feedback" role="status">选择题答对 {{correct}} / {{choices.length}}，得分 {{score}} / {{maxScore}}。简答题未自动评分；这不是整卷总分或学习能力评估。</view><view class="paper-actions"><button @click="tab='notes'">回看这份知识点笔记</button><button @click="match">找老师进一步讲解 ↗</button></view></view>
      </view>
     </view>
    </view>
   </template>
  </view>
 </ParentLayout>
</template>
<style scoped>
.learning-page{padding-bottom:30px}.learning-hero{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:34px;border-radius:22px;background:linear-gradient(115deg,#164a69,#258078);color:white}.kicker{display:block;letter-spacing:2px;font-size:12px;color:#c0e6d9}.title{display:block;font-size:30px;font-weight:800;line-height:1.5;margin:12px 0}.intro{font-size:15px;line-height:1.9;color:#e1efeb}.hero-mark{white-space:nowrap;font-size:20px;border:1px solid #ffffff66;border-radius:50%;padding:35px 20px}.top-tabs,.chips,.paper-actions{display:flex;flex-wrap:wrap;gap:8px}.top-tabs{margin:24px 0}.top-tabs button,.chips button,.paper-actions button,.topic-select button{margin:0;font-size:14px;background:#edf2f6;color:#33566a;border-radius:10px;padding:0 16px;line-height:2.8}.top-tabs .active,.chips .active,.topic-select .active{background:#176a62;color:white}.selection{border:1px solid #e1e8ed;background:white;border-radius:16px;padding:18px;margin-bottom:22px}.subjects{margin-top:12px}.topic-select{display:flex;align-items:center;flex-wrap:wrap;gap:12px;font-size:14px;margin-top:14px}.muted{display:block;font-size:13px;line-height:1.8;color:#718393}.content-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:22px}.note-card,.exam-settings,.paper,.empty{background:white;border:1px solid #e2e8ec;border-radius:18px;padding:26px;min-width:0}.tag{display:block;color:#177269;font-size:12px;font-weight:700;letter-spacing:.5px}.section-title{display:block;font-size:23px;line-height:1.5;font-weight:750;margin:12px 0;color:#203e50}.subheading{display:block;font-weight:700;margin:25px 0 12px;font-size:15px}.point{font-size:15px;line-height:1.9;margin:10px 0}.example{padding:18px;background:#eef6f1;border-radius:12px;font-size:15px;line-height:1.9}.primary,.secondary{margin:22px 0 12px;font-size:15px;border-radius:12px;padding:4px 16px;line-height:2.7}.primary{background:#176a62;color:white}.primary[disabled]{background:#c4d0d0;color:#607176}.secondary{background:#edf4f3;color:#176a62}.source-card{background:white;border:1px solid #e2e8ec;border-radius:14px;padding:20px;margin-top:16px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.8}.source-title{font-size:16px;font-weight:700}.source-status{font-size:11px;color:#82909b}.source-card button{margin:0;align-self:flex-start;font-size:13px;background:#eef4f8;color:#245c88;border-radius:9px}.exam-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:22px;align-items:start}.exam-settings .section-title{font-size:19px}.picker{background:#f1f5f7;padding:12px;border-radius:9px;font-size:14px}.model-status{display:block;font-size:12px;line-height:1.8;color:#527a74}.error{background:#fff0ed;color:#9b3838;padding:14px;border-radius:10px;margin-top:18px;font-size:14px}.empty{text-align:center;padding:65px 30px}.empty-icon{font-size:40px;color:#2b8677}.paper-actions{margin:18px 0}.paper-actions button{font-size:12px}.question{padding:25px 0;border-top:1px solid #e5eaed;margin-top:10px;break-inside:avoid}.question-title{display:block;font-size:16px;line-height:1.9;white-space:pre-wrap}.question-title .muted{display:inline}.options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.options button{background:#f4f7f9;border:1px solid #e4ebef;text-align:left;margin:0;white-space:normal;line-height:1.8;padding:12px;font-size:14px;border-radius:10px}.options .chosen{border-color:#176a62;background:#e4f4ee;color:#135e50}.short-answer{display:block;background:#f5f7f9;padding:14px;border-radius:10px;height:105px;width:100%;box-sizing:border-box;font-size:14px;margin-top:16px}.answer{background:#f0f6ef;padding:16px;border-radius:12px;margin-top:16px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.9}.feedback{padding:16px;background:#edf6f6;color:#28645f;font-size:14px;border-radius:10px;line-height:1.9}@media(max-width:760px){.learning-hero{padding:24px}.title{font-size:24px}.hero-mark{display:none}.content-grid,.exam-layout{grid-template-columns:minmax(0,1fr)}.options{grid-template-columns:minmax(0,1fr)}.note-card,.paper,.exam-settings{padding:20px}.section-title{font-size:20px}.topic-select .muted{width:100%}}@media print{.no-print{display:none!important}.exam-layout{display:block}.paper{border:0;padding:0}.question{break-inside:avoid}.options button{color:black!important;background:white!important;border:0}.short-answer{border:1px solid #aaa;background:white}.answer{background:white}}
</style>
