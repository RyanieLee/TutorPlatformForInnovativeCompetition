import { ref } from 'vue'
export type Appearance='green'|'jenny'
export const appearance=ref<Appearance>('green')
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
