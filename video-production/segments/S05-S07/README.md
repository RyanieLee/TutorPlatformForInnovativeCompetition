# S05–S07｜家长看资料、提交预约、查看状态

主交付是一条80.000秒MP4：S05（30秒）→S06（25秒）→S07（25秒），总片02:20–03:40。按追加要求加快操作、固定画幅，无反复推拉、抖动或无意义缩放。

## 下载与组成

- 成片：exports/clip_S05-S07.mp4
- 完整包：exports/S05-S07_delivery.zip
- 工作区副本：/workspace/shared/downloads/S05-S07/clip_S05-S07.mp4、/workspace/shared/downloads/S05-S07/S05-S07_delivery.zip
- 合片字幕：captions_S05-S07.srt；配音文稿：voiceover.md
- 相邻S05/S06/S07目录各有独立脚本、清单、字幕、关键帧和验证报告。

仅录制真实项目网页。描边/字幕为包装，不重建UI。模型未连接/未调用，无真实通知。照片原标“示例头像”，不称学历/资质认证。

基线5d04c4f789780d551b785c542e9946cf9453dd18，执行时最新稳定main、Frontend Build成功。集成分支video/segments-S05-S07；video/segment-S05、video/segment-S06、video/segment-S07保留为同一完整交付提交的分支引用。不改业务，不合并main。

## 独立数据

每段初始浏览器cookie/origin为空。S06真实提交，S07独立通过UI重建自己的待处理预约，不读S06存储。使用同一虚构案例“小航/小林/数学/周六下午/100元内”，但独立订单的ID和创建时间不同；不把合片当作跨上下文持久化/同步证明。两段均停在“待家教确认”，未替老师接单或通知。

Mock必填联系字段使用非个人电话的演示数字10000000000。学段写入辅导需求，科目沿用真实“数学”，不伪造下拉选项。

## 完整复现

Node>=20、Python3、FFmpeg/ffprobe、Playwright Chromium、Xvfb/libX11/libXtst、Noto Sans CJK。仓库根目录：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S05-S07/scripts/capture.mjs
node video-production/segments/S05-S07/scripts/render.mjs
node video-production/segments/S05-S07/scripts/validate.mjs
# 另行视觉核对各段与合片关键帧、接触表、真实页面证据
python3 video-production/segments/S05-S07/scripts/package.py
```

capture顺序运行三个独立服务/浏览器，从实际npm run demo日志读端口。render顺序渲染后按30/25/25秒拼接，复制原视频帧，不做缩放/摇镜或假UI动画；重新生成一条80秒静音AAC轨，避免分段AAC启动延迟叠加。validate核对各段/合片，并将切点帧与原片逐像素比对。

本环境工具XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb，与以前片段浏览器状态无关。其他机器优先安装系统Xvfb；无sudo的Debian13兼容环境可从官方包提取：

```bash
python3 - <<'PY'
import urllib.request
urllib.request.urlretrieve('https://deb.debian.org/debian/pool/main/x/xorg-server/xvfb_21.1.16-1.3+deb13u4_amd64.deb','/tmp/S05-S07-xvfb.deb')
PY
# SHA256: 893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6
dpkg-deb -x /tmp/S05-S07-xvfb.deb /tmp/S05-S07-x11
XVFB_BIN=/tmp/S05-S07-x11/usr/bin/Xvfb node video-production/segments/S05-S07/scripts/capture.mjs
```

原始录屏/截图/日志各自在子片raw目录。普通Git不提交MP4/ZIP/原始录像。完整包包括成片、子片和必要源码/关键帧/验证证据。

最终1920×1080、30fps、H.264/yuv420p、AAC48kHz静音、faststart。检查时长、PTS、解码、黑屏/空帧、独立上下文、真实待确认状态和固定镜头；如实列出原始CFR重复计数。详细实测见validation-report.md，远程附件和下载见delivery.json。
