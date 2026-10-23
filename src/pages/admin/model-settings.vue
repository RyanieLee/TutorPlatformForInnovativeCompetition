<script setup lang="ts">
onMounted(syncNativeLabels);onUpdated(syncNativeLabels)
import {onMounted,onUpdated} from 'vue'
import {syncNativeLabels} from '../../utils/native-label'
import { ref } from 'vue'
import { restoreSession } from '../../utils/session'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import RoleShell from '../tutor/shared/RoleShell.vue'
import { useRolePage, identityKey } from '../tutor/shared/page'
import { apiMode } from '../../config/runtime'
import { loadModelSettings, saveModelSettings, testModelSettings, type ModelSettingsView } from '../../services/model-settings'
import { errorMessage } from '../../services/errors'
const baseUrl=ref('https://api.deepseek.com'), model=ref('deepseek-flash'), apiKey=ref('')
const enabled=ref(false), vision=ref(false), saved=ref<ModelSettingsView|null>(null)
const pending=ref(''), error=ref(''), feedback=ref(''), ready=ref(false), dirty=ref(false)
let generation=0
function clear(){generation++;apiKey.value='';saved.value=null;ready.value=false;feedback.value='';error.value='';pending.value=''}
const {authorized}=useRolePage('admin',clear)
function apply(data:ModelSettingsView){saved.value=data;baseUrl.value=data.baseUrl;model.value=data.model;enabled.value=data.enabled;vision.value=data.vision;apiKey.value='';dirty.value=false;ready.value=true}
async function run(kind:'load'|'save'|'test'){
 if(!apiMode||!authorized.value||pending.value)return
 const owner=identityKey(),v=++generation;pending.value=kind;error.value='';feedback.value=''
 try{
  if(kind==='load'){const data=await loadModelSettings();if(v===generation&&identityKey()===owner)apply(data)}
  if(kind==='save'){
   const data=await saveModelSettings({baseUrl:baseUrl.value,model:model.value,enabled:enabled.value,vision:vision.value,...(apiKey.value.trim()?{apiKey:apiKey.value.trim()}:{})})
   if(v===generation&&identityKey()===owner){apply(data);feedback.value='配置已保存，即时生效。现在可以测试连接。'}
  }
  if(kind==='test'){
   const result=await testModelSettings()
   if(v===generation&&identityKey()===owner)feedback.value=`连接成功 · ${result.model} · ${result.latencyMs} ms（文字接口；未测试图片）`
  }
 }catch(cause){if(v===generation&&identityKey()===owner)error.value=errorMessage(cause)}
 finally{if(v===generation){pending.value='';if(kind==='save')apiKey.value=''}}
}
onShow(async()=>{await restoreSession();void run('load')})
function toggleEnabled(event:any){enabled.value=event.detail.value;dirty.value=true}
function toggleVision(event:any){vision.value=event.detail.value;dirty.value=true}
function leave(){generation++;apiKey.value='';pending.value='';ready.value=false}
onHide(leave);onUnload(leave)
</script>
<template>
 <RoleShell title="模型接入" role="admin">
  <view v-if="authorized" class="ai-settings">
   <view class="ai-intro"><text class="ai-kicker">AI / CONNECTION</text><text class="ai-heading">先连接，再开始对话。</text><text class="ai-description">为学习问答和作业辅导配置同一个模型服务。</text></view>
   <view v-if="!apiMode" class="ai-state" role="status">当前为本机演示。模型接入需要启动后端并切换 API 模式，演示页面不会保存密钥。</view>
   <view v-if="apiMode&&!ready" class="ai-state"><text>{{pending==='load'?'正在读取配置…':'配置尚未加载'}}</text><button role="button" tabindex="0" v-if="!pending" @click="run('load')" @keydown.enter.prevent="run('load')" @keydown.space.prevent="run('load')">重新加载</button></view>
   <view class="ai-settings-grid">
    <view class="ai-glass">
     <view class="ai-card-head"><text>服务配置</text><text class="ai-pill">{{saved?.enabled?'已启用':'未启用'}}</text></view>
     <text class="ai-hint">DeepSeek · OpenAI 兼容接口</text>
     <text v-if="saved&&!saved.configured" class="ai-hint">尚未保存管理员配置。若部署环境已有模型配置，原配置继续生效；保存后以本页为准。</text>
     <label class="ai-field"><text>服务地址</text><input v-model="baseUrl" :disabled="!!pending||!apiMode||!ready" aria-label="服务地址" @input="dirty=true"/></label>
     <label class="ai-field"><text>模型名称</text><input v-model="model" :disabled="!!pending||!apiMode||!ready" aria-label="模型名称" @input="dirty=true"/></label>
     <label class="ai-field"><text>API 密钥 <text class="ai-hint">{{saved?.hasKey?'已保存 · 留空保留原密钥':'尚未填写'}}</text></text><input v-model="apiKey" password :disabled="!!pending||!apiMode||!ready" aria-label="API 密钥" placeholder="输入新密钥，保存后不再回显" @input="dirty=true"/></label>
     <view class="ai-toggle"><view><text>启用模型服务</text><text class="ai-hint">保存后用于聊天与文字批改</text></view><switch :checked="enabled" :disabled="!!pending||!apiMode||!ready" color="#2b573d" aria-label="启用模型服务" @change="toggleEnabled($event)"/></view>
     <view class="ai-toggle"><view><text>允许图片输入</text><text class="ai-hint">仅在所选模型支持视觉输入时开启</text></view><switch :checked="vision" :disabled="!!pending||!apiMode||!ready" color="#2b573d" aria-label="允许图片输入" @change="toggleVision($event)"/></view>
     <text v-if="saved?.storageError" class="ai-error">已保存配置无法解密，请检查服务端加密密钥或重新填写配置。</text>
     <view class="ai-actions"><button role="button" tabindex="0" class="ai-primary" :disabled="!!pending||!apiMode||!ready" :loading="pending==='save'" @click="run('save')" @keydown.enter.prevent="run('save')" @keydown.space.prevent="run('save')">保存配置</button><button role="button" tabindex="0" class="ai-secondary" :disabled="!!pending||!saved?.hasKey||dirty||!apiMode" :loading="pending==='test'" @click="run('test')" @keydown.enter.prevent="run('test')" @keydown.space.prevent="run('test')">测试连接</button></view>
     <text v-if="dirty" class="ai-hint">有未保存的修改，保存后再测试。</text>
     <text v-if="pending==='test'" class="ai-hint" role="status">正在调用模型文字接口，最多等待 30 秒…</text>
     <text v-if="error" class="ai-error" role="alert">{{error}}</text><text v-if="feedback" class="ai-success" role="status">{{feedback}}</text>
    </view>
    <view class="ai-setup-notes"><text class="ai-note-number">01 — 03</text><text class="ai-note-title">接入只需要三步</text><text>1. 填写服务地址、模型名称和密钥，保存配置。</text><text>2. 点击测试连接，确认文字接口可用。</text><text>3. 启用服务并保存，到悬浮助手或 AI 批改中试用。</text><view class="ai-note-rule"/><text>密钥加密保存在服务端，不写入浏览器存储，也不回传完整密钥。连接测试会产生少量 API 用量。</text><text>允许域名：{{saved?.allowedHosts.join('、')||'api.deepseek.com'}}。其他供应商由部署人员在服务端添加。</text><text>图片开关不代表视觉能力已验证，请用脱敏作业单独测试。</text></view>
   </view>
  </view>
 </RoleShell>
</template>
<style scoped src="../../styles/ai-workspace.css"></style>
