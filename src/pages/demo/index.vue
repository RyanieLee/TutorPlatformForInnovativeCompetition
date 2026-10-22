<script setup lang="ts">
import {ref} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import ParentLayout from '../../components/ParentLayout.vue'
import {apiMode} from '../../config/runtime'
import {companionStatus,homeworkImageReviewStatus} from '../../services/assistant'
import {learningTopics} from '../../data/learning'
const textStatus=ref('正在检查'),imageStatus=ref('正在检查')
let version=0
onShow(async()=>{
 const current=++version
 const result=await Promise.allSettled([companionStatus(),homeworkImageReviewStatus()])
 if(current!==version)return
 textStatus.value=result[0].status==='fulfilled'?(result[0].value.enabled?'已配置，可尝试模型问答':'未配置，可体验本机指南'):'暂不可读取，可体验本机指南'
 imageStatus.value=result[1].status==='fulfilled'?(result[1].value.enabled?'已配置，需支持视觉输入':'未配置，可粘贴文字题目'):'暂不可读取，请稍后检查'
})
onHide(()=>{version++})
function go(url:string){uni.navigateTo({url})}
function study(){const topic=learningTopics.find(t=>t.title.includes('一元一次方程'));go('/pages/learning/index'+(topic?'?topicId='+encodeURIComponent(topic.id):''))}
const steps=[
 {id:'dialog',time:'0:00–1:00',title:'一句话说出学习需求',text:'点开小书灵，核对示例后发送；也可以语音说出科目、年级、预算和空闲时间。',button:'打开对话示例',url:'/pages/assistant/index?starter=match',evidence:'看点：语音 → 条件整理 → 自动进入推荐；不自动预约。'},
 {id:'match',time:'1:00–2:00',title:'看懂推荐为什么适合',text:'带入初中数学、100元、周六下午。点击生成推荐，查看35/30/20/10/5逐项得分，再选片区比较距离。',button:'带入匹配示例',url:'/pages/match/index?demoScenario=math',evidence:'看点：学科与时间优先；预算硬筛选，未知时间不加分。'},
 {id:'map',time:'2:00–2:40',title:'在西安地图看订单',text:'无需登录即可查看固定虚构案例；点击片区圆点看对应信息。切到账户订单后，登录查看自己的预约。',button:'打开订单地图示例',url:'/pages/order-map/index?example=1',evidence:'看点：地图与信息联动；账户订单每10秒刷新，示例不会伪造新订单。'}
]
</script>
<template>
 <ParentLayout title="5分钟演示导航 · 先体验，再看完整业务" active="demo">
  <view class="demo-page">
   <view class="demo-hero"><text class="demo-kicker">AI辅助 · 教师把关 · 家长知情</text><text class="demo-title">把功能串成一条学习服务链</text><text>说需求 → 解释推荐 → 预约地图 → 学习练习 → 教师反馈与修订。</text><text class="demo-source">{{apiMode?'当前读取开发服务器，资料为虚构演示数据。':'当前为本机演示，记录只在当前浏览器保存。'}} 以下入口不会清空已有记录。</text></view>
   <view class="demo-status" role="status"><view><text>文字模型</text><text>{{textStatus}}</text></view><view><text>作业图片模型</text><text>{{imageStatus}}</text></view><text>“已配置”不代表已完成真实调用验证。未配置时，需求规则、固定笔记和教学样例仍可体验，来源都会标明。</text></view>
   <view class="demo-steps">
    <view v-for="(step,index) in steps" :key="step.id" class="demo-step" :data-testid="'demo-step-'+step.id"><view class="step-top"><text class="step-number">0{{index+1}}</text><text class="step-time">{{step.time}}</text></view><text class="step-title">{{step.title}}</text><text>{{step.text}}</text><text class="step-evidence">{{step.evidence}}</text><button @click="go(step.url)">{{step.button}} →</button></view>
    <view class="demo-step" data-testid="demo-step-learning"><view class="step-top"><text class="step-number">04</text><text class="step-time">2:40–3:40</text></view><text class="step-title">知识点、练习与老师接力</text><text>打开一元一次方程笔记，体验3道原创示例题、核对解析，再从这个知识点找老师。</text><text class="step-evidence">看点：知识点上下文带入匹配；模型生成与固定例题清楚区分。</text><button @click="study">打开知识点示例 →</button></view>
    <view class="demo-step" data-testid="demo-step-teaching"><view class="step-top"><text class="step-number">05</text><text class="step-time">3:40–5:00</text></view><text class="step-title">课堂事实 → 教师确认 → 课程修订</text><text>家教打开已接受预约的“教学计划与课后反馈”，展示四课预置课程、第二课3/5记录、证据反馈和第三课v2修订。</text><text class="step-evidence">看点：建议先成草稿，教师确认后家长才可见；60%仅指虚构案例的5道题，不是提分效果。</text><button @click="go('/pages/tutor/workbench')">前往家教工作台 →</button></view>
   </view>
   <view class="demo-ready"><text class="step-title">上场前先走一遍</text><text>① 需要展示教学闭环时，提前由家长创建虚构数学预约，并让家教接受；不要标记完成。</text><text>② 手机先验证麦克风权限；不支持时，用已填好的文字示例完成同一路径。</text><text>③ 地图底图需要网络；底图不可用时，可用片区按钮与对应订单列表继续讲解。</text><text>④ API演示先登录初始化账户；本机演示在同一浏览器切换角色。不要现场清空数据。</text><text>完整业务闭环仍沿用：老师详情 → 家长提交 → 家教接单 → 家长查询 → 管理员审核。当前没有真实支付、通知或身份核验。</text></view>
  </view>
 </ParentLayout>
</template>
<style scoped>
.demo-page{color:#284d64;line-height:1.75;font-size:14px}.demo-hero{display:flex;flex-direction:column;gap:12px;background:linear-gradient(120deg,#e5f7f2,#e4f0ff);border:1px solid #fff;border-radius:26px;padding:28px}.demo-kicker{font-size:12px;font-weight:700;color:#278477}.demo-title{font-size:30px;font-weight:800;line-height:1.4}.demo-source{font-size:12px;color:#5a7180}.demo-status{display:flex;flex-wrap:wrap;gap:12px;padding:18px;margin:18px 0;background:#ffffffd9;border:1px solid #d3e5e9;border-radius:18px}.demo-status>view{display:flex;flex-direction:column;flex:1;min-width:200px}.demo-status>view>text:first-child{font-weight:700}.demo-status>text{width:100%;font-size:12px;color:#617580}.demo-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.demo-step{display:flex;flex-direction:column;gap:12px;padding:24px;border-radius:22px;background:#ffffffea;border:1px solid #d6e5ed;min-width:0}.step-top{display:flex;align-items:center;justify-content:space-between}.step-number{color:#168478;font-size:25px;font-weight:800}.step-time{font-size:12px;color:#6c8191}.step-title{font-size:20px;font-weight:750;line-height:1.5;display:block}.step-evidence{font-size:12px;color:#507383;background:#eef6fa;padding:12px;border-radius:12px}.demo-step button{margin:auto 0 0;background:#177f87;color:#fff;min-height:44px;font-size:14px;line-height:2.9;border-radius:13px}.demo-ready{margin:22px 0;background:#f8fbf6;border:1px solid #d5e3cd;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:12px;font-size:13px;color:#567065}@media(max-width:700px){.demo-title{font-size:24px}.demo-hero,.demo-step,.demo-ready{padding:20px}.demo-steps{grid-template-columns:minmax(0,1fr)}.demo-status>view{min-width:0;flex-basis:100%}.step-title{font-size:18px}}
</style>
