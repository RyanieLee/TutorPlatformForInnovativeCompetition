import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'
import { newToken, tokenHash, ApiError } from '../src/core'
import { createExamModel, validatePaper, examRequestSchema, type ExamRequest } from '../src/learning-model'
const input:ExamRequest={topicId:'topic-06',grade:'七年级',difficulty:'基础',count:3}
const modelOutput={title:'一元一次方程练习',questions:Array.from({length:3},(_,i)=>({id:`x${i}`,type:'choice',stem:`方程x+${i+1}=${i+3}的解是？`,options:['1','2','3','4'],answer:'B',explanation:'等式两边减去同一个数，得到x=2。',points:20}))}
const env={MATCH_MODEL_BASE_URL:'https://model.example.test/v1',MATCH_MODEL_NAME:'test-model',MATCH_MODEL_API_KEY:'test-only-secret'}
const response=(value:unknown)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}))
describe('试卷模型适配与质量门槛',()=>{
 it('只发送固定主题和原创笔记，不发送用户身份或作答内容',async()=>{
  let sent=''
  const transport:typeof fetch=async(_url,init)=>{sent=String(init?.body);return response(modelOutput)}
  const paper=await createExamModel(env,transport).generate(input)
  expect(paper.source).toBe('model');expect(paper.questions.map(q=>q.id)).toEqual(['q1','q2','q3'])
  expect(paper.totalPoints).toBe(15)
  expect(sent).toContain('一元一次方程');expect(sent).not.toContain('password');expect(sent).not.toContain('userId');expect(sent).not.toContain('test-only-secret')
 })
 it('验证年级、题量、额外输入，拒绝无效或重复试题',()=>{
  for(const value of [{...input,grade:'高一'},{...input,count:100},{...input,studentName:'私人信息'}])expect(examRequestSchema.safeParse(value).success).toBe(false)
  expect(()=>validatePaper({...modelOutput,questions:modelOutput.questions.slice(1)},input)).toThrow(ApiError)
  expect(()=>validatePaper({...modelOutput,questions:[modelOutput.questions[0],modelOutput.questions[0],modelOutput.questions[2]]},input)).toThrow(ApiError)
  expect(()=>validatePaper({...modelOutput,questions:modelOutput.questions.map(q=>({...q,answer:'正确'}))},input)).toThrow(ApiError)
  expect(()=>validatePaper({...modelOutput,questions:modelOutput.questions.map(q=>({...q,options:['1','1','2','3']}))},input)).toThrow(ApiError)
 })
 it('未配置时明确关闭，上游错误不会伪装为示例或AI成功',async()=>{
  expect(createExamModel({}).enabled).toBe(false)
  await expect(createExamModel({}).generate(input)).rejects.toMatchObject({code:'MODEL_UNAVAILABLE',status:503})
  const bad:typeof fetch=async()=>response({garbage:true})
  await expect(createExamModel(env,bad).generate(input)).rejects.toMatchObject({code:'MODEL_UPSTREAM',status:502})
  const tooBig:typeof fetch=async()=>new Response('x'.repeat(70000))
  await expect(createExamModel(env,tooBig).generate(input)).rejects.toMatchObject({code:'MODEL_UPSTREAM',status:502})
 })
 it('支持5题和8题，但数量必须严格一致',()=>{
  for(const n of [5,8] as const){const questions=Array.from({length:n},(_,i)=>({...modelOutput.questions[0],stem:`方程x+${i+1}=${i+3}的解是？`}));expect(validatePaper({...modelOutput,questions},{...input,count:n}).questions).toHaveLength(n)}
 })
})
const db=new PrismaClient(),tokens:Record<string,string>={}
const app=buildApp(db,{enabled:false,parse:async()=>{throw new Error('unused')}},{enabled:true,generate:async data=>validatePaper(modelOutput,data)})
beforeAll(async()=>{await app.ready();for(const role of ['parent','tutor','admin','rate']){const user=await db.user.create({data:{loginId:`exam-${role}`,displayName:'虚构试卷测试',role:role==='rate'?'parent':role,passwordHash:'unused'}});tokens[role]=newToken();await db.session.create({data:{userId:user.id,tokenHash:tokenHash(tokens[role]),expiresAt:new Date(Date.now()+60000)}})}})
afterAll(()=>app.close())
const headers=(role:string)=>({authorization:`Bearer ${tokens[role]}`})
describe('试卷API',()=>{
 it('公开状态不泄露模型凭据，生成要求登录',async()=>{
  expect((await app.inject({method:'GET',url:'/api/learning/status'})).json()).toEqual({data:{enabled:true}})
  expect((await app.inject({method:'POST',url:'/api/learning/exams',payload:input})).statusCode).toBe(401)
 })
 it('三种已登录演示角色可生成，非法输入被拒绝',async()=>{
  for(const role of ['parent','tutor','admin']){const r=await app.inject({method:'POST',url:'/api/learning/exams',headers:headers(role),payload:input});expect(r.statusCode).toBe(200);expect(r.json().data.source).toBe('model')}
  expect((await app.inject({method:'POST',url:'/api/learning/exams',headers:headers('parent'),payload:{...input,grade:'高一'}})).statusCode).toBe(400)
 })
 it('每个用户每分钟最多5次，超限返回429',async()=>{
  const statuses=[];for(let i=0;i<6;i++)statuses.push((await app.inject({method:'POST',url:'/api/learning/exams',headers:headers('rate'),payload:input})).statusCode)
  expect(statuses).toEqual([200,200,200,200,200,429])
 })
})
