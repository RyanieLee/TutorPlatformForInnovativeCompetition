# 教学闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 交付预约内四课备课、课堂事实、反馈、第三课改版和家长只读的中文可录屏H5。

**Architecture:** 现有预约和课次保持不变；增量教学聚合由纯状态机校验，API以Prisma条件更新持久化，Mock复用同一状态机；模型适配器隔离于已有匹配解析。

**Tech Stack:** uni-app / Vue3 / TypeScript / Fastify / Prisma SQLite / Vitest / Playwright；不新增依赖。

**Spec:** docs/TEACHING_AI_ARCHITECTURE.md；用户附加完整课程需求。

## Global Constraints

- 中文网站；独立feat/ai-teaching-loop分支，不合并main，不覆盖其他成员分支。
- 保留原搜索、匹配、预约状态、审核、举报、文件收交和测试。
- 四节各45分钟；第二课3/5=60%；Q4/Q5证据；预置/模型/手工来源明确。
- 教师确认后发布；家长不得读取草稿；历史不可覆盖；请求幂等及版本冲突。
- 不发送真实学生信息、不提交密钥；保留production保护。

## Review Focus

1. 身份切换或离开页面期间完成的响应不得污染新会话；浏览器验证。
2. 修改课堂事实后，旧反馈或旧建议不得继续用于改课；状态机及API测试。
3. 网络响应丢失后的重试不产生第二份版本/记录；API及适配层测试。
4. 发布后继续备课不应让家长失去旧发布版；投影及浏览器测试。
5. 取消预约与提交竞争时不得在终态产生新计划；服务端条件更新测试。

### Task 1: 可教学课程和纯状态机

**Files:** server/src/teaching-loop/{types,engine,course}.ts/json；tests/teaching-loop.test.ts。
**Interfaces:** createLoop(bookingId):LoopState；applyCommand(state,command,now):LoopState；parentView(state):ParentLoopView；validateCourse(course):void。
- [x] 先编写课程完整性/每课45分钟/所有数学答案、发布隐藏草稿、反馈3/5与Q4/Q5、改版历史、重复请求及旧证据失效测试。
- [x] Run: npm test -- tests/teaching-loop.test.ts。Expected: 新行为缺失导致FAIL。
- [x] 实现纯类型、完整课程种子及命令状态机；无IO依赖供Mock/API共用。
- [x] Run: npm test。Expected: 全部PASS。
- [x] Commit: feat: add evidence based teaching loop domain。

### Task 2: API持久化和模型适配

**Files:** server/prisma/schema.prisma及新增migration；server/src/teaching-loop/{routes,model}.ts；server/src/app.ts；server/tests/teaching-loop.test.ts。
**Consumes:** Task1状态机与现有requireBooking/actor。
**Produces:** GET/POST /api/bookings/:bookingId/teaching-loop；POST .../teaching-loop/generate，data封装与409条件更新。
- [x] 编写真实数据库API测试：教师写、家长投影、其他账户404/管理员403、非法输入400、重复命令、版本冲突、取消预约、持久化。
- [x] Run: server npm test。Expected: 新接口404而FAIL。
- [x] 新增TeachingLoop外键表；实现鉴权、严格校验、事务内归属/状态与条件更新。生成接口返回候选命令，不自动发布；匿名上下文、限流、超时及输出校验。
- [x] 用虚构transport测试模型成功/超时/无效输出；明确真实供应商未验证。
- [x] Run: npm run db:generate; npm run build; npm test。Expected: PASS。
- [x] Commit: feat: persist authorized teaching plans and evidence。

### Task 3: Mock/API服务和中文教学页

**Files:** src/services/{teaching-loop,api/teaching-loop,mock/teaching-loop}.ts；src/pages/teaching/loop.vue及shared课程/反馈组件；src/pages.json；src/pages/{tutor/booking-detail,orders/index}.vue；tests/teaching-loop-service.test.ts。
**Consumes:** Task1 DTO/状态机、Task2接口。
**Produces:** loopService.read/command/generate；预约内教学计划入口、编辑、记录、反馈、修订和家长只读。
- [x] 先测试Mock归属及跨实例本机持久化、API失败重试requestId保留、旧账户响应丢弃。
- [x] Run: npm test -- tests/teaching-loop-service.test.ts。Expected: 缺少服务导致FAIL。
- [x] 实现服务和页面；复用教学壳、预置内容、加载/错误/重试/确认；模型与样例动作分开。
- [x] Run: npm test; npm run typecheck; npm run typecheck:workflows; npm run test:workflows; npm run build:h5; npm run build:mp-weixin。Expected: PASS。
- [x] Commit: feat: add Chinese tutor and parent teaching loop UI。

### Task 4: 浏览器验收和交付

**Files:** e2e/teaching-loop.spec.ts；相关回归修复；docs/TEACHING_{DEMO_COURSE,LOOP_DEMO,AI_VALIDATION}.md；README、DEMO_GUIDE、API_CONTRACT、ROADMAP；截图。
**Consumes:** Task3页面与Task2API。
**Produces:** Mock/API桌面/手机完整闭环证据和可运行预览。
- [x] 新增浏览器完整故事线；先观察当前页缺少新操作FAIL，然后补齐遗漏行为。
- [x] 复跑main手机推荐及原业务全流程，本轮通过，未复现历史失败；未改动推荐逻辑或声称定位其偶发根因。
- [x] 执行根/B/后端检查、Mock/API双端构建、test:demo及E2E；每项记录PASS/FAIL/未验证。
- [x] 1440px/390px截图并实际检查，准备5–7分钟演示顺序、启动方式、模型与样例边界。
- [x] 全分支独立审查，修正重要问题并回归。
- [x] Commit并推送独立PR #30；最终远程CI结果以该PR检查为准，不自行合并main。
