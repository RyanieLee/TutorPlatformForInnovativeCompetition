# S15｜实测验证报告

通过：29项技术/业务状态检查，另已人工抽样查看最终关键帧、每秒接触表和实际网页原始截图。基线main `5d04c4f789780d551b785c542e9946cf9453dd18`；npm ci成功，Node24.19.0/npm11.9.0。

实际成片35.000000秒、1050帧、1920×1080、30fps、H.264/yuv420p、AAC48kHz静音、faststart；文件1190733字节。SHA256 `d5c37f8bbfb7a0a7a6eb067a23f51a4738c681f9c94c2180638d887e52128496`。

## 真实运行证据

每段初始cookies/origins为空，独立通过UI建立家长向小林t001的数学预约：虚构小航、100元内、周六下午，非个人电话演示数字10000000000。教师真实接单、加载预置课程、核验发布v1，填入Q1—Q3对/Q4—Q5错的课堂事实，发布样例反馈，采纳第三课10分钟符号专项并确认v2。家长页面实际只读、可见v2与确认报告。课程匿名教学编号DEMO-STUDENT-01属于本段预约；不直接读写/导入另一片段localStorage。

采用原生X11连续录屏，Playwright真实元素框/命中检测/实际鼠标点击/虚拟光标及波纹；保存真实正文、URL、事件时间。程序只叠加光标/字幕/描边，不重建业务UI。画幅固定，无动态zoompan或摇镜；必要真实网页滚动不改变页面事实。

|实际录像|原始秒数|丢帧|CFR重复|画幅对齐MAE|
|---|---:|---:|---:|---:|
|parent-role|3.5|0|0|0.001338|
|teacher-role|3.5|0|0|0.045236|
|github-actions|10|0|0|0.000000|

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
|parent-roleActualViewport|通过|
|parent-roleNoInputDrops|通过|
|teacher-roleActualViewport|通过|
|teacher-roleNoInputDrops|通过|
|github-actionsActualViewport|通过|
|github-actionsNoInputDrops|通过|
|teacherConfirmedV2|通过|
|fact3of5|通过|
|tenMinuteRevision|通过|
|fourLessons|通过|
|realSuccessfulMainCI|通过|
|realCIPage|通过|

## 视觉与真实性核对

抽样查看关键帧、逐秒接触表和原始网页截图，确认推荐依据/3-of-5反馈/教师确认控件/CI/品牌等对应真实页面。无可见黑屏、乱码、光标定位偏移或镜头抽搐；不声称人工逐帧查看全部帧。全片技术解码覆盖所有帧。固定计时内完成剪辑，未额外添加转场时长。

0–9源码架构抽象图，9–18治理链路，18–28真实GitHub Actions网页录屏，28–35家长/家教真实身份页。主分支运行39946226822，SHA与基线一致，build/server/e2e均success；CI的真实URL为 https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/actions/runs/39946226822 。source-audit.json记录核查过的真实源码路径/SHA。API与模型为可选能力，本次实际录制为Mock；不把工程通过当教学有效。

## 边界与失败留痕

模型未连接、未调用；没有OCR自动批改、真实用户/提分效果/学历资质认证/公网运营或真实通知的成功声明。3/5=60%仅是本次五题正确率。使用现有项目网页素材与自产抽象图形，无新增未经授权音乐、图片或真人访谈。业务源码未变，未合并main。
