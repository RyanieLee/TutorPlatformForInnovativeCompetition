# S02｜传统找家教的盲目性｜开场问题

35秒，概述片头，对应总片00:00–00:35。真实项目网页是唯一业务画面来源；痛点卡片、线条、标题属于概述性编辑图形，不是平台控件、访谈或研究结论。

## 查看交付

- 成片：`exports/clip_S02.mp4`
- 全套：`exports/S02_delivery.zip`（含MP4、SRT、文稿、脚本、清单、关键帧、原始网页帧截图和证据）
- 工作区下载副本：`/workspace/shared/downloads/S02/clip_S02.mp4`、`/workspace/shared/downloads/S02/S02_delivery.zip`
- 普通Git只提交脚本、清单、字幕、报告、关键帧与轻量证据，不提交MP4/ZIP/原始录像。

## 基线与页面事实

业务基线：`5d04c4f789780d551b785c542e9946cf9453dd18`，执行时最新main，Frontend Build CI成功。Node24.19.0，已执行`npm ci --no-audit --no-fund`。录制前阅读根目录README、DEMO_GUIDE、首页/教师卡片/教师详情/布局、演示自动化测试与启动脚本。

首页“浏览家教老师”真实滚动到列表；按名字定位“小林老师”，真实点击后URL为`id=t001`。列表已有学校、科目和费用，**列表没有时间字段**：片中真实打开详情展示“可授课时间”，不修改业务代码补造字段。

所有人物/介绍/价格/头像均来自仓库现有虚构样例；高校和地名仅为场景。未登录，无预约、个人数据或模型调用。不使用S01存储，也不声称平台已接通真实大模型。统一虚构案例“小航”仅作为片头叙事；后续课程与60%等数据不在本段制造或展示。

## 独立复现

需要Node>=20、Python3、FFmpeg/ffprobe、Xvfb、libX11/libXtst、Noto Sans CJK字体与Playwright Chromium。在仓库根目录：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S02/scripts/capture.mjs
node video-production/segments/S02/scripts/render.mjs
node video-production/segments/S02/scripts/validate.mjs
# 人工查看keyframes与evidence/contact-sheet.jpg，核对evidence/sourceframes/*.png与capture.json
python3 video-production/segments/S02/scripts/package.py
```

无需预先启动服务。capture脚本自行寻找空闲端口，运行`npm run demo -- --port <port> --strictPort`，从实际日志读取URL；新建隔离X显示和全空cookie/origin的浏览器上下文；结束清理自身进程。原始录像/日志和后续录制的Playwright截图在`raw/<runId>/`。本次选用原始屏幕录像提取的`evidence/sourceframes/`无包装网页帧作源画面对照，避免与其他尝试的浏览器截图混淆。业务源码若偏离manifest.gitSha，脚本拒绝录制。

### 本环境无sudo的Xvfb安装

本次使用`XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb`（仅工具二进制路径，和S01浏览器数据无关）。可在Debian13兼容环境从官方包复现：

```bash
python3 - <<'PY'
import urllib.request
urllib.request.urlretrieve('https://deb.debian.org/debian/pool/main/x/xorg-server/xvfb_21.1.16-1.3+deb13u4_amd64.deb','/tmp/S02-xvfb.deb')
PY
# 包SHA256：893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6
dpkg-deb -x /tmp/S02-xvfb.deb /tmp/S02-x11
XVFB_BIN=/tmp/S02-x11/usr/bin/Xvfb node video-production/segments/S02/scripts/capture.mjs
```

其他系统优先安装系统Xvfb。没有X11库/中文字体/FFmpeg时需先安装；脚本不会伪装录制成功。

## 录制与编辑

Playwright读取真实元素坐标，实际mouse.move/mouse.click，光标和点击波纹仅为pointer-events:none覆盖层。原生X11连续录屏30fps；按实际页面截图像素匹配浏览器视口位置，避免工具栏/翻译气泡遮挡。浏览器原生翻译气泡如出现，仅在镜头外用XTest真实关闭。

0–8秒真实首页裁切模糊+标题；8–18秒三张抽象痛点文字卡与路径线；18–28秒实际列表点击、滚动和小林详情；28–35秒冻结28秒前最后一帧真实资料页，并模糊/叠加问题句。暖白/墨绿，柔和文字显隐和轻推近。无外部音乐、访谈、素材图片或合成业务UI；页面已有资源不另行制作。

最终输出1920×1080、30fps、H.264/yuv420p、静音AAC48kHz、MP4 faststart。SRT简体中文；配音文稿另存`voiceover.md`。

## 验证与失败保留

`evidence/capture.json`记录两次真实点击的坐标/命中检查/时间、列表实际文字、t001详情/时间字段、空初始存储与模型请求数。`evidence/validation.json`和`ffprobe.json`记录时长、帧数、编解码、静音、PTS、全片解码、实际画面区域黑屏/空帧和结尾冻结检查。关键帧与35秒逐秒接触表须另行视觉核对，不能把退出码当作全部证据。

初次两次录制因滚动导致目标卡片不完整可见，被脚本拒绝；失败JSON保留在evidence，未用于成片。一次原始录制检测到1次CFR补帧，初审拒绝后继续核对原始日志，定位在原始0.90–1.00秒，早于裁切起点1.100秒；这次素材在实际使用区间没有丢帧/补帧。另一次重录在实际使用区间出现补帧，仍拒绝。`pacing-audit.json`及原始日志摘存提供依据，不把原始全长的补帧计数说成0。具体最终结果和人工复核见`validation-report.md`。
