# S01 验证报告

状态：**通过**。本报告基于真实输出文件、实际浏览器状态、原生录屏统计、6幅全尺寸关键帧和每秒一格的40格联系表；没有仅用脚本退出码认定成功。

## 来源与媒体

- 业务SHA：`5d04c4f789780d551b785c542e9946cf9453dd18`（执行时最新稳定main，main CI 39946226822成功）。
- 成片：`exports/clip_S01.mp4`，10,499,621字节。
- MP4 SHA256：`b21aba8648e9ab5e1458b2f969dfc7b8f3e6c9519b899b117452b6667cb080ef`。
- ffprobe：40.000秒；1920×1080；30/1 fps；1200帧；H.264 High / yuv420p；AAC、48000Hz、双声道；moov位于mdat之前，faststart成立。
- AAC解码最大样本幅值为0；无配音或音乐。整段音视频完整解码无FFmpeg错误。
- 原始屏幕录制43秒/1290帧，原生30fps，dup_frames=0、drop_frames=0；剪出40秒，不用静态截图伪装录制。
- 成片1200个视频PTS严格按1/30秒递增；实际画面区域逐帧检查无黑屏区间或低方差空白帧。

## 实际操作与状态

| 镜头合同 | 真实证据 |
| --- | --- |
| 00–05秒演示导航 | 录制前确认页面“当前为本机演示”，主导航/示例卡片实际存在；0.8秒关键帧可见真实导航与标题 |
| 05–12秒点击示例 | 8.217秒实际mouse.click；真实按钮中心(1363.805, 771.750)，DOM命中成功；随后URL切至匹配页 |
| 12–20秒预置字段 | 实际input值为100、周六下午、耐心；真实选中项为数学、初中（演示）、均可；16秒关键帧均可读 |
| 20–31秒生成推荐 | 22.642秒实际mouse.click；真实按钮中心(952.500, 943.312)，命中成功；等待小林卡片和理由后滚动 |
| 31–40秒结果推近 | 31.5与39秒关键帧显示小林89分/80元及多项理由；至少两条理由完整位于最终镜头裁切内，字幕“让推荐有依据” |

小林通过现有姓名过滤，并在镜头外真实点击详情确认URL包含`t001`；不以排序第一作为选择依据。当前恰为第一名是实际规则结果，不是脚本改序。

实际前两条理由：

1. 学科吻合：数学 +35；方式兼容：均可（硬条件）
2. 空闲时间兼容：所选时段与老师时间有交集（需双方最终确认） +30

还可见教学经历自述30个月+17、课时费80≤预算100+2，以及其他因素+5。没有替换分数、卡片或文字。

## 图像核对与声音

- 已查看01_start、02_click_entry、03_fields、04_click_generate、05_result、06_end六幅1920×1080成片关键帧，并逐镜头对照浏览器实际截图和capture.json状态；字段、姓名、分数、预算与时间一致。
- 已查看40格联系表：各镜头按规定顺序推进；字段推近与结果推近连续，未发现黑屏、异常停顿或镜头越界。字幕为6段简体中文短句，没有硬压整段旁白。
- 浏览器视口与X11抓取像素对齐误差为0，原生翻译提示在镜头外关闭后对应区域误差为0。虚拟光标与网页一起进入后期镜头变换，未发生相对定位偏移。
- 字体人工抽查无乱码；卡片、至少两条推荐理由清楚可读。完整解码、逐帧PTS、实际画面区域空白检查补充关键帧抽查，不假称1200帧都经人工逐帧观看。
- 编排只含真实连续录屏、暖白画框、墨绿文字、缓动镜头、光标和点击波纹；没有重建业务UI、替换结果或插入未经授权的音乐/新图片。

## 隔离、边界与制作记录

正式浏览器上下文的cookies和origin存储均为空，不借用其他组员或预热浏览器的localStorage。模型请求为0，视频与字幕均标明Mock规则演示；规则结果不代表资质核验或教学效果。后续3/5、10分钟符号专项与v2仅保留在统一案例文稿，不在本片段冒充已操作。

业务文件与基线SHA一致；新增内容只在video-production/segments/S01，未强制合并main。初次捕获脚本因日志文件创建时序错误在录制前失败，failure JSON已保留；修复后新建独立上下文完成本次录制。最终status=passed不是对所有尝试的笼统声明。

MP4不提交普通Git；产物路径与复现见README，下载附件/权限信息以PR正文及交付回执为准。

## 机器检查

共21项，全部通过；具体实际值见evidence/validation.json：

- exact40Seconds: PASS
- 1200Frames: PASS
- resolution: PASS
- frameRate: PASS
- H264yuv420p: PASS
- AAC48kHz: PASS
- faststart: PASS
- monotonic30fpsPTS: PASS
- completeDecode: PASS
- silentAAC: PASS
- noBlackIntervals: PASS
- noBlankFootageFrames: PASS
- twoReasonsInsideFinalCamera: PASS
- SRT40SecondsUTF8: PASS
- twoActualClicks: PASS
- clicksInShotWindows: PASS
- actualTutorAndReasons: PASS
- noModelCall: PASS
- freshBrowserContext: PASS
- nativeViewportAlignment: PASS
- captureNoDropOrDup: PASS
