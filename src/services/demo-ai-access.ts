import {BusinessError} from './errors'
let accessCode='',pending:Promise<string>|null=null
export function clearDemoAiAccess(){accessCode=''}
export function requestDemoAiAccess():Promise<string>{
 if(accessCode)return Promise.resolve(accessCode)
 if(pending)return pending
 pending=new Promise<string>((resolve,reject)=>{
  uni.showModal({title:'AI 演示口令',content:'',editable:true,placeholderText:'输入项目成员提供的演示口令',confirmText:'使用 AI',
   success:result=>{const value=result.content?.trim();if(!result.confirm||!value){reject(new BusinessError('UNAUTHORIZED','已取消AI调用，未发送作业或问题'));return}if(value.length>128){reject(new BusinessError('INVALID','演示口令过长'));return}accessCode=value;resolve(value)},
   fail:()=>reject(new BusinessError('STORAGE','无法打开口令输入框，请刷新后重试'))})
 }).finally(()=>{pending=null})
 return pending
}
