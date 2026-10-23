# 云伴学持续教学实施计划

Goal: 将已确认作品介绍中的待实现业务接入 PR #39，并保留双主题。
Architecture: 学生档案聚合 + 服务端按角色投影 + 既有预约/课次；独立沟通模块。
Tech stack: Vue 3 / uni-app / TypeScript / Fastify / Prisma SQLite / Vitest / Playwright。
Spec: ../specs/2026-10-23-learning-continuity-design.md

## Global constraints

- 中文网站，保留绿色/Jenny主题；基线 d63d899，不直接合并 main。
- 不按姓名自动合并学生；后端逐请求验证，试课前最小披露，试课后家长显式授权、可撤销。
- 使用既有动态模型配置；失败不伪造输出，示例必须标注；没有付费模型调用授权。
- 不改写旧发布课次、附件、提交；模型完成后重新验证状态，防止撤权期间泄漏。
- 共享文件由主代理集成；独立模块的实现可并行，代理不得嵌套派工。

## Task 1: 档案与教学闭环核心

新增 shared/student-archive.ts，server/src/student-archive/，对应 server/tests/student-archive*.test.ts 和迁移。聚合包含基础信息、预约绑定、试课、grant、analysis、practice attempts、report、observations、handover。定义并导出全部 DTO/命令类型；GET list/detail/bookings，POST create/action；expectedRevision/requestId、模型归属与权限回查、来源校验、有界数据。提供 Mock 同逻辑可用的纯引擎。

测试先证明同名隔离、授权门槛、撤销、冲突、幂等、模型畸形/失效拒绝、报告来源与交接，再实现通过。主代理负责 app.ts 注册，适配 managedChat。

## Task 2: 预约沟通与通勤

新增 shared/booking-connection.ts，server/src/booking-connection/，src/services/booking-connection.ts，src/pages/connections/index.vue，对应测试。只改自己的文件，不改 app.ts/pages.json/nav/schema（提供 schema fragment 供集成）。GET/POST 消息预约双方隔离、分页/去重/状态控制；公共参考点直线距离与导航链接，有来源说明，不能编造路况和耗时。复用现有订单地图参考点；Mock明确演示且使用现有预约归属。

## Task 3: 档案页面与现有 UI 接入

新增 src/services/student-archive.ts 和 src/pages/students/index.vue（多学生列表、绑定、档案详情、授权、分析、训练、报告、交接）；新入口接入 ParentLayout/RoleShell、预约和作业页。API/Mock同类型，身份变更/离页清理异步结果。下一课报告通过既有课次编辑页有确认地导入，不自动发布。

## Task 4: 集成与证据

集成 schema/route；运行根目录类型/单测/构建、server类型/单测；关键浏览器API流程覆盖家长建档绑定、教师试课、家长授权、示例分析、教师确认、训练、报告、撤权和通信；双主题手机宽度无横向溢出。记录真实限制。一次全分支 fresh review，修复重要问题后交付独立 PR 和本地预览。

## Review focus

归属和跨教师授权必须是服务端响应投影；模型输出非可信；异步授权竞态；敏感数据不写入日志/提示；Mock不能被宣称真实安全；本轮不声称实际教学提分。
