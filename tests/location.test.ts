import { beforeEach, describe, expect, it, vi } from 'vitest'
import { areaReference, distanceKm, locationKey, readParentLocation, saveParentLocation, validLocation, xianPlaces } from '../src/services/location'
import { matchTutors } from '../src/services/matching'
import { tutors } from '../src/mocks/tutors'
import { parseBriefLocally } from '../src/services/brief-parser'
const input={subject:'数学',grade:'初中（演示）',budget:'200',mode:'线下' as const,preference:''}
describe('西安本机位置与附近匹配',()=>{
 beforeEach(()=>{const store=new Map();vi.stubGlobal('uni',{getStorageSync:(k:string)=>store.get(k),setStorageSync:(k:string,v:unknown)=>store.set(k,v),removeStorageSync:(k:string)=>store.delete(k)})})
 it('只接受演示范围内的有效坐标；损坏存储安全回退，清除后不恢复',()=>{
  expect(readParentLocation()).toBeNull()
  saveParentLocation(xianPlaces[0]);expect(readParentLocation()).toEqual(xianPlaces[0])
  saveParentLocation(null);expect(readParentLocation()).toBeNull()
  uni.setStorageSync(locationKey,{latitude:'34.2',longitude:108.9,label:'伪造'});expect(readParentLocation()).toBeNull()
  expect(validLocation({...xianPlaces[0],longitude:116})).toBe(false)
  expect(()=>saveParentLocation({...xianPlaces[0],latitude:NaN})).toThrow()
 })
 it('距离计算和半径边界对应真实坐标；不把经纬度当路程',()=>{
  expect(distanceKm(xianPlaces[0],xianPlaces[0])).toBe(0)
  expect(distanceKm(xianPlaces[0],xianPlaces[1])).toBeCloseTo(distanceKm(xianPlaces[1],xianPlaces[0]),8)
  expect(distanceKm(xianPlaces[0],xianPlaces[1])).toBeGreaterThan(9)
  const result=matchTutors(tutors,{...input,parentLocation:xianPlaces[0],radiusKm:5})
  expect(result.results.map(r=>r.tutor.id)).toContain('t001')
  expect(result.results.every(r=>r.distanceKm!==undefined&&r.distanceKm<=5)).toBe(true)
  expect(result.total).toBe(result.eligible+Object.values(result.excluded).reduce((a,b)=>a+b,0))
  const unknown={...tutors[0],id:'unknown',area:'未提供片区'}
  expect(matchTutors([unknown],{...input,parentLocation:xianPlaces[0],radiusKm:5}).excluded.distance).toBe(1)
  expect(areaReference('没有记录的地区')).toBeUndefined()
 })
 it('线上不使用位置排序或地理限制；同分线下按近处优先，硬条件保持生效',()=>{
  const online={...input,mode:'线上' as const}
  expect(matchTutors(tutors,{...online,parentLocation:xianPlaces[0]}).results.map(r=>r.tutor.id)).toEqual(matchTutors(tutors,online).results.map(r=>r.tutor.id))
  expect(()=>matchTutors(tutors,{...online,parentLocation:xianPlaces[0],radiusKm:5})).toThrow('线下')
  const list=[{...tutors[0],id:'a-far',area:xianPlaces[1].label},{...tutors[0],id:'z-near',area:xianPlaces[0].label}]
  const result=matchTutors(list,{...input,parentLocation:xianPlaces[0]})
  expect(result.results.map(r=>r.tutor.id)).toEqual(['z-near','a-far'])
  expect(result.results[0].reasons.join(' ')).toContain('不加分')
  expect(matchTutors(list,{...input,budget:'1',parentLocation:xianPlaces[0]}).results).toEqual([])
 })
})
describe('合成场景与离线解析',()=>{
 it('目录具有24个唯一人物、有效片区和不同预算；保留五个匹配科目',()=>{
  expect(tutors).toHaveLength(24);expect(new Set(tutors.map(t=>t.id)).size).toBe(24)
  expect(tutors.every(t=>!!areaReference(t.area)&&t.availability&&t.introduction.length>=10)).toBe(true)
  expect(new Set(tutors.flatMap(t=>t.subjects)).size).toBe(5)
 })
 it('只提取明确字段，不为缺失科目/年级/预算造值，拦截联系方式',()=>{
  expect(parseBriefLocally('初中数学，预算100元，希望线下耐心讲解')).toEqual({subject:'数学',grade:'初中（演示）',budget:100,mode:'线下',preference:'耐心'})
  expect(parseBriefLocally('希望找一位老师')).toMatchObject({subject:null,grade:null,budget:null,mode:null})
  expect(parseBriefLocally('数学和英语都需要，线上线下均可')).toMatchObject({subject:null,mode:'均可'})
  expect(()=>parseBriefLocally('数学老师请电话13800138000联系')).toThrow('联系方式')
 })
})
