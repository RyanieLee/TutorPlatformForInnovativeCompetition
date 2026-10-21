/** WGS84 公共片区参考点，不是家教住址；不做路线或到达时间估算。 */
export interface LocationPoint { latitude:number; longitude:number; label:string }
export const xianPlaces:LocationPoint[] = [
 {label:'长安区 · 大学城',latitude:34.158,longitude:108.881},
 {label:'雁塔区 · 小寨',latitude:34.224,longitude:108.947},
 {label:'高新区 · 科技路',latitude:34.231,longitude:108.891},
 {label:'碑林区 · 南稍门',latitude:34.242,longitude:108.943},
 {label:'未央区 · 市图书馆',latitude:34.324,longitude:108.944},
 {label:'莲湖区 · 玉祥门',latitude:34.274,longitude:108.918},
 {label:'新城区 · 大明宫',latitude:34.296,longitude:108.958},
 {label:'灞桥区 · 纺织城',latitude:34.274,longitude:109.066},
 {label:'雁塔区 · 曲江池',latitude:34.199,longitude:108.977},
 {label:'长安区 · 航天城',latitude:34.156,longitude:108.941},
 {label:'临潼区 · 临潼城区',latitude:34.372,longitude:109.211},
 {label:'高陵区 · 高陵城区',latitude:34.534,longitude:109.081}
]
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
