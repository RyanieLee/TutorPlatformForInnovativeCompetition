# V0.4 开发后端与联调契约

## 定位和运行方式

`server/` 是独立 TypeScript + Fastify 5 + Prisma 6 服务；SQLite 是**真实关系型数据库**，便于四人本机和 CI 启动，无需 Docker。当前方案适合单实例开发与演示，不作为生产多实例数据库方案。服务入口在 `NODE_ENV=production` 时拒绝启动，避免误用开发数据库与演示账户。生产上线前需评估 PostgreSQL、备份、数据删除、审计留存、HTTPS、隐私合规与正式用户身份体系。现有 Mock 模式不变，设置 `VITE_DATA_MODE=api` 后页面使用 `src/services/api/` 的实现。

后端请求成功统一为 `{ "data": ... }`，列表可带 `{ "meta": { "total", "page", "pageSize" } }`；失败为 `{ "error": { "code", "message" } }`。受保护接口使用 `Authorization: Bearer <opaque-token>`。用户 ID、角色和关联关系均由服务端会话读取，页面传给 `BusinessService` 的 `User` 仅为现有接口兼容参数，在 API 实现里被忽略。

## 数据模型

迁移：`server/prisma/migrations/20261015000000_init/migration.sql` 和 `20261018000000_tutor_subject/migration.sql`。后者为已有家教资料回填科目索引，保留原 `subjectsJson` 字段和公开 API 格式。

| 表 | 关系和用途 |
|---|---|
| User | 登录 ID 唯一；角色 parent/tutor/admin、状态 active/disabled；保存 scrypt 加盐哈希 |
| Session | 用户外键；只存随机令牌 SHA-256 摘要、到期与撤销时间 |
| TutorProfile | 每个家教用户至多一份；公开标记和查询索引 |
| TutorSubject | 家教资料的科目索引；按科目精确筛选和数据库分页 |
| TutorApplication | 每个家教用户至多一份当前申请；draft/pending/approved/rejected，保存审核快照 |
| Booking | 家长与家教资料外键；状态约束、所属人索引、每家长请求标识去重 |
| Report | 举报人与家教资料外键；open/resolved |
| AuditLog | 审核、预约和举报处理的最小操作记录（不写密码或令牌） |

`TutorApplication` 中重复的资料字段是**审核快照**，与可编辑的 `TutorProfile` 分离，防止待审期间展示内容变化。`TutorProfile.subjectsJson` 继续作为前端输出和旧资料兼容字段，`TutorSubject` 是同步维护的查询索引；公开列表在数据库中按关键词、科目、授课方式过滤并分页，首页每次加载 20 位。迁移已回填旧资料，自动化测试覆盖回填和精确科目筛选。`page` 为 1–100000，`pageSize` 为 1–50；列表返回 `meta.total`。SQLite 的角色、状态和价格 CHECK 约束在 SQL 迁移里维护；修改 Prisma schema 时同步维护后续迁移。

入驻申请提交、草稿保存和资料编辑通过申请状态条件更新；同一账号并发重复提交最多一次成功，其余返回冲突。资料与申请状态在同一事务中更新，待审期间不能通过并发请求修改资料。

## API

| 方法 | 路径 | 权限 | 用途 |
|---|---|---|---|
| GET | `/health` | 公开 | 数据库健康检查 |
| POST | `/api/auth/login` | 公开，限流 | 开发账户登录 |
| GET / POST | `/api/auth/me` / `/api/auth/logout` | 登录 | 当前用户 / 撤销会话 |
| GET | `/api/tutors`、`/api/tutors/:id` | 公开 | 仅已审核且发布的资料；列表支持 keyword、subject、teachingMode、page、pageSize |
| GET / PATCH | `/api/tutors/me` | tutor | 自己的资料；修改会撤销公开并使申请回到草稿 |
| PUT / POST / GET | `/api/tutor-applications/draft`、`/api/tutor-applications`、`/api/tutor-applications/mine` | tutor | 草稿、提交、状态；已待审/已通过时禁止重复提交 |
| GET | `/api/admin/tutor-applications`、`/api/admin/tutor-applications/:id` | admin | 申请列表（含历史状态）和详情 |
| POST | `/api/admin/tutor-applications/:id/review` | admin | `{decision:"approved"|"rejected", reason?}`，驳回必填理由 |
| POST / GET | `/api/bookings`、`/api/bookings/mine` | parent | 创建和查看本人预约；创建支持可选 `requestId` 幂等键 |
| GET | `/api/bookings/received` | tutor | 只读本人收到的预约 |
| GET | `/api/bookings/:id` | 相关 parent/tutor | 查看单笔；无关用户统一 404 |
| POST | `/api/bookings/:id/:action` | 相关角色 | accept/reject/complete 由 tutor；cancel 由 parent |
| POST | `/api/reports` | parent | 举报公开家教资料 |
| GET / POST | `/api/admin/reports`、`/api/admin/reports/:id/resolve` | admin | 查看、标记处理 |

预约状态：`pending -> accepted/rejected/cancelled`，`accepted -> completed/cancelled`。完成、拒绝、取消是终态。状态更新使用带原状态条件的 `updateMany`，竞争操作返回 409；相同目标状态重试返回当前记录。预约与举报的状态变更、审计日志在同一数据库事务内写入，审计失败会回滚业务变更。创建请求的相同 `requestId` 返回原预约，即使家教资料后来下架；相同标识对应不同内容返回 409。前端在一次网络失败后的相同表单重试中复用请求标识；应用重启后此标识不会保留。数据库不保存联系电话，前端 API 模式隐藏本机 Mock 联系号码字段。

## 认证与安全边界

账户通过本地种子脚本创建，密码由运行者的未提交环境变量提供；脚本在 `NODE_ENV=production` 禁止运行。管理员没有注册 API，生产环境也禁止 `demo.*` 登录。随机会话令牌只向登录调用者返回一次；数据库只存摘要，退出后撤销。登录每分钟限制同一来源与账户组合 5 次、同一来源总计 30 次；未知账户也执行密码哈希校验以减少账户探测的时间差。限流为单进程内存计数，仅适合开发环境。所有受保护 API 独立核对角色和归属。微信真实授权、手机号验证和资质核验**未实现**。本地开发使用虚构资料，不收集真实未成年人信息。

前端 `VITE_DATA_MODE=mock` 继续使用旧本机数据；切换到 `api` **不会自动迁移**旧预约（旧 Mock 数据可能没有真实账户对应关系，自动上传会泄漏本机信息）。微信小程序联调需配置可访问的 HTTPS 服务和微信合法域名，不能用 `127.0.0.1` 指向开发电脑。

## 后续分工

- 前端：继续通过 `src/services/contracts.ts` 和 `src/services/auth.ts` 接入，勿在页面直接读写数据库或相信客户端角色；微信真机请求单独验证。
- 后端：未来用 PostgreSQL 替换 Prisma datasource 与迁移；完成真实用户注册/微信授权、资料核验、通知、隐私策略和部署运维。
- 集成：PR 按 `main -> feat/foundation-auth-parent -> feat/core-business-foundation -> feat/real-backend-integration` 顺序审查或调整基线，勿直接覆盖未合并成果。

D 集成 #7：`teachingMode` 可省略或为 `线上`/`线下`；传值时包含该方式及 `均可`，服务端先组合过滤再分页，非法值返回 400。前端“全部”不发送此参数。未改变原调用方或数据表。
