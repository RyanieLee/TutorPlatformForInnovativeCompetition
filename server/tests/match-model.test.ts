import { describe, expect, it } from 'vitest'
import { containsPersonalInfo, createMatchModel } from '../src/match-model'

const env={MATCH_MODEL_BASE_URL:'https://model.example.test/v1',MATCH_MODEL_NAME:'fictional-chat',MATCH_MODEL_API_KEY:'test-only-key'}
const response=(content:string,status=200)=>new Response(JSON.stringify({choices:[{message:{content}}]}),{status})

describe('模型适配器',()=>{
 it('默认关闭；远端未提供密钥时也不启用',()=>{
  expect(createMatchModel({}).enabled).toBe(false)
  expect(createMatchModel({...env,MATCH_MODEL_API_KEY:''}).enabled).toBe(false)
  expect(()=>createMatchModel({...env,MATCH_MODEL_BASE_URL:'http://model.example.test/v1'})).toThrow('HTTPS')
  expect(createMatchModel({MATCH_MODEL_BASE_URL:'http://127.0.0.1:1234/v1',MATCH_MODEL_NAME:'local-chat'}).enabled).toBe(true)
 })
 it('仅发送用户需求和固定解析指令，验证结构化输出',async()=>{
  let sentUrl='',sentBody:Record<string,unknown>={},sentHeaders:HeadersInit={}
  const transport:typeof fetch=async(url,init)=>{
   sentUrl=String(url);sentBody=JSON.parse(String(init?.body));sentHeaders=init?.headers??{}
   return response('{"subject":"数学","grade":"初中（演示）","budget":80,"mode":"线上","preference":"耐心"}')
  }
  const parsed=await createMatchModel(env,transport).parse('初中数学，预算80元，希望线上耐心讲解')
  expect(parsed).toEqual({subject:'数学',grade:'初中（演示）',budget:80,mode:'线上',preference:'耐心'})
  expect(sentUrl).toBe('https://model.example.test/v1/chat/completions')
  expect(sentBody).toMatchObject({model:'fictional-chat',temperature:0,max_tokens:180})
  expect((sentBody.messages as {role:string;content:string}[])[1]).toEqual({role:'user',content:'初中数学，预算80元，希望线上耐心讲解'})
  expect(sentHeaders).toMatchObject({Authorization:'Bearer test-only-key'})
  expect(JSON.stringify(sentBody)).not.toContain('studentName')
 })
 it('无效模型结果和上游失败有明确错误，不能伪装为有效推荐',async()=>{
  const invalid:typeof fetch=async()=>response('{"subject":"不存在的科目","grade":null,"budget":80,"mode":null,"preference":null}')
  await expect(createMatchModel(env,invalid).parse('初中数学预算80元')).rejects.toMatchObject({code:'MODEL_UPSTREAM',status:502})
  const failed:typeof fetch=async()=>response('{}',429)
  await expect(createMatchModel(env,failed).parse('初中数学预算80元')).rejects.toMatchObject({code:'MODEL_UPSTREAM',status:502})
  const personal:typeof fetch=async()=>response('{"subject":"数学","grade":null,"budget":80,"mode":null,"preference":"电话13800138000"}')
  await expect(createMatchModel(env,personal).parse('初中数学预算80元')).rejects.toMatchObject({code:'MODEL_UPSTREAM',status:502})
 })
 it('识别常见联系方式及身份信息',()=>{
  expect(containsPersonalInfo('初中数学，电话13800138000')).toBe(true)
  expect(containsPersonalInfo('联系 a@example.test 上课')).toBe(true)
  expect(containsPersonalInfo('我的详细地址在学校旁边')).toBe(true)
  expect(containsPersonalInfo('初中数学，预算80元，线上')).toBe(false)
 })
})
