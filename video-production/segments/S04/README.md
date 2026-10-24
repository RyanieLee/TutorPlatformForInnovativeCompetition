# S04｜推荐解释与多因子排序

30秒，核心·家长，对应总片01:50–02:20。真实Mock匹配页：`/#/pages/match/index?demoScenario=math`。实际生成推荐后，依次强调页面现有学科、时间、经历、费用、偏好与公开权重。匹配分反映当前需求和资料，不是教学质量、资质认证或提分概率。

## 实际交付

- MP4：`exports/clip_S04.mp4`
- 完整ZIP：`exports/S04_delivery.zip`
- 简体字幕：`captions_S04.srt`；配音文稿：`voiceover.md`
- `manifest.json`、`validation-report.md`、`evidence/validation.json`
- 起始/各因子/权重/结尾关键帧：`keyframes/01_start.png`至`08_end.png`
- **片前真实点击帧**：`keyframes/00_preparation_click.png`，来源同一原始录屏的片前部分，刻意不加入30秒正片，因为正片应从已出现的结果开始。其时间与来源见`evidence/preparation-click-frame.json`。
- 原始无包装网页对照帧：`evidence/sourceframes/`（PNG随ZIP交付，普通Git仅保留来源清单）
- 工作区下载副本：`/workspace/shared/downloads/S04/clip_S04.mp4`、`/workspace/shared/downloads/S04/S04_delivery.zip`

MP4、ZIP与原始录像不加入普通Git。脚本、字幕、清单、报告、最终关键帧和轻量验证证据在独立分支`video/segment-S04`提交。原始连续录屏、启动/录制日志、Playwright截图保留在`raw/<runId>/`。

## 基线和来源

业务基线：`5d04c4f789780d551b785c542e9946cf9453dd18`，执行时最新稳定main，Frontend Build成功。录制前阅读README、DEMO_GUIDE、匹配页/评分实现、启动脚本、`e2e/demo.spec.ts`和`e2e/demo-experience.spec.ts`相关测试。不修改业务规则、不合并main。

独立上下文初始cookies/origins为空；没有前一成员或S01/S02/S03的localStorage。新打开真实数学示例，核对数学、初中（演示）、100元、周六下午、均可、耐心；真实鼠标点击“生成推荐”，等待真实结果并检查现有推荐理由。片前点击、波纹及结果变化都进入同一原始录像，随后裁切精确30秒。

按“小林老师”名字定位唯一卡片，不依赖排序第一。在另一个销毁的预编译上下文，通过实际详情按钮验证`id=t001`，不复用该上下文存储。未登录、未创建预约、未连接/调用真实模型，也没有假造API响应。

页面年级选项为“初中（演示）”，不是“初一”的独立选项；统一案例小航为初一学生，选用现有初中示例。授课方式保留实际“均可”。本段不生成后续课堂3/5、反馈或v2，不把已有成绩自述当作核验结果。

所有人物、价格、学校/地理场景与自述为仓库已有虚构演示资料。权重及得分均直接显示实际页面数据；**渲染脚本没有另写权重数值或重绘评分表**。

## 独立复现

需要Node>=20、Python3、FFmpeg/ffprobe、Playwright Chromium、Xvfb、libX11/libXtst、Noto Sans CJK。在仓库根目录依次执行：

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
node video-production/segments/S04/scripts/capture.mjs
node video-production/segments/S04/scripts/render.mjs
node video-production/segments/S04/scripts/validate.mjs
# 另行查看关键帧/逐秒接触表，对照sourceframes与DOM证据
python3 video-production/segments/S04/scripts/package.py
```

本轮Node24.19.0/npm11.9.0，npm ci成功。capture自动选空闲端口，真实运行`npm run demo -- --port <port> --strictPort`并从实际日志提取URL；创建独立X显示/浏览器，结束关闭自身进程。录制和渲染顺序运行。业务源码偏离manifest.gitSha时拒绝录制。

本环境Xvfb工具二进制路径为`/tmp/s01-x11/usr/bin/Xvfb`，与S01浏览器状态无关：

```bash
XVFB_BIN=/tmp/s01-x11/usr/bin/Xvfb node video-production/segments/S04/scripts/capture.mjs
```

无sudo的Debian13兼容环境可从官方包提取：

```bash
python3 - <<'PY'
import urllib.request
urllib.request.urlretrieve('https://deb.debian.org/debian/pool/main/x/xorg-server/xvfb_21.1.16-1.3+deb13u4_amd64.deb','/tmp/S04-xvfb.deb')
PY
# SHA256: 893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6
dpkg-deb -x /tmp/S04-xvfb.deb /tmp/S04-x11
XVFB_BIN=/tmp/S04-x11/usr/bin/Xvfb node video-production/segments/S04/scripts/capture.mjs
```

其他环境优先安装系统Xvfb。字体可通过`S04_FONT_REGULAR`和`S04_FONT_BOLD`指定。

## 镜头与验证

原生X11连续录屏1920×1080/30fps；以真实浏览器截图和屏幕像素比对定位视口，原生气泡如出现仅在镜头外真实关闭。仅注入pointer-events:none光标、真实mousedown波纹和空白矩形描边，不修改业务文本/排序/样式布局。高亮取真实DOM坐标，透明矩形只强调原文字。镜头推拉根据实际卡片尺寸，保证最终整张卡片及其说明在画面内。

0–6秒：实际结果、公开规则和分数；6–15秒：学科与授课时间；15–23秒：教学经历、费用、偏好与实际权重说明；23–30秒：原结果保持不变，字幕“推荐有理由，家长可判断”。暖白/墨绿，适度推近和柔和文字显隐，无新增外部音乐/图片/采访。

输出H.264/yuv420p、1920×1080、30fps、30.000秒、静音AAC48kHz、MP4 faststart。简体SRT为短句，配音文稿另存。

验证包括ffprobe/900帧/PTS、全片解码、静音、实际画面区域黑屏/空白、真实预生成点击与结果、分项理由、动态权重来源、高亮时间窗、结尾卡片裁切及原始掉帧/补帧审计。另行检查关键帧与逐秒接触表，不以退出码代替视觉核验。最终数据和远程附件状态见验证报告与delivery.json。

## 远程交付状态

脚本/清单/证据已提交[PR #46](https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/pull/46)，保持OPEN，未合并main。GitHub release视频附件实际上传返回HTTP401 Bad credentials（uploads.github.com），CLI回滚release，查询releases为空，没有远程成片链接。未更换凭据或交互登录。按本任务允许方式提供上述实际工作区MP4/ZIP下载，完整回执见`delivery.json`。
