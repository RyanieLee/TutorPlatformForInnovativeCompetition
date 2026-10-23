/** uni H5 wraps inputs; also name the actual native control for assistive technology. */
export function syncNativeLabels() {
 // #ifdef H5
 document.querySelectorAll<HTMLElement>('uni-input[aria-label],uni-textarea[aria-label]').forEach(wrapper=>{
  const name=wrapper.getAttribute('aria-label')
  if(name)wrapper.querySelector('input,textarea')?.setAttribute('aria-label',name)
 })
 // #endif
}
