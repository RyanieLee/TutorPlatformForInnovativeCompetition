import {afterEach,it,expect,vi} from 'vitest'
import {createVoiceInput} from '../src/services/voice'
afterEach(()=>vi.unstubAllGlobals())
it('不支持语音时保留可解释的文字入口',()=>{
 const error=vi.fn();const voice=createVoiceInput({text:vi.fn(),error,end:vi.fn()})
 expect(voice.supported).toBe(false);voice.start();expect(error).toHaveBeenCalledWith(expect.stringContaining('文字输入'))
})
it('离开页面后不处理迟到的识别结果，只收集最终文字',()=>{
 let instance:any
 class Recognition{onresult:any;onerror:any;onend:any;abort=vi.fn();start=vi.fn();constructor(){instance=this}}
 vi.stubGlobal('window',{SpeechRecognition:Recognition})
 const text=vi.fn(),voice=createVoiceInput({text,error:vi.fn(),end:vi.fn()})
 voice.start();expect(instance.start).toHaveBeenCalledOnce()
 instance.onresult({resultIndex:0,results:[{isFinal:false,0:{transcript:'中间结果'}},{isFinal:true,0:{transcript:'最终问题'}}]})
 expect(text).toHaveBeenCalledOnce();expect(text).toHaveBeenCalledWith('最终问题')
 const late=instance.onresult;voice.stop();late({resultIndex:0,results:[{isFinal:true,0:{transcript:'迟到'}}]})
 expect(text).toHaveBeenCalledTimes(1);expect(instance.abort).toHaveBeenCalledOnce()
})
