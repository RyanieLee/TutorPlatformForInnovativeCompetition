import {xianPlaces} from './location'
import type {OrderMapItem} from '../types/order-map'
import type {BookingStatus} from '../types/tutor'
export const orderStatusColors:Record<BookingStatus,string>={pending:'#bd771b',accepted:'#3967ae',completed:'#247754',cancelled:'#7c8586',rejected:'#a55757'}
export function groupedOrders(items:OrderMapItem[]){
 return xianPlaces.map(point=>({point,items:items.filter(b=>b.areaLabel===point.label)})).filter(g=>g.items.length)
}
export function exampleMapOrders():OrderMapItem[]{
 return xianPlaces.map((p,i)=>({id:'example-order-'+(i+1),subject:['数学','英语','物理','语文','化学'][i%5],status:(['pending','accepted','completed','cancelled','rejected'] as BookingStatus[])[i%5],areaLabel:p.label,tutorId:'example-tutor',tutorName:'虚构示例老师'+(i+1),teachingMode:i%2?'线上':'线下',referencePrice:65+(i%6)*10,expectedTime:['周六下午','周日09:00','周三19:30'][i%3],createdAt:'2026-10-21T09:00:00Z',updatedAt:'2026-10-21T09:00:00Z'}))
}
