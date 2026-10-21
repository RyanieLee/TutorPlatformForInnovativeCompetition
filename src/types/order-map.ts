import type { BookingStatus,TeachingMode } from './tutor'
export interface OrderMapItem {
 id:string;subject:string;status:BookingStatus;areaLabel:string|null;tutorId:string;tutorName:string
 teachingMode:TeachingMode|null;referencePrice:number|null;expectedTime:string;createdAt:string;updatedAt:string
}
export interface OrderMapQuery {page?:number;pageSize?:number;status?:BookingStatus}
export interface OrderMapPage {items:OrderMapItem[];meta:{total:number;page:number;pageSize:number};scope:string;serverTime:string}
