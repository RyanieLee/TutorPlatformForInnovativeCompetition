<script setup lang="ts">
import { ref } from 'vue'
const flipped = ref(false)
</script>
<template>
  <view class="lesson-stage">
    <view class="lesson-card" :class="{ flipped }">
      <view class="lesson-face lesson-front" :aria-hidden="flipped"><text class="lesson-kicker">一题一解 · 数学</text><text class="lesson-title">先看图，再想公式。</text>
        <view class="lesson-plot"><view class="plot-y"/><view class="plot-x"/><view class="plot-curve">∪</view><text>y = x²</text></view>
        <text class="lesson-caption">示意教学卡片</text>
      </view>
      <view class="lesson-face lesson-back" :aria-hidden="!flipped"><text class="lesson-kicker">翻过来 · 看思路</text><text class="lesson-title">复杂的题，也可以拆开。</text><text class="lesson-step">01　先找最低点：原点 O。</text><text class="lesson-step">02　比较两边：关于 y 轴对称。</text><text class="lesson-step">03　x 变为 2 倍，y 变为 4 倍。</text><text class="lesson-caption">从观察，到理解。</text></view>
    </view>
    <button class="lesson-flip" :aria-pressed="flipped" @click="flipped = !flipped">{{ flipped ? '翻回来，再看图' : '翻一页，看思路' }} <text aria-hidden="true">↻</text></button>
  </view>
</template>
<style scoped>
.lesson-stage{min-width:0;width:100%;perspective:1100px;transform:rotate(-2deg)}.lesson-card{display:grid;transform-style:preserve-3d;transition:transform .56s cubic-bezier(.22,.8,.2,1);border-radius:18px;box-shadow:0 15px 32px #2b49341d}.lesson-card.flipped{transform:rotateY(180deg)}.lesson-face{grid-area:1/1;display:flex;flex-direction:column;min-height:284px;padding:22px;background:#fffefb;border:2px solid #385846;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-sizing:border-box}.lesson-back{transform:rotateY(180deg)}.lesson-kicker{font-size:11px;color:#64756b;letter-spacing:.08em}.lesson-title{font-family:"Noto Serif SC","Songti SC","SimSun",serif;font-size:20px;font-weight:700;color:#263b2e;margin:12px 0;line-height:1.5}.lesson-plot{position:relative;flex:1;min-height:145px;overflow:hidden;background-image:linear-gradient(#e8eee6 1px,transparent 1px),linear-gradient(90deg,#e8eee6 1px,transparent 1px);background-size:20px 20px}.plot-x,.plot-y{position:absolute;background:#98aa9c}.plot-x{height:1px;width:88%;left:6%;top:74%}.plot-y{width:1px;height:85%;left:50%;top:5%}.plot-curve{position:absolute;left:29%;top:-99px;color:#477856;font-family:Georgia,serif;font-size:265px;line-height:1}.lesson-plot text{position:absolute;right:12px;top:26px;font-family:Georgia,serif;color:#2f6545}.lesson-caption{font-size:11px;color:#768377;text-align:right;margin-top:8px}.lesson-step{display:block;margin:14px 0;color:#435447;font-size:14px;line-height:1.65}.lesson-flip{min-height:44px;display:flex;align-items:center;justify-content:space-between;width:100%;padding:8px 12px;margin-top:10px;background:transparent;color:#315b43;font-size:13px}.lesson-flip text{font-size:22px}.lesson-flip:focus-visible{outline:3px solid #315b43;outline-offset:2px}@media(max-width:700px){.lesson-face{min-height:245px;padding:17px}.lesson-title{font-size:17px}.lesson-plot{min-height:120px}}@media(prefers-reduced-motion:reduce){.lesson-stage{transform:none}.lesson-card{transition:none}}
</style>
