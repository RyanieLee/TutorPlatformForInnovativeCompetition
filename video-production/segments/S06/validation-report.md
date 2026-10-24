# S06 实测验证报告

验收通过；基线 main `5d04c4f789780d551b785c542e9946cf9453dd18`。Node 24.19.0，npm ci 成功，真实 npm run demo Mock H5；未修改业务规则，未调用模型。

最终视频 `S06/exports/clip_S06.mp4`，25.000000 秒，750 帧，1920×1080，30 fps，H.264/yuv420p，AAC 48 kHz 静音，faststart。

SHA256：`d973180db19d047b7e4b4483573604aa9fa7c107c8a08ba2850f47e4f6a2fac6`；文件 1618195 字节。

## 自动验收

27 项通过。完整结果在 evidence/validation.json；ffprobe 原始结果在 evidence/ffprobe.json。检查含完整解码、逐帧时间戳、准确时长/帧数、黑屏/空帧检测、静音采样和实际点击状态。

| 检查 | 结果 |
|---|---|
| exactDuration | 通过 |
| exactFrameCount | 通过 |
| resolution | 通过 |
| frameRate | 通过 |
| H264yuv420p | 通过 |
| AAC48kHz | 通过 |
| faststart | 通过 |
| monotonic30fpsPTS | 通过 |
| completeDecode | 通过 |
| silentAAC | 通过 |
| noBlackIntervals | 通过 |
| noBlankFootageFrames | 通过 |
| realVisibleClicks | 通过 |
| fixedCameraNoAnimatedZoom | 通过 |
| parentDemoRole | 通过 |
| realPublicSelectionT001 | 通过 |
| realPendingOrder | 通过 |
| noFakeAcceptanceOrNotification | 通过 |
| pendingSurvivesActualReload | 通过 |
| onlyNonPersonalDemoDigits | 通过 |
| formInputsThroughRealUI | 通过 |
| bookingAndSubmitWindows | 通过 |
| SRTExactDurationUTF8 | 通过 |
| noModelCall | 通过 |
| freshBrowserContext | 通过 |
| nativeViewportAlignment | 通过 |
| nativePacingAudited | 通过 |

## 图像与真实页面复核

已人工查看各段全部关键帧、每秒接触表及原始网页截图，核对原页面资料、光标点击位置、字幕和结果。此为关键帧/每秒抽样视觉核对，不声称逐帧人工查看；全片技术解码覆盖所有帧。简体中文字幕无可见乱码，无黑屏或定位偏移。固定完整浏览器画幅，只有必要的真实网页滚动、光标和描边；无摇镜、反复缩放或 zoompan。

真实点击（相对本段）：2.117s 发起演示预约；5.475s 虚构称呼；6.950s 必填演示数字；8.169s 期望时间；10.406s 初中数学学习需求；16.716s 保存演示预约。每次均读取实际元素框、滚动至可见区域、命中检测，并调用真实 mouse.click；以实际页面/状态变化确认。

原始录制 CFR 审计：丢帧 0，重复 1。S06 一次约33ms的CFR重复发生在订单静止展示期间；如实保留计数，不宣称原始零重复。最终PTS连续30fps；见 evidence/pacing-audit.json。原生截图与X11像素对齐误差：{"x": 0, "y": 131, "error": 0, "topRightMaeAfter": 0, "businessMae": 0, "method": "PNG pixel comparison between actual viewport screenshot and X11 grab; no business UI modification"}。

独立空上下文通过真实UI登录家长、公开检索小林、进入详情，录制实际输入小航/数学/周六下午/初一一元一次方程及100元预算，16.7秒左右真实提交，16.879秒实际待确认记录出现。录制结束后刷新仍为待确认。

## 事实边界与保留记录

均为统一虚构人物与本机 Mock 记录，不表示真实服务器预约、跨设备同步、老师已接单或真实通知；状态始终“待家教确认”。必要联系字段使用非个人电话的演示数字10000000000。没有伪装调用大模型，不承诺提分或资质认证。只使用现有项目网页素材与自产字幕/图形，无新增外部音乐/真人访谈素材。

原生翻译提示框/取景准备失败、早期CFR严格阈值和页面入口定位失败等记录保留于 evidence/failure-*.json 或 capture-*.json；最终 evidence/capture.json 与选中日志、录像哈希绑定。原始录像保留本机 raw/，不进入普通Git；下载包提供最终视频与必要证据、脚本。
