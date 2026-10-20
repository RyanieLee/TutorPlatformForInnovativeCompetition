<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { restoreSession } from './utils/session'
onLaunch(() => { void restoreSession() })
</script>
<style>page{background:#f6f8fc;color:#1c2840;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;font-size:28rpx}view,text,input,textarea,button{box-sizing:border-box}button::after{border:none}.primary-button{background:#2868e4;color:#fff;border-radius:16rpx;font-size:28rpx}.secondary-button{background:#edf3ff;color:#2459bd;border-radius:16rpx;font-size:28rpx}.surface-card{background:#fff;border:1rpx solid #e8edf5;border-radius:22rpx;padding:28rpx}.muted-note{color:#75849a;font-size:23rpx;line-height:1.7}.empty-state{text-align:center;padding:45rpx 28rpx;color:#75849a}</style>
