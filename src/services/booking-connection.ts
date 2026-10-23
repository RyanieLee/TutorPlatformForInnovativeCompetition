import type {BookingConnectionService,BookingConnectionPage,BookingMessage,BookingMessageInput,BookingMessageQuery,ConnectionRole} from '../../shared/booking-connection'
import type {User} from '../types/auth'
import type {BusinessService} from './contracts'
import type {StoragePort} from './mock/storage'
import {UniStorage} from './mock/storage'
import {apiMode} from '../config/runtime'
import {apiRequest} from './api/client'
import {businessService} from './business'
import {BusinessError} from './errors'
import {currentSession} from '../utils/session'
import {distanceKm,xianPlaces} from './location'

export type {BookingConnectionPage,BookingMessage,BookingMessageInput,BookingMessageQuery} from '../../shared/booking-connection'
const canWrite=(status:string)=>status==='pending'||status==='accepted'
const storageKey=(bookingId:string)=>'tutor-platform:booking-messages:v1:'+bookingId
interface StoredMessage extends BookingMessage {senderId:string;requestId:string}
function invalid(message:string):never{throw new BusinessError('INVALID',message)}
function clean(input:BookingMessageInput):BookingMessageInput{
 if(!input||typeof input.requestId!=='string'||!/^[\w-]{8,100}$/.test(input.requestId)||typeof input.text!=='string'||!input.text.trim()||input.text.trim().length>1000)invalid('消息为1至1000字，请勿重复更改已发送请求')
 return {requestId:input.requestId,text:input.text.trim()}
}
function pagination(query:BookingMessageQuery){
 const size=query.pageSize??20
 if(!Number.isInteger(size)||size<1||size>50||query.beforeId!==undefined&&(typeof query.beforeId!=='string'||!query.beforeId||query.beforeId.length>100))invalid('消息分页参数无效')
 return size
}
const dto=(m:StoredMessage):BookingMessage=>({id:m.id,senderRole:m.senderRole,text:m.text,createdAt:m.createdAt})

/** 仅当前设备演示；无轮询、假回复或跨设备消息保证。归属使用既有预约服务。 */
export class MockBookingConnectionService implements BookingConnectionService{
 constructor(private business:BusinessService,private storage:StoragePort,private getUser:()=>User|null){}
 private async access(bookingId:string){
  const user=this.getUser()
  if(!user)throw new BusinessError('UNAUTHORIZED','请先登录')
  if(user.role!=='parent'&&user.role!=='tutor')throw new BusinessError('FORBIDDEN','仅预约家长和教师可查看沟通')
  const identity=[user.id,user.role].join(':')
  const rows=user.role==='parent'?await this.business.listParentBookings(user):await this.business.listTutorBookings(user)
  const current=this.getUser()
  if(!current||[current.id,current.role].join(':')!==identity)throw new BusinessError('UNAUTHORIZED','登录身份已变化，请重新进入')
  const booking=rows.find(b=>b.id===bookingId)
  if(!booking)throw new BusinessError('NOT_FOUND','预约不存在或当前身份无权查看')
  return {user,booking}
 }
 private rows(bookingId:string):StoredMessage[]{
  const value=this.storage.get(storageKey(bookingId))
  if(value===null)return []
  if(!Array.isArray(value)||value.some(m=>!m||typeof m.id!=='string'||typeof m.senderId!=='string'||typeof m.requestId!=='string'||!['parent','tutor'].includes(m.senderRole)||typeof m.text!=='string'||typeof m.createdAt!=='string'))throw new BusinessError('STORAGE','本机沟通记录格式异常')
  return (value as StoredMessage[]).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))
 }
 async list(bookingId:string,query:BookingMessageQuery={}):Promise<BookingConnectionPage>{
  const pageSize=pagination(query),{booking}=await this.access(bookingId),rows=this.rows(bookingId)
  const index=query.beforeId?rows.findIndex(m=>m.id===query.beforeId):-1
  if(query.beforeId&&index<0)invalid('消息分页位置无效，请刷新记录')
  const tail=rows.slice(index+1),messages=tail.slice(0,pageSize)
  return {bookingId,status:booking.status,canSend:canWrite(booking.status),areaLabel:booking.areaLabel??null,messages:messages.map(dto),nextBeforeId:tail.length>pageSize?messages[messages.length-1].id:null}
 }
 async send(bookingId:string,input:BookingMessageInput):Promise<BookingMessage>{
  const body=clean(input),{user,booking}=await this.access(bookingId)
  if(!canWrite(booking.status))throw new BusinessError('CONFLICT','预约已结束，沟通记录仅可查看')
  const rows=this.rows(bookingId),existing=rows.find(m=>m.senderId===user.id&&m.requestId===body.requestId)
  if(existing){if(existing.text!==body.text)throw new BusinessError('CONFLICT','该请求编号已用于不同消息');return dto(existing)}
  if(rows.length>=2000)throw new BusinessError('CONFLICT','本机演示记录已达容量上限')
  const message:StoredMessage={id:'local-'+Date.now().toString(36)+'-'+String(rows.length).padStart(5,'0')+'-'+Math.random().toString(36).slice(2),senderId:user.id,senderRole:user.role as ConnectionRole,requestId:body.requestId,text:body.text,createdAt:new Date().toISOString()}
  this.storage.set(storageKey(bookingId),[...rows,message])
  return dto(message)
 }
}
class ApiBookingConnectionService implements BookingConnectionService{
 list(bookingId:string,query:BookingMessageQuery={}):Promise<BookingConnectionPage>{
  const pageSize=pagination(query)
  return apiRequest('GET','/api/booking-connections/'+encodeURIComponent(bookingId)+'/messages?pageSize='+pageSize+(query.beforeId?'&beforeId='+encodeURIComponent(query.beforeId):''))
 }
 send(bookingId:string,input:BookingMessageInput):Promise<BookingMessage>{return apiRequest('POST','/api/booking-connections/'+encodeURIComponent(bookingId)+'/messages',clean(input))}
}
export const bookingConnectionService:BookingConnectionService=apiMode?new ApiBookingConnectionService():new MockBookingConnectionService(businessService,new UniStorage(),()=>currentSession.value?.user??null)

/** 仅公开片区的 WGS84 参考点。地图供应商负责实际路线查询；这里不估算路程耗时。 */
export function commuteReference(fromLabel:string,toLabel:string){
 const from=xianPlaces.find(p=>p.label===fromLabel),to=xianPlaces.find(p=>p.label===toLabel)
 if(!from||!to)return null
 const point=(p:typeof from)=>'latlng:'+p.latitude+','+p.longitude+'|name:'+p.label
 return {from,to,distanceKm:distanceKm(from,to),mapUrl:'https://api.map.baidu.com/direction?origin='+encodeURIComponent(point(from))+'&destination='+encodeURIComponent(point(to))+'&mode=transit&region='+encodeURIComponent('西安')+'&coord_type=wgs84&output=html&src='+encodeURIComponent('webapp.linghang.tutorplatform')}
}
