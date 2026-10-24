import {afterEach,it,expect,vi} from 'vitest'
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules()})
async function setup(confirm=true){
 vi.stubEnv('VITE_DEMO_AI_GATEWAY','true');vi.stubEnv('VITE_API_BASE_URL','https://demo.example');vi.resetModules()
 const request=vi.fn((c:any)=>c.success({statusCode:200,data:{data:{reply:'模型回答',source:'model'}}}))
 const showModal=vi.fn((c:any)=>c.success({confirm,content:'example-access-code'}))
 vi.stubGlobal('uni',{request,showModal,getStorageSync:()=>'',removeStorageSync:vi.fn()})
 return{request,showModal,...await import('../src/services/api/client')}
}
it('在线演示首次AI请求索取口令，并仅对助手路径携带口令',async()=>{
 const h=await setup();await h.apiRequest('POST','/api/assistant/chat',{messages:[]})
 expect(h.showModal).toHaveBeenCalledOnce();expect(h.request.mock.calls[0][0].header['X-Demo-Access']).toBe('example-access-code')
 await h.apiRequest('POST','/api/assistant/chat',{messages:[]});expect(h.showModal).toHaveBeenCalledOnce()
 await h.apiRequest('GET','/api/assistant/status',undefined,false);expect(h.request.mock.calls[2][0].header['X-Demo-Access']).toBeUndefined()
 await expect(h.apiRequest('POST','/api/unrelated',{})).rejects.toMatchObject({code:'FORBIDDEN'})
})
it('取消口令不发送请求；错误口令不注销演示身份，下一次可以重输',async()=>{
 let h=await setup(false);await expect(h.apiRequest('POST','/api/assistant/chat',{})).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(h.request).not.toHaveBeenCalled()
 h=await setup();const expired=vi.fn();h.onUnauthorized(expired)
 h.request.mockImplementationOnce((c:any)=>c.success({statusCode:401,data:{error:{code:'UNAUTHORIZED',message:'演示口令不正确'}}}))
 await expect(h.apiRequest('POST','/api/assistant/chat',{})).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(expired).not.toHaveBeenCalled()
 await h.apiRequest('POST','/api/assistant/chat',{});expect(h.showModal).toHaveBeenCalledTimes(2)
})
it('口令输入期间离开原页面，不能再发送原来的AI内容',async()=>{
 const h=await setup();vi.stubGlobal('location',{href:'https://demo.example/#/assistant'})
 h.showModal.mockImplementationOnce((c:any)=>{location.href='https://demo.example/#/profile';c.success({confirm:true,content:'example-access-code'})})
 await expect(h.apiRequest('POST','/api/assistant/chat',{})).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(h.request).not.toHaveBeenCalled()
})
it('较长助手历史有界截取，不影响接着询问',async()=>{
 const h=await setup(),{remoteChat}=await import('../src/services/assistant')
 await remoteChat([{role:'assistant',content:'解题过程。'.repeat(1000)},{role:'user',content:'请再举例'}])
 const messages=h.request.mock.calls[0][0].data.messages
 expect(messages[0].content.length).toBeLessThanOrEqual(1500);expect(messages[1].content).toBe('请再举例')
})
