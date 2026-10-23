import {it,expect} from 'vitest'
import {teachingHarness} from './teaching-fixtures'
const input={displayName:'撤回演示老师',university:'示例大学',major:'人文教育',subjects:['思想政治','地理','历史'],teachingMode:'线上',area:'示例地区',pricePerHour:80,introduction:'虚构教学资料，采用分步骤讲解帮助理解知识。',availability:'周末下午'}
it('本人可撤回待审核申请保留内容，再修改送审；他人无权撤回，审核完成后不能撤回',async()=>{
 const h=await teachingHarness()
 try{
  let response=await h.request('POST','/api/tutor-applications',h.tutor,input)
  expect(response.statusCode).toBe(200);const application=response.json().data
  expect((await h.request('POST','/api/tutor-applications/withdraw',h.parent,{applicationId:application.id})).statusCode).toBe(403)
  expect((await h.request('POST','/api/tutor-applications/withdraw',h.otherTutor,{applicationId:application.id})).statusCode).toBe(404)
  response=await h.request('POST','/api/tutor-applications/withdraw',h.tutor,{applicationId:application.id})
  expect(response.statusCode).toBe(200);expect(response.json().data).toMatchObject({status:'draft',subjects:input.subjects,introduction:input.introduction})
  expect((await h.db.tutorProfile.findUniqueOrThrow({where:{userId:h.tutor.id}})).published).toBe(false)
  expect((await h.request('POST','/api/tutor-applications/withdraw',h.tutor,{applicationId:application.id})).statusCode).toBe(409)
  await h.request('PUT','/api/tutor-applications/draft',h.tutor,{...input,introduction:'修改后的虚构资料，继续采用分类复习和错题讲解。'})
  expect((await h.request('POST','/api/tutor-applications',h.tutor,input)).statusCode).toBe(200)
  expect((await h.request('POST','/api/admin/tutor-applications/'+application.id+'/review',h.admin,{decision:'approved'})).statusCode).toBe(200)
  expect((await h.request('POST','/api/tutor-applications/withdraw',h.tutor,{applicationId:application.id})).statusCode).toBe(409)
  expect((await h.db.tutorApplication.findUniqueOrThrow({where:{id:application.id}})).status).toBe('approved')
 }finally{await h.app.close()}
})
