import { computed, ref } from 'vue'
export type Appearance='green'|'jenny'
export const appearance=ref<Appearance>('green')
// The green web theme uses the original editorial treatment; keep Jenny's artwork.
export const showIllustratedMascot=computed(()=>{
 let show=true
 // #ifdef H5
 show=appearance.value==='jenny'
 // #endif
 return show
})
const storageKey='tutor-platform:appearance:v1'
export function setAppearance(value:Appearance){
 appearance.value=value
 try{uni.setStorageSync(storageKey,value)}catch{}
 // #ifdef H5
 document.documentElement.dataset.campusTheme=value
 // #endif
}
export function restoreAppearance(){
 let value:Appearance='green'
 try{if(uni.getStorageSync(storageKey)==='jenny')value='jenny'}catch{}
 setAppearance(value)
}
