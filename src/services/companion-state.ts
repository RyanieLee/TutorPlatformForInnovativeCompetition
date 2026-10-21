import {reactive} from 'vue'
import type {ChatMessage} from './assistant'
import {platformWelcome} from './platform-guide'
export interface CompanionBubble{role:'user'|'assistant';content:string;source:'guide'|'local'|'model';matchBrief?:string;id:number}
const greeting=():CompanionBubble=>({role:'assistant',content:platformWelcome,source:'guide',id:0})
export const companionState=reactive({messages:[greeting()],history:[] as ChatMessage[],draft:'',mode:'auto' as 'auto'|'local',busy:false,error:'',version:0,owner:'guest',paused:false})
export function clearCompanion(){companionState.version++;companionState.messages=[greeting()];companionState.history=[];companionState.draft='';companionState.error='';companionState.busy=false}
export function ownCompanion(owner:string){if(owner!==companionState.owner){clearCompanion();companionState.owner=owner}}
