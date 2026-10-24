# S14–S16｜总结110秒合片

S14 35秒 → S15 35秒 → S16 40秒，全片07:10–09:00。本批按追加要求固定画幅、加快真实操作，不做动态推拉或抖动。三段各有独立脚本、浏览器前置准备、字幕、清单、关键帧和验证证据。

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
# 本环境Xvfb路径；其他机器安装系统Xvfb时无需设置
export XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb
node video-production/segments/S14-S16/scripts/capture.mjs
node video-production/segments/S14-S16/scripts/render.mjs
node video-production/segments/S14-S16/scripts/validate.mjs
# 人工核对三个片段和合片关键帧
python3 video-production/segments/S14-S16/scripts/package.py
```

工具：Node>=20、Python3/Pillow、FFmpeg/ffprobe、Xvfb/libX11/libXtst、Playwright Chromium、Noto CJK。本环境XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb。每段从真实npm run demo日志取端口，独立空上下文，通过真实UI创建自己的预约和教学状态。S15另访问匿名可读的真实GitHub Actions成功页面；需要网络，无法访问时须保留失败，不生成假的成功页面。

render正常依次渲染/验证三个单片，再复制视频帧拼接、重建一条110秒静音AAC，避免分段AAC起始延迟；--concat-only只拼接已验证子片。validate --combined-only可仅检查合片和源片哈希，正常模式同时重验子片。没有重新构造业务UI；抽象架构图用程序绘制。S14分屏明确不是实时同步，教师确认结束后右侧保留实际结果静帧6秒。S16片尾渐隐至暖白，最后2秒留白。

基线main：5d04c4f789780d551b785c542e9946cf9453dd18，构建/后端/E2E真实CI成功。当前录制Mock，模型未连接/调用，三角色是开发演示账户；不称公网运营或教学成效。真实预置课程匿名编号DEMO-STUDENT-01与本段小航预约关联。

MP4：exports/clip_S14-S16.mp4；完整包exports/S14-S16_delivery.zip；可下载副本/workspace/shared/downloads/S14-S16/。Git只提交脚本/字幕/清单/关键帧/报告，不提交MP4/ZIP和原始录屏。delivery.json说明仓库上传与实际交付情况。

最终9分钟总片仍缺S08、S09、S10、S11、S12、S13，合计210秒。已准备video-production/final/scripts/compose.py，缺片就写报告并停止，绝不拿其他片段填造。固定时间轴、实际已存在源片的哈希/时长/贡献者字段和配音cue表一并交付。

## 上传与交付

脚本、字幕、证据与报告已提交 [PR #48](https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/pull/48)。GitHub Release视频附件实际上传返回HTTP 401 Bad credentials，未发布远程视频；没有尝试绕过凭据。实际成片与完整包在/workspace/shared/downloads/S14-S16/，详细状态见delivery.json。
