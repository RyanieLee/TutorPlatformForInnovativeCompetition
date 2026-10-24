# S03｜家长与教师的沟通断层｜产品引入

35秒概述片段，对应总片00:35–01:10。真实课程模块、首页、演示导航为业务画面来源；开场问题、五环节链路和双角色文字为编辑信息图形，不是重建的业务UI或虚构访谈。

## 交付文件

- 视频：`exports/clip_S03.mp4`
- 完整包：`exports/S03_delivery.zip`
- 字幕：`captions_S03.srt`；配音文稿：`voiceover.md`
- 清单：`manifest.json`；验证：`validation-report.md`、`evidence/validation.json`
- 关键帧：`keyframes/`；无包装网页对照帧：`evidence/sourceframes/`（PNG随ZIP提供）
- 工作区下载：`/workspace/shared/downloads/S03/clip_S03.mp4`、`/workspace/shared/downloads/S03/S03_delivery.zip`

普通Git不提交MP4、ZIP或原始录像。只提交复现脚本、字幕、清单、报告、最终关键帧和轻量证据。原始录屏、启动/录制日志及Playwright截图保留在`raw/<runId>/`。

## 稳定基线与真实前置数据

业务基线：`5d04c4f789780d551b785c542e9946cf9453dd18`（执行时最新稳定main，Frontend Build成功）。独立分支`video/segment-S03`，未修改业务规则，不合并main。录制前阅读根目录README、DEMO_GUIDE、教学闭环演示文档、首页/演示导航/预约/教学课程页面，以及`e2e/teaching-loop.spec.ts`、`e2e/demo-experience.spec.ts`等相关自动化。

新建全空cookie/origin的浏览器上下文，通过**真实UI**完成：

1. 选择家长演示身份，真实点“小林老师”并核对`t001`及80元/小时。
2. 创建“小航”的虚构数学预约，周六下午，辅导需求注明初一/一元一次方程/预算100元以内；授课方式保留页面已有“均可”。联系电话仅为现有测试使用的演示数字，不出现在成片。
3. 退出/切换大学生家教身份，打开这条真实刚创建的预约，真实“接受预约”并确认状态。
4. 打开“教学计划与课后反馈”，真实加载四课预置课程，明确标注“非实时生成”。仅加载草稿，**不声称已发布**。

不编造不存在的bookingId，不直接写localStorage，不读取S01/S02或其他成员浏览器。实际booking URL及每步状态见`evidence/capture.json`。已有课程模板匿名编号`DEMO-STUDENT-01`保留原样，作为本次“小航”虚构案例采用的模板编号，不修改业务数据冒充另一个学生。

S03只用课程模块作为开场背景，不生成课堂3/5、v2或提分结论；统一后续故事在manifest中注明，留给对应片段完成。未调用或连接真实模型；未自动发布课程。

## 独立复现

需要Node>=20、Python3、FFmpeg/ffprobe、Playwright Chromium、Xvfb、libX11/libXtst、Noto Sans CJK。在仓库根目录：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S03/scripts/capture.mjs
node video-production/segments/S03/scripts/render.mjs
node video-production/segments/S03/scripts/validate.mjs
# 另行查看最终关键帧、逐秒接触表与sourceframes，核对实际页面和DOM证据
python3 video-production/segments/S03/scripts/package.py
```

本轮Node24.19.0/npm11.9.0，已完成npm ci。capture自行选空闲端口，实际运行`npm run demo -- --port <port> --strictPort`并解析启动日志URL；自行创建X显示和独立浏览器，结束关闭自身进程。业务源码偏离manifest.gitSha时拒绝录制。**录制和渲染顺序执行**，减少资源争用。

本环境使用已有工具二进制`XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb`，该路径仅为X服务器工具，不引用S01状态。无sudo的Debian13兼容环境可从官方包安装：

```bash
python3 - <<'PY'
import urllib.request
urllib.request.urlretrieve('https://deb.debian.org/debian/pool/main/x/xorg-server/xvfb_21.1.16-1.3+deb13u4_amd64.deb','/tmp/S03-xvfb.deb')
PY
# SHA256: 893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6
dpkg-deb -x /tmp/S03-xvfb.deb /tmp/S03-x11
XVFB_BIN=/tmp/S03-x11/usr/bin/Xvfb node video-production/segments/S03/scripts/capture.mjs
```

其他环境优先使用系统Xvfb。字体可用`S03_FONT_REGULAR`、`S03_FONT_BOLD`指定。

## 录制、镜头与验证

原生X11连续录屏，1920×1080视口、30fps；通过像素比对定位浏览器实际视口，原生翻译气泡如出现仅在镜头外真实关闭。注入的只有pointer-events:none光标/点击波纹；Playwright读取真实元素中心，平滑mouse.move，真实mouse.click与elementFromPoint命中核对，检查真实URL/DOM变化。

0–10秒真实课程模块背景+问题句；10–19秒“找老师→备课→课堂记录→反馈→下一课”抽象链路；19–27秒实际首页“5分钟演示路线”点击、五步导航与教学卡片滚动；27–35秒真实导航背景+领航云学堂+家长/大学生家教，衔接小航的数学需求。暖白/墨绿、适度推近与短文字显隐。页面已有资源原样录入，不新增外部音乐、图片或真人采访素材。

输出H.264/yuv420p、1920×1080、30fps、35.000秒、静音AAC48kHz、MP4 faststart。SRT为简体中文短句，旁白单独留稿。

验证包含ffprobe、帧数/PTS、全片解码、音轨静音、实际业务画面区域黑屏/空白检查、课程来源和真实预约、点击窗口/坐标/页面状态、五步导航和双角色文字。原始录制计数的变化区间由`pacing.mjs`审计，实际使用片段内出现掉帧/补帧会拒绝。关键帧和接触表还需单独视觉检查，不把脚本退出码当作全部证据。

失败尝试保留JSON，未用于最终成片；详情及远程交付状态见验证报告和delivery.json。
