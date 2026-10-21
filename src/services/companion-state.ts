import {reactive} from 'vue'
import type {ChatMessage} from './assistant'
export interface CompanionBubble{role:'user'|'assistant';content:string;source:'guide'|'local'|'model';matchBrief?:string;id:number}
const greeting=():CompanionBubble=>({role:'assistant',content:'我是小书灵。可以陪你梳理学习需求、查找知识点笔记，或打开订单地图。想从哪里开始？',source:'guide',id:0})
export const companionState=reactive({messages:[greeting()],history:[] as ChatMessage[],draft:'',mode:'auto' as 'auto'|'local',busy:false,error:'',version:0,owner:'guest',paused:false})
export function clearCompanion(){companionState.version++;companionState.messages=[greeting()];companionState.history=[];companionState.draft='';companionState.error='';companionState.busy=false}
export function ownCompanion(owner:string){if(owner!==companionState.owner){clearCompanion();companionState.owner=owner}}
