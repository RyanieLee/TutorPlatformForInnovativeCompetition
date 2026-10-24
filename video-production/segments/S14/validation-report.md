# S14｜实测验证报告

通过：30项技术/业务状态检查，另已人工抽样查看最终关键帧、每秒接触表和实际网页原始截图。基线main `5d04c4f789780d551b785c542e9946cf9453dd18`；npm ci成功，Node24.19.0/npm11.9.0。

实际成片35.000000秒、1050帧、1920×1080、30fps、H.264/yuv420p、AAC48kHz静音、faststart；文件2526672字节。SHA256 `53c3fe95840530852a2ab5f0cf2cb472efd936d03f79ffc61977d966f2f3e013`。

## 真实运行证据

每段初始cookies/origins为空，独立通过UI建立家长向小林t001的数学预约：虚构小航、100元内、周六下午，非个人电话演示数字10000000000。教师真实接单、加载预置课程、核验发布v1，填入Q1—Q3对/Q4—Q5错的课堂事实，发布样例反馈，采纳第三课10分钟符号专项并确认v2。家长页面实际只读、可见v2与确认报告。课程匿名教学编号DEMO-STUDENT-01属于本段预约；不直接读写/导入另一片段localStorage。

采用原生X11连续录屏，Playwright真实元素框/命中检测/实际鼠标点击/虚拟光标及波纹；保存真实正文、URL、事件时间。程序只叠加光标/字幕/描边，不重建业务UI。画幅固定，无动态zoompan或摇镜；必要真实网页滚动不改变页面事实。

|实际录像|原始秒数|丢帧|CFR重复|画幅对齐MAE|
|---|---:|---:|---:|---:|
|match|10|0|0|0.004467|
|teacher-feedback|10|0|0|0.000000|
|teacher-review|9|0|0|0.000000|
|parent-feedback|15|0|0|0.000000|

CFR重复计数如实列出，不能据此表宣称绝对无重复。最终帧PTS连续30fps、完整解码、黑帧/异常空帧检测与静音采样通过。S16末尾2秒暖白留白为设计，并非意外黑屏。

## 验收项目

|检查|结果|
|---|---|
|realCapturePassed|通过|
|independentEmptyContext|通过|
|noModelCall|通过|
|noBrowserErrors|通过|
|sourceBaseline|通过|
|exactDuration|通过|
|frames|通过|
|format|通过|
|audio|通过|
|streamStartZero|通过|
|faststart|通过|
|completeDecode|通过|
|regular30fpsPTS|通过|
|silentAAC|通过|
|noBlackFrames|通过|
|noUnexpectedUniformFrames|通过|
|fixedCamera|通过|
|matchActualViewport|通过|
|matchNoInputDrops|通过|
|teacher-feedbackActualViewport|通过|
|teacher-feedbackNoInputDrops|通过|
|teacher-reviewActualViewport|通过|
|teacher-reviewNoInputDrops|通过|
|parent-feedbackActualViewport|通过|
|parent-feedbackNoInputDrops|通过|
|teacherConfirmedV2|通过|
|fact3of5|通过|
|tenMinuteRevision|通过|
|fourLessons|通过|
|visibleRealV2Publication|通过|

## 视觉与真实性核对

抽样查看关键帧、逐秒接触表和原始网页截图，确认推荐依据/3-of-5反馈/教师确认控件/CI/品牌等对应真实页面。无可见黑屏、乱码、光标定位偏移或镜头抽搐；不声称人工逐帧查看全部帧。全片技术解码覆盖所有帧。固定计时内完成剪辑，未额外添加转场时长。

0–10匹配理由，10–20教师反馈，20–29家长/教师分屏，29–35收束。教师侧真实9秒确认录屏，尾6秒固定实际发布结果；分屏明确“前后流程镜头并置，非实时同步”。不是两个设备同步演示。

## 边界与失败留痕

模型未连接、未调用；没有OCR自动批改、真实用户/提分效果/学历资质认证/公网运营或真实通知的成功声明。3/5=60%仅是本次五题正确率。使用现有项目网页素材与自产抽象图形，无新增未经授权音乐、图片或真人访谈。业务源码未变，未合并main。

早期录制脚本把完整URL误当相对路由，导致跳转失败，已修正并重新以空上下文完整采集；失败JSON保留，未采用错误状态画面。先前还补齐发布状态等待，最终仅使用capture.json选中的成功素材。
