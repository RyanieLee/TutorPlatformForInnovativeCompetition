<script setup lang="ts">
import AssistantRichText from '../../components/AssistantRichText.vue'
onMounted(syncNativeLabels);onUpdated(syncNativeLabels)
import {onMounted,onUpdated} from 'vue'
import {syncNativeLabels} from '../../utils/native-label'
const navigate=(url:string)=>uni.navigateTo({url})
import {ref,watch} from 'vue'
import {onHide,onUnload} from '@dcloudio/uni-app'
import ParentLayout from '../../components/ParentLayout.vue'
import {apiMode} from '../../config/runtime'
import {apiRequest} from '../../services/api/client'
import {currentSession,restoreSession} from '../../utils/session'
import {errorMessage} from '../../services/errors'
const question=ref(''),answer=ref(''),reference=ref(''),consent=ref(false),busy=ref(false),error=ref(''),reply=ref('')
let version=0
function reset(){version++;busy.value=false;reply.value='';question.value='';answer.value='';reference.value='';consent.value=false;error.value=''}
watch(()=>currentSession.value?.user.id,(_id,previous)=>{if(previous)reset()},{flush:'sync'})
function leave(){version++;busy.value=false}
onHide(leave);onUnload(leave)
async function review(){
 if(busy.value)return
 error.value=''
 if(!question.value.trim()||!answer.value.trim()||!consent.value){error.value='请填写题目和作答，并确认已移除个人信息。';return}
 if(!apiMode){error.value='当前为本机演示，不会生成批改结果。请切换 API 模式并由管理员配置模型。';return}
 const v=++version;busy.value=true;reply.value=''
 try{
  const session=await restoreSession();if(v!==version)return
  if(!session||!['parent','tutor'].includes(session.user.role)){error.value='请登录学生/家长或家教账户后批改。';return}
  const result=await apiRequest<{reply:string;source:'model'}>('POST','/api/assistant/homework-review-text',{question:question.value.trim(),answer:answer.value.trim(),reference:reference.value.trim(),consent:true})
  if(v===version)reply.value=result.reply
 }catch(cause){if(v===version)error.value=errorMessage(cause)}finally{if(v===version)busy.value=false}
}
function consentChanged(event:any){consent.value=event.detail.value.includes('consent')}
function example(){question.value='解方程：2x + 6 = 14。';answer.value='2x = 14 + 6 = 20，所以 x = 10。';reference.value='x = 4';reply.value='';error.value=''}
</script>
<template>
 <ParentLayout title="AI 作业批改">
  <view class="ai-review">
   <view class="ai-intro"><text class="ai-kicker">LEARNING / FEEDBACK</text><text class="ai-heading">把错误，变成下一步。</text><text class="ai-description">从题目和你的解法出发，看清错因，再试一次。</text></view>
   <view class="ai-state"><text>希望把分析、针对训练和备课报告保存到学生的长期学情档案？</text><button class="ai-secondary" @click="navigate('/pages/students/index')">进入学情档案与教学闭环</button></view><view class="ai-review-grid">
    <view class="ai-glass"><view class="ai-card-head"><text>文字作业</text><button role="button" tabindex="0" class="ai-secondary" :disabled="busy" @click="example" @keydown.enter.prevent="example" @keydown.space.prevent="example">填入示例</button></view>
     <label class="ai-field"><text>题目</text><textarea v-model="question" :disabled="busy" maxlength="2500" aria-label="题目" placeholder="粘贴完整题目与必要条件"/></label>
     <label class="ai-field"><text>我的作答</text><textarea v-model="answer" :disabled="busy" maxlength="2500" aria-label="我的作答" placeholder="保留你的解题过程，便于找到具体问题"/></label>
     <label class="ai-field"><text>参考答案（选填）</text><textarea v-model="reference" :disabled="busy" maxlength="1000" aria-label="参考答案" style="height:90px"/></label>
     <checkbox-group @change="consentChanged($event)"><label class="ai-check"><checkbox value="consent" :checked="consent" :disabled="busy" color="#2b573d"/><text>已移除姓名、学校、联系方式，同意将这些文字发送给配置的模型服务。</text></label></checkbox-group>
     <view class="ai-actions"><button role="button" tabindex="0" class="ai-primary" :disabled="busy||!question.trim()||!answer.trim()||!consent" :loading="busy" @click="review" @keydown.enter.prevent="review" @keydown.space.prevent="review">{{busy?'正在批改…':'开始批改'}}</button><button role="button" tabindex="0" class="ai-secondary" :disabled="busy" @click="navigate('/pages/assistant/index')" @keydown.enter.prevent="navigate('/pages/assistant/index')" @keydown.space.prevent="navigate('/pages/assistant/index')">图片批改与对话</button></view>
     <text v-if="error" class="ai-error" role="alert">{{error}}</text>
    </view>
    <view class="ai-glass"><view class="ai-card-head"><text>批改反馈</text><text class="ai-pill">{{reply?'模型生成':'等待提交'}}</text></view><text v-if="busy" class="ai-empty" role="status">正在核对思路与关键步骤，请稍候…</text><text v-else-if="!reply" class="ai-empty">提交后，这里将展示逐题判断、错因、修改建议和复习知识点。示例填入后也需要真实模型批改。</text><AssistantRichText v-if="reply" class="ai-output" :content="reply"/><view class="ai-note-rule"/><text class="ai-hint">AI 意见供学习参考，重要结论请与家教核对。页面离开后不会继续展示迟到结果，退出或切换账户会清空内容。</text></view>
   </view>
  </view>
 </ParentLayout>
</template>
<style scoped src="../../styles/ai-workspace.css"></style>
