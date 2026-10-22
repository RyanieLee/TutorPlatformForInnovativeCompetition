import {describe,it,expect} from 'vitest'
import {timeCompatibility} from '../src/services/availability'
import {matchingCommand} from '../src/services/assistant-command'
import {matchTutors} from '../src/services/matching'
import {tutors} from '../src/mocks/tutors'
describe('空闲时间与明确匹配指令',()=>{
 it('不把不同日期的时段拼在一起，精确钟点必须被覆盖',()=>{
  expect(timeCompatibility('周六下午','周六上午、周日下午').ratio).toBe(0)
  expect(timeCompatibility('周六下午','周六上午周日下午').ratio).toBe(0)
  expect(timeCompatibility('周六14:00–15:00','周六14:00–17:00').ratio).toBe(1)
  expect(timeCompatibility('周六14:00–18:00','周六14:00–17:00').ratio).toBe(0)
  expect(timeCompatibility('周二晚上','周二、周四19:30–21:00').ratio).toBe(1)
  expect(timeCompatibility('周三晚上','周一至周五晚上').ratio).toBe(1)
  for(const offered of ['时间灵活','周六不方便下午','周六下午或晚上待确认',''])expect(timeCompatibility('周六下午',offered).ratio).toBe(0)
 })
 it('时间吻合优先于更便宜的老师；不会放宽科目和预算',()=>{
  const base={...tutors[0],experienceMonths:0,academicScore:0,teachingSkillLevel:0,caseCount:0,tags:[],introduction:''}
  const request={subject:'数学',grade:'初中（演示）',budget:'100',mode:'均可' as const,preference:'',desiredTime:'周六下午'}
  const result=matchTutors([{...base,id:'fits',pricePerHour:100,availability:'周六下午'},{...base,id:'cheap',pricePerHour:1,availability:'周日晚上'}],request)
  expect(result.results.map(r=>r.tutor.id)).toEqual(['fits','cheap'])
  expect(result.results.map(r=>r.score)).toEqual([65,45])
 })
 it('只执行明确且资料齐全的匹配指令，不执行使用说明或预约',()=>{
  const command=matchingCommand('请帮我匹配初中数学，预算100元，线上，周六下午')!
  expect(command.error).toBe('');expect(command.input.desiredTime).toBe('周六下午')
  expect(matchingCommand('请帮我匹配数学')?.error).toContain('年级')
  for(const text of ['怎么匹配老师','请不要帮我匹配初中数学预算100元','帮我预约老师','电话13800138000请帮我匹配初中数学预算100元'])expect(matchingCommand(text)).toBeNull()
 })
})
