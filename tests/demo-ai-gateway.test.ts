import {describe,it,expect,vi} from 'vitest'
import {createDemoGateway} from '../deploy/edgeone/gateway.mjs'
const now=Date.parse('2026-10-25T00:00:00Z')
const env={DEEPSEEK_API_KEY:'test-only-provider-secret',DEMO_AI_ACCESS_CODE:'test-only-access-code',DEMO_AI_EXPIRES_AT:'2026-10-26T00:00:00Z'}
const body={messages:[{role:'user',content:'解释一下二次函数的顶点'}]}
function request(path='/chat',data:any=body,code=env.DEMO_AI_ACCESS_CODE){return new Request('https://demo.example/api/assistant'+path,{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://demo.example','X-Demo-Access':code},body:JSON.stringify(data)})}
function setup(){const fetch=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'这是模拟上游的中文回答。'}}]})));return{fetch,gateway:createDemoGateway({fetch,now:()=>now})}}
describe('EdgeOne DeepSeek演示网关',()=>{
 it('多轮历史允许较长助手回答和通用隐私提醒，用户输入仍限500字',async()=>{
  const {gateway}=setup(),data={messages:[{role:'assistant',content:'不需要填写姓名。'+'解题步骤。'.repeat(150)},{role:'user',content:'再给一个例子'}]}
  expect((await gateway({request:request('/chat',data),env,clientIp:'a'})).status).toBe(200)
 })
 it('界面允许的最长中文题目、作答、参考答案可以正常提交',async()=>{
  const {gateway}=setup(),data={question:'题'.repeat(2500),answer:'答'.repeat(2500),reference:'解'.repeat(1000),consent:true}
  expect((await gateway({request:request('/homework-review-text',data),env,clientIp:'a'})).status).toBe(200)
 })
 it('空配置、到期、错误口令和跨源请求均不调用模型',async()=>{
  const {fetch,gateway}=setup()
  expect((await gateway({request:request(),env:{},clientIp:'a'})).status).toBe(503)
  expect((await gateway({request:request(),env:{...env,DEMO_AI_EXPIRES_AT:'2026-10-24T00:00:00Z'},clientIp:'a'})).status).toBe(503)
  expect((await gateway({request:request('/chat',body,'wrong'),env,clientIp:'a'})).status).toBe(401)
  const cross=request();cross.headers.set('Origin','https://other.example')
  expect((await gateway({request:cross,env,clientIp:'a'})).status).toBe(403)
  expect(fetch).not.toHaveBeenCalled()
 })
 it('固定DeepSeek地址、服务端凭据和输出限制，响应不含任何密钥',async()=>{
  const {fetch,gateway}=setup(),response=await gateway({request:request(),env,clientIp:'a'})
  expect(response.status).toBe(200)
  const [url,options]=fetch.mock.calls[0] as any
  expect(url).toBe('https://api.deepseek.com/chat/completions')
  expect(options.headers.Authorization).toBe('Bearer '+env.DEEPSEEK_API_KEY)
  const payload=JSON.parse(options.body);expect(payload.max_tokens).toBeLessThanOrEqual(1600);expect(payload.stream).toBe(false)
  const text=await response.text();expect(text).toContain('模拟上游');expect(text).not.toContain(env.DEEPSEEK_API_KEY);expect(text).not.toContain(env.DEMO_AI_ACCESS_CODE)
 })
 it('拒绝非法角色、个人信息、过长内容和未知路由',async()=>{
  const {fetch,gateway}=setup()
  for(const data of [{messages:[{role:'system',content:'bad'}]},{messages:[{role:'user',content:'姓名张三 电话13800000000'}]},{messages:[{role:'user',content:'a'.repeat(501)}]}])expect((await gateway({request:request('/chat',data),env,clientIp:'a'})).status).toBe(400)
  expect((await gateway({request:request('/unknown'),env,clientIp:'a'})).status).toBe(404)
  expect(fetch).not.toHaveBeenCalled()
 })
 it('文字作业要求主动同意，并要求模型输出错因、针对训练和备课建议',async()=>{
  const {fetch,gateway}=setup(),data={question:'计算2+3',answer:'6',reference:'5',consent:true}
  expect((await gateway({request:request('/homework-review-text',{...data,consent:false}),env,clientIp:'a'})).status).toBe(400)
  expect((await gateway({request:request('/homework-review-text',data),env,clientIp:'a'})).status).toBe(200)
  expect(JSON.parse((fetch.mock.calls[0] as any)[1].body).messages[1].content).toContain('针对训练')
 })
 it('每个实例限制同IP调用频率，并安全处理上游错误',async()=>{
  const {fetch,gateway}=setup()
  for(let i=0;i<3;i++)expect((await gateway({request:request(),env,clientIp:'a'})).status).toBe(200)
  expect((await gateway({request:request(),env,clientIp:'a'})).status).toBe(429);expect(fetch).toHaveBeenCalledTimes(3)
  fetch.mockImplementationOnce(async()=>new Response(env.DEEPSEEK_API_KEY,{status:500}))
  const failed=await gateway({request:request(),env,clientIp:'b'});expect(failed.status).toBe(502);expect(await failed.text()).not.toContain(env.DEEPSEEK_API_KEY)
 })
 it('检测到截断响应时不作为完整回答返回；图片能力明确关闭',async()=>{
  const {fetch,gateway}=setup();fetch.mockImplementationOnce(async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'unfinished'}}]})))
  const failed=await gateway({request:request(),env,clientIp:'a'});expect(failed.status).toBe(502)
  const image=await gateway({request:new Request('https://demo.example/api/assistant/homework-review/status'),env,clientIp:'a'})
  expect((await image.json()).data.enabled).toBe(false)
 })
})
