# 教学闭环验收记录

本轮基于main93a7e2e，独立feat/ai-teaching-loop分支。用户已明确授权教学相关跨目录修改；保留其他业务，不自行合并main。运行环境Windows、Node24.19、原锁文件npm ci，真实浏览器使用已安装Edge。所有账户、资料和课堂记录均为虚构。

## 已执行检查

| 检查 | 实际结果 |
| --- | --- |
| 根与server的npm ci --no-audit --no-fund | 成功，未更换依赖 |
| 根类型检查与B类型检查 | 通过 |
| 根npm test | 78/78通过，包含课程/数学答案/发布隔离/证据/版本/幂等/错误日期及服务重试 |
| B工作流测试 | 9/9通过 |
| server Prisma生成、构建与npm test | 通过，88/88，包含权限、迁移、文件收交、分页及新教学API/模型适配 |
| H5和微信小程序构建 | 通过；最终Mock/API四项构建及远程CI另行记录 |
| 原业务浏览器回归 | 一次完整运行原流程20项通过、4项API专用在Mock下跳过 |
| 教学Mock/API桌面/手机 | 隔离套件4/4通过；最终增加真实写入成功后响应丢失场景继续回归 |
| npm run test:demo | 通过，含重复初始化、HTTP重启、WAL快照、恢复库、demo:serve |
| npm run test:teaching-demo | 通过，真实HTTP生成v1/课堂事实/反馈/v2；API停止、重复初始化、启动新进程后同一版本和反馈仍在 |

## 问题与处理证据

- 新领域模块和服务测试先观察缺失失败，再实现。追加三项边界测试实际失败：不可能日期抛RangeError、同一反馈可重复用于后续版本、伪造差异描述未被拒绝；修正后根78项全绿。
- 第一次完整API浏览器运行因其他套件共享登录限流返回429。保留产品限流，教学套件改为独立后端/数据库；Mock/API桌面手机4/4通过。
- Windows原test:demo在再次生成Prisma时复现已加载DLL的EPERM。将WAL备份/恢复检查放到短生命周期子进程，检查内容保留；完整test:demo及教学HTTP重启验收通过。一次启动探测超时经保留子进程诊断后重跑通过，未声称定位到永久性启动缺陷。
- 跨前后端复用纯状态机时发现前端ES2020不支持Array.at类型；改用slice(-1)[0]，不提升全局编译目标。
- 小程序首次本地构建遇文件权限EPERM；在授权执行环境重跑通过，没有修改编译规则绕过。
- 现有主分支CI曾手机推荐失败；本轮原流程完整通过，未把一次通过描述为已查明其历史偶发根因。

## 截图与内容

docs/screenshots/teaching-{mock-desktop,mock-mobile,api-desktop,api-mobile}-{course,feedback,revision,parent}.png为实际浏览器操作截图。桌面1440px、手机390px；测试检查文档无横向溢出及pageerror。预置课程完整人类可读内容见TEACHING_DEMO_COURSE.md；录屏路径见TEACHING_LOOP_DEMO.md；接口见TEACHING_AI_API.md。

## 能力边界

模型测试使用虚构transport；真实供应商连通、延迟、费用和教学质量未验证。modelEnabled仅表示配置齐全。未提供公网部署、微信开发者工具/真机或真实教学试点证明。当前支持一个有完整内容的初一数学4课案例；样例修订适用于第二课Q4/Q5移项错误，不宣称覆盖任意学科。

成长曲线、补救题、真实成绩提升、OCR、视频、支付、微信通知不属于本轮P0，不宣称已交付。Mock仅本机教学状态，真实文件收交仍使用原API课次模块。
