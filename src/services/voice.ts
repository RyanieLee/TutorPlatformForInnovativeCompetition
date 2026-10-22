/** Browser speech adapters are optional. No microphone is opened before start(). */
interface SpeechResult{isFinal:boolean;0:{transcript:string}}
interface Recognition{
 lang:string;continuous:boolean;interimResults:boolean
 onresult:((e:{resultIndex:number;results:ArrayLike<SpeechResult>})=>void)|null
 onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null
 start():void;abort():void
}
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition}
export function createVoiceInput(callbacks:{text:(text:string)=>void;error:(message:string)=>void;end:()=>void}){
 const host=typeof window==='undefined'?undefined:window as SpeechWindow
 const Constructor=host?.SpeechRecognition??host?.webkitSpeechRecognition
 let recognition:Recognition|undefined,active=false
 const stop=()=>{active=false;if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.abort();recognition=undefined}}
 return {supported:!!Constructor,start(){
  if(!Constructor){callbacks.error('当前浏览器不支持语音识别，请使用文字输入或支持语音识别的浏览器。');return}
  stop();active=true
  try{
   recognition=new Constructor();recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=false
   recognition.onresult=e=>{if(!active)return;const text=Array.from(e.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join('').trim();if(text)callbacks.text(text.slice(0,500))}
   recognition.onerror=e=>{if(!active)return;callbacks.error(e.error==='not-allowed'?'麦克风权限未开启，请允许访问后重试；也可继续打字。':e.error==='no-speech'?'没有听清，请再试一次。':'语音识别暂不可用，请重试或使用文字输入。')}
   recognition.onend=()=>{if(active){active=false;callbacks.end()}}
   recognition.start()
  }catch{stop();callbacks.error('语音无法启动，请在 HTTPS 或本机页面中使用，并检查麦克风权限。');callbacks.end()}
 },stop}
}
export function voiceOutputSupported(){return typeof window!=='undefined'&&'speechSynthesis'in window&&typeof SpeechSynthesisUtterance!=='undefined'}
export function stopVoiceOutput(){if(voiceOutputSupported())window.speechSynthesis.cancel()}
export function speakReply(text:string){
 if(!voiceOutputSupported())return
 stopVoiceOutput();const speech=new SpeechSynthesisUtterance(text.slice(0,1500));speech.lang='zh-CN';window.speechSynthesis.speak(speech)
}
