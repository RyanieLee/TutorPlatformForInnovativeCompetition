import places from '../../server/src/content/xian-places.json'
/** WGS84 公共片区参考点，不是家教住址；不做路线或到达时间估算。 */
export interface LocationPoint { latitude:number; longitude:number; label:string }
export const xianPlaces:LocationPoint[] = places
export const locationKey='tutor-platform:parent-location:wgs84:v1'
export function validLocation(value:unknown):value is LocationPoint {
 const p=value as LocationPoint|undefined
 return !!p && typeof p.label==='string' && p.label.length>0 && p.label.length<=40 && Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=34&&p.latitude<=34.7&&p.longitude>=108.5&&p.longitude<=109.4
}
export function readParentLocation():LocationPoint|null {
 try {const value=uni.getStorageSync(locationKey);return validLocation(value)?value:null}catch{return null}
}
export function saveParentLocation(point:LocationPoint|null) {
 if(point&&!validLocation(point))throw new Error('请选择西安主城区或近郊的参考点')
 if(point)uni.setStorageSync(locationKey,{...point});else uni.removeStorageSync(locationKey)
}
export function distanceKm(a:LocationPoint,b:LocationPoint):number {
 const rad=(n:number)=>n*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude)
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)))
}
export function areaReference(area:string):LocationPoint|undefined {
 return xianPlaces.find(p=>p.label===area)??xianPlaces.find(p=>area.includes(p.label.split(' · ')[0]))
}
