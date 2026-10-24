# S05-S07 实测验证报告

验收通过；基线 main `5d04c4f789780d551b785c542e9946cf9453dd18`。Node 24.19.0，npm ci 成功，真实 npm run demo Mock H5；未修改业务规则，未调用模型。

最终视频 `S05-S07/exports/clip_S05-S07.mp4`，80.000000 秒，2400 帧，1920×1080，30 fps，H.264/yuv420p，AAC 48 kHz 静音，faststart。

SHA256：`f9768d2712a5726392b3f70e114b1229f1267236cdd515f7440c3b8cb9c1863d`；文件 4826739 字节。

## 自动验收

28 项通过。完整结果在 evidence/validation.json；ffprobe 原始结果在 evidence/ffprobe.json。检查含完整解码、逐帧时间戳、准确时长/帧数、黑屏/空帧检测、静音采样和实际点击状态。

| 检查 | 结果 |
|---|---|
| S05ValidatedHash | 通过 |
| S05FreshContext | 通过 |
| S06ValidatedHash | 通过 |
| S06FreshContext | 通过 |
| S07ValidatedHash | 通过 |
| S07FreshContext | 通过 |
| threeIndependentCaptures | 通过 |
| onlyPendingOrdersNoNotification | 通过 |
| oneFixedCameraAcrossCuts | 通过 |
| exact80Seconds | 通过 |
| 2400Frames | 通过 |
| 1920x1080 | 通过 |
| 30fps | 通过 |
| H264yuv420p | 通过 |
| AAC48kHz | 通过 |
| faststart | 通过 |
| regularFrameTimestamps | 通过 |
| completeDecode | 通过 |
| silentAudio | 通过 |
| noBlackBusinessFrames | 通过 |
| noBlankFrames | 通过 |
| exactSourceFrame899 | 通过 |
| exactSourceFrame900 | 通过 |
| exactSourceFrame1649 | 通过 |
| exactSourceFrame1650 | 通过 |
| exactSourceFrame2399 | 通过 |
| captionsCover80Seconds | 通过 |
| noModelCall | 通过 |

## 图像与真实页面复核

已人工查看各段全部关键帧、每秒接触表及原始网页截图，核对原页面资料、光标点击位置、字幕和结果。此为关键帧/每秒抽样视觉核对，不声称逐帧人工查看；全片技术解码覆盖所有帧。简体中文字幕无可见乱码，无黑屏或定位偏移。固定完整浏览器画幅，只有必要的真实网页滚动、光标和描边；无摇镜、反复缩放或 zoompan。

三个子片共78项、合片28项，合计106项通过。准确切点30秒/55秒；899、900、1649、1650、2399帧与对应原片解码RGB逐像素一致。首次直接拼接分段AAC造成80.021029秒，已拒收并改为复制视频帧、单条80秒静音AAC，最终视频/音频从0.000000开始且均80.000000秒。三个原始上下文为空且互不共享存储；S07独立建立自己的待确认记录。原录制丢帧均0；S05/S07重复0，S06一次CFR重复约33ms（静止订单展示），详见各段审计。

## 事实边界与保留记录

均为统一虚构人物与本机 Mock 记录，不表示真实服务器预约、跨设备同步、老师已接单或真实通知；状态始终“待家教确认”。必要联系字段使用非个人电话的演示数字10000000000。没有伪装调用大模型，不承诺提分或资质认证。只使用现有项目网页素材与自产字幕/图形，无新增外部音乐/真人访谈素材。

原生翻译提示框/取景准备失败、早期CFR严格阈值和页面入口定位失败等记录保留于 evidence/failure-*.json 或 capture-*.json；最终 evidence/capture.json 与选中日志、录像哈希绑定。原始录像保留本机 raw/，不进入普通Git；下载包提供最终视频与必要证据、脚本。

## 上传与交付

脚本/证据已提交 [PR #47](https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/pull/47)。GitHub Release MP4附件上传返回 HTTP 401 Bad credentials，未成功发布远程视频；不尝试绕过凭据。实际成片与完整包提供在 /workspace/shared/downloads/S05-S07/。合片MP4 SHA256为 `f9768d2712a5726392b3f70e114b1229f1267236cdd515f7440c3b8cb9c1863d`。没有合并main；交付信息见delivery.json。
