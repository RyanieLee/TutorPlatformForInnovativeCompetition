# S05｜老师详情信息透明

30秒，核心·家长，总片02:20–02:50。主交付为相邻S05-S07目录的80秒合片，本段也可独立复现。

真实数学示例生成结果，按小林名字定位，正片点击“查看详情与预约”进入t001。学校/专业、科目、均可方式、80元报价、介绍、周六时间和长安区均来自真实详情。照片保留“示例头像”，不声称资质认证。结束在“发起演示预约”入口。

所有人物、履历、价格、照片和订单为虚构Mock演示。没有模型调用、真实通知/支付或资质认证，不改业务规则、排序或响应。

基线：5d04c4f789780d551b785c542e9946cf9453dd18，执行时最新稳定main，Frontend Build成功。已读README、DEMO_GUIDE、相关页面与自动化，Node24.19.0/npm11.9.0，已运行npm ci。每段初始cookie/origin为空。

复现（仓库根目录）：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S05/scripts/capture.mjs
node video-production/segments/S05/scripts/render.mjs
node video-production/segments/S05/scripts/validate.mjs
python3 video-production/segments/S05/scripts/package.py
```

需要Python3、FFmpeg/ffprobe、Playwright Chromium、Xvfb/libX11/libXtst、Noto Sans CJK。capture自动选空闲端口，实际运行npm run demo并读取日志URL；每段独立启动服务/浏览器并关闭自身进程。本环境用XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb，这只是工具路径，不是S01存储；其他机器可安装系统Xvfb或按合片README提取官方包。

按追加要求使用固定CSS视口1280×720、deviceScaleFactor1.5、物理录屏1920×1080；最终固定映射到1664×936/暖白1920×1080画布，无动态缩放、裁切追踪、摇镜或转场抖动。仅保留必要平滑页面滚动和直接光标动作。窗口与翻译气泡在镜头外一次真实调整，像素比对核对视口。

所有按钮真实mouse.click，命中及URL/DOM变化核验。描边pointer-events:none且不改业务文本/布局。原始录制drop/dup计数如实记录；质量阈值为无输入丢帧、最多1次孤立33ms CFR重复，再核对实际画面。不会把dup=1说成0。早期失败JSON保留，不覆盖有效录制。

输出：exports/clip_S05.mp4、captions_S05.srt、manifest、capture/render/validate脚本、配音稿、关键帧、验证报告和证据。原始录像/截图在raw目录。MP4/ZIP/原始录像不进普通Git，源网页对照JPEG随完整包交付。最终规格H.264/yuv420p、1920×1080/30fps、静音AAC48kHz、faststart。

验证需另行查看关键帧、逐秒接触表和源画面，不以脚本退出码代替。分支/PR/远程附件实况见合片delivery.json。
