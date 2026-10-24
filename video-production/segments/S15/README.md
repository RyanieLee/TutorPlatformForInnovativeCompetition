# S15｜技术架构、角色权限与自动化验证

S15独立片段，35秒；全片位置07:45–08:20。本批同时交付S14→S15→S16一条110秒总结视频，固定画幅、较快真实操作、无抖动和动态缩放。

实际main基线：`5d04c4f789780d551b785c542e9946cf9453dd18`；Node24.19.0，npm ci成功。没有改业务或合并main。独立分支video/segment-S15与批次分支video/segments-S14-S16指向同一完整交付提交。

## 文件与复现

- 成片：exports/clip_S15.mp4；字幕captions_S15.srt；voiceover.md为真人配音文稿，本片静音。
- manifest.json记录来源/时长/SHA；evidence/capture.json记录实际UI事件、网址、正文、原生画幅像素对齐和录制计数。
- evidence/validation.json、ffprobe.json、接触表与keyframes/用于复核；失败记录保留，不冒充成功。
- 原始X11录像和网页截图在raw/，不提交普通Git；最终MP4和证据进入下载包。

Node>=20、Python3/Pillow、Playwright Chromium、FFmpeg/ffprobe、Xvfb/libX11/libXtst、Noto Sans CJK。仓库根目录执行：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S15/scripts/capture.mjs
node video-production/segments/S15/scripts/render.mjs
node video-production/segments/S15/scripts/validate.mjs
# 人工核对关键帧、接触表与原始网页截图，再打包
python3 video-production/segments/S15/scripts/package.py
```

无系统Xvfb时可用XVFB_BIN指定已安装的Xvfb。本环境使用/tmp/s01-x11/usr/bin/Xvfb，仅共享工具，不读之前任何片段浏览器状态。capture自行启动npm run demo并从真实日志读端口；新浏览器cookies/origins为空。全套前置预约、小林选择、教师接受、v1、虚构3/5课堂事实、确认反馈与v2均由本段真实UI建立，未直接写localStorage、未导入前片状态。课程预置匿名编号DEMO-STUDENT-01属于本段小航预约，不改写页面冒充真人。

## 内容与边界

只有真实网页与明确的抽象文字/架构图。虚构人物；本机Mock不是公网交易、同步或真实通知；3/5=60%是本次正确率。教学模型未连接/未调用，预置课程与样例建议保留原页面来源标注。没有伪造自动批改、提分或资质认证。

S14分屏是同一预约下前后流程镜头并置，非实时同步；右侧教师9秒真实确认片段，尾6秒保留实际发布结果静帧，左侧家长画面继续，不伪造点击。S15架构区分本次Mock与可选开发API，CI来自真实main成功运行39946226822；源码核对见S15/evidence/source-audit.json。S16当前/未来分列，真实网站品牌来自DOM截图，最后2秒暖白留白。

完整批次下载目录：/workspace/shared/downloads/S14-S16/。9分钟总片缺S08–S13，见../../final/final_qc_report.md；本次总结不冒充9分钟成片。
