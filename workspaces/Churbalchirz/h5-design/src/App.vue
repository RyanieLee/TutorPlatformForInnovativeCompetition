<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { restoreSession } from './utils/session'
onLaunch(() => { void restoreSession() })
</script>
<style>
page{background:#f7f6f2;color:#202c28;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.6}view,text,input,textarea,button{box-sizing:border-box}button::after{border:none}button{font-family:inherit}button:focus-visible{outline:3px solid #b98124;outline-offset:3px}.primary-button{background:#185448;color:#fff;border-radius:10px;font-size:16px;line-height:48px;padding:0 20px;font-weight:600}.secondary-button{background:#edf3ed;color:#185448;border:1px solid #dfe5de;border-radius:10px;font-size:16px;line-height:46px;padding:0 20px}.primary-button[disabled],.secondary-button[disabled]{opacity:.55}.surface-card{background:#fff;border:1px solid #dfe5de;border-radius:16px;padding:24px}.muted-note{color:#61716a;font-size:14px;line-height:1.7}.empty-state{text-align:center;padding:40px 24px;color:#61716a;font-size:16px}input,textarea{color:#202c28}input:focus-within,textarea:focus-within{outline:2px solid #185448;outline-offset:2px}
/* #ifdef H5 */
@media(min-width:900px){uni-tabbar{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
/* #endif */
</style>
