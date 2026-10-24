# S01｜家长需求与智能匹配｜40秒单功能成片

- 整片归属：核心·家长；合片位置01:10–01:50；本段严格40秒。
- 业务基线：稳定main `5d04c4f789780d551b785c542e9946cf9453dd18`，对应main CI `39946226822`成功。
- 独立制作分支：`video/segment-S01`。不修改业务规则，不合并main。
- 最终成片：`exports/clip_S01.mp4`；简体中文字幕：`captions_S01.srt`；静音AAC占位轨，无配音、音乐或真人出镜。

## 观看与下载

MP4及交付ZIP在本地exports目录真实存在，均被本目录.gitignore排除，不塞入普通Git。持续下载入口以本段PR正文及附件交付记录为准。关键帧、源脚本、清单、配音文稿和验证报告可以直接在分支中查看。

实际本地产物：

- `/workspace/tutor/video-production/segments/S01/exports/clip_S01.mp4`
- `/workspace/tutor/video-production/segments/S01/exports/S01_delivery.zip`

请下载MP4或本段交付ZIP；不要把GitHub默认Source code ZIP当作包含MP4的交付包。附加发布如为草稿，需有仓库访问权限；这不依赖平台公网部署或模型密钥。

## 复现

需要Node.js≥20（本次24.19.0）、FFmpeg/ffprobe（本次7.1.5，支持x11grab/libx264/AAC/zoompan/drawtext）、Xvfb、中文Noto CJK字体、Python3及libX11/libXtst；Python仅在镜头外处理原生浏览器翻译浮层。PNG比较使用npm ci安装的锁定依赖pngjs。

在仓库根目录：

```bash
npm ci
npx playwright install chromium
node video-production/segments/S01/scripts/capture.mjs
node video-production/segments/S01/scripts/render.mjs
node video-production/segments/S01/scripts/validate.mjs
```

capture会自动选择空闲端口，执行实际 `npm run demo -- --port <空闲端口> --strictPort`，从启动日志获取地址，创建独立X11显示与全新浏览器上下文，最后关闭自有进程。不会依赖组员的localStorage、已有账户、前一片段或预先启动的服务器。失败会保留本次日志/失败JSON和截图，不允许render伪造成功。

本次环境无sudo且没有Xvfb系统命令，使用Debian官方包解压到用户临时目录后执行：

```bash
XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb node video-production/segments/S01/scripts/capture.mjs
```

本次官方包URL：`https://deb.debian.org/debian/pool/main/x/xorg-server/xvfb_21.1.16-1.3+deb13u4_amd64.deb`，SHA256：`893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6`。独立机器可通过系统包管理器安装Xvfb，也可用 `dpkg-deb -x` 解压同一包并设置XVFB_BIN；本机已有所需共享库，不代表任意机器无需安装依赖。字体位置不同时可设置 `S01_FONT_REGULAR` / `S01_FONT_BOLD`。

capture会检查业务文件与manifest.gitSha一致；后续代码变化时请在该SHA创建独立worktree再运行，不能把新代码录成旧SHA。视频脚本本身可位于该SHA之后的制作提交中。

## 实录方式与事实边界

Playwright使用真实headed Chromium操作；FFmpeg以原生30fps抓取对应X11视口。先用实际页面截图和X11截图进行像素对齐，关闭镜头外的浏览器翻译提示，再开始连续录屏。没有用截图序列或视频贴图冒充交互；后期只加暖白边框、墨绿标题/字幕、缓动推拉。虚拟光标和波纹为pointer-events:none的展示层，真实鼠标位置取自DOM边界并经过命中检查，实际调用mouse.click。

镜头外先以真实UI确认小林详情URL含`t001`，随后销毁预热上下文；正式录制另建空cookies/空origin存储的上下文。镜头内依次真实点击“带入匹配示例”和“生成推荐”，等待URL、字段和卡片变化后才继续。

本段是现有Mock规则推荐，不调用大模型、不改权重、不伪造状态。页面真实字段为数学、初中（演示）、100元、周六下午、均可、偏好耐心；“初一小航”是统一虚构案例叙事，不冒充页面中已有姓名字段。当前返回小林89分/80元，包含学科、时间、经验、费用等实际理由；通过姓名和真实详情URL定位，不假定小林排序第一。

“一元一次方程、第二课3/5、符号专项、教师发布v2”仅记在配音文稿/manifest以供后续合片衔接，S01不伪造这些后续页面。

## 文件

| 文件 | 用途 |
| --- | --- |
| exports/clip_S01.mp4 | 1920×1080/30fps/40秒/H.264 yuv420p/AAC48kHz/faststart |
| captions_S01.srt、voiceover.md | 6段短字幕与未合成人声的参考旁白 |
| manifest.json | 片段合同、稳定SHA、角色、前置条件与五镜头时间轴 |
| scripts/capture.mjs | 独立启动、空上下文、真实点击/滚动/截图和原生录制 |
| scripts/render.mjs | FFmpeg剪到1200帧，缓动镜头、边框、标题、短字幕、静音轨 |
| scripts/validate.mjs | 编码/时长/帧/音频/faststart/空白/黑屏/真实交互检查，导出关键帧 |
| evidence/capture.json | 实际点击坐标、时间、字段、卡片、理由、源视频、视口对齐与无模型调用证据 |
| evidence/ffprobe.json、validation.json | 实际媒体探测、校验和及机器验证结果 |
| evidence/contact-sheet.jpg | 每秒一格的40格联系表 |
| keyframes/ | 起始、入口点击、字段、生成点击、结果、结尾6幅成片关键帧 |
| validation-report.md | 自动检查与实际图像核对结果、边界和交付说明 |

原始43秒X11录屏与逐次日志位于raw/，不进入普通Git或最终交付ZIP。实际浏览器原图browser_*.png保留本地并包含在交付ZIP，便于与成片比较。一次“日志文件尚未建立”的制作脚本启动失败已保留failure JSON；修复后重新独立录制，不把失败退出码当作成功证据。

## 来源

网页、既有场景人物和图像均来自指定稳定仓库实际运行；没有另外下载音乐、人物照片或背景素材，没有生成替代业务UI。后期文字是本任务给定案例/标题，字体为系统Noto CJK。真人配音留待总片合成；本段只有可解码的静音AAC占位轨。
