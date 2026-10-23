<script setup lang="ts">
import { ref } from 'vue'
const flipped = ref(false)
</script>
<template>
  <view class="lesson-stage">
    <view class="lesson-card" :class="{ flipped }">
      <view class="lesson-face lesson-front" :aria-hidden="flipped">
        <text class="lesson-kicker">一题一解 · 初中数学</text>
        <text class="lesson-title">认识二次函数 y = x²</text>
        <text class="lesson-problem">已知二次函数 y = x²。求它的顶点、对称轴和开口方向，并求 x = ±2 时的函数值。</text>
        <image class="lesson-chart" src="/static/lesson-parabola.svg" mode="aspectFit" aria-label="函数 y 等于 x 平方的完整坐标示意图，顶点为原点，对称轴为 y 轴，标出负二四及二四两点"/>
        <view class="lesson-facts"><text>顶点 O（0，0）</text><text>标记点（±2，4）</text></view>
        <text class="lesson-caption">坐标范围：−3 ≤ x ≤ 3，0 ≤ y ≤ 10</text>
      </view>
      <view class="lesson-face lesson-back" :aria-hidden="!flipped">
        <text class="lesson-kicker">完整解题思路</text>
        <text class="lesson-title">先看系数，再看对称</text>
        <view class="lesson-step"><text class="step-number">01</text><view><text class="step-title">判断开口方向</text><text class="step-copy">y = ax² 中 a = 1 ＞ 0，因此抛物线开口向上。</text></view></view>
        <view class="lesson-step"><text class="step-number">02</text><view><text class="step-title">确定顶点与对称轴</text><text class="step-copy">x² ≥ 0，且 x = 0 时 y 最小，为 0。顶点是（0，0）；左右两侧关于直线 x = 0 对称。</text></view></view>
        <view class="lesson-step"><text class="step-number">03</text><view><text class="step-title">代入自变量求值</text><text class="step-copy">x = 2 时，y = 2² = 4；x = −2 时，y =（−2）² = 4。</text></view></view>
        <view class="lesson-answer">答：顶点（0，0），对称轴 x = 0，开口向上；x = ±2 时，y = 4。</view>
      </view>
    </view>
    <button class="lesson-flip" :aria-pressed="flipped" @click="flipped = !flipped">{{ flipped ? '返回完整题干与图像' : '查看完整解题思路' }} <text aria-hidden="true">↻</text></button>
  </view>
</template>
<style scoped>
.lesson-stage{min-width:0;width:100%;perspective:1100px}.lesson-card{display:grid;transform-style:preserve-3d;transition:transform .48s ease;border-radius:22px;box-shadow:0 14px 36px #3d879321}.lesson-card.flipped{transform:rotateY(180deg)}.lesson-face{grid-area:1/1;display:flex;flex-direction:column;min-height:365px;padding:17px;background:#f7fdfff0;border:1px solid #fff;border-radius:22px;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-sizing:border-box;gap:10px;overflow:visible}.lesson-back{transform:rotateY(180deg)}.lesson-kicker{font-size:10px;color:#398b91;font-weight:650;letter-spacing:.06em}.lesson-title{font-size:15px;font-weight:750;line-height:1.5;color:#193e55;margin:0}.lesson-problem{display:block;font-size:11px;line-height:1.85;color:#4f6c7d}.lesson-chart{display:block;width:100%;height:150px;flex:none;background:#fbfeff;border:1px solid #dcecf1;border-radius:13px}.lesson-facts{display:flex;flex-wrap:wrap;gap:5px;justify-content:space-between;font-size:10px;color:#247f85}.lesson-facts text{padding:4px 6px;border-radius:7px;background:#e4f6f2}.lesson-caption{font-size:9px;color:#728c98;line-height:1.6;margin-top:auto}.lesson-step{display:flex;gap:9px;margin:0;align-items:flex-start}.step-number{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:24px;height:24px;border-radius:9px;background:#dff4ef;color:#16838a;font-size:10px;font-weight:750}.step-title{display:block;font-size:11px;color:#234c63;font-weight:700;line-height:1.6}.step-copy{display:block;font-size:10px;line-height:1.85;color:#56717f}.lesson-answer{font-size:10px;line-height:1.85;padding:10px;background:#e7f6f1;color:#226a6d;border-radius:12px;margin-top:auto}.lesson-flip{min-height:44px;display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;margin-top:9px;background:#f6fdffed;color:#237884;border:1px solid #fff;border-radius:16px;font-size:11px}.lesson-flip text{font-size:20px}.lesson-flip:focus-visible{outline:3px solid #309ba8;outline-offset:3px}@media(prefers-reduced-motion:reduce){.lesson-card{transition:none}}
</style>
