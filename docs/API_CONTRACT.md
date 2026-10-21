# 开发演示 API 契约

版本：2026-10-21。实现以 `server/src/app.ts`、`validation.ts`、`format.ts` 为准；沿用 Fastify / Prisma / SQLite 单实例演示方案，不提供真实微信身份、通知、支付或生产交易。此文档明确当前接口，不代表额外新增了接口。

## 通用约定

- 本机默认 origin：`http://127.0.0.1:3001`。公开演示须在 HTTPS 反向代理后访问。
- 成功 HTTP **200**：`{"data":...}`。家教、预约、审核与举报分页列表另含 `meta`。时间为 ISO 8601 UTC；ID 为不透明字符串，不从名称推导。
- 失败：`{"error":{"code":"INVALID","message":"..."}}`。客户端按 code 处理，message 用于提示，不将具体文案当协议。
- 登录后发送 `Authorization: Bearer <token>`；没有 Cookie 登录或 JWT 解码约定。用户 ID、角色、记录归属取自服务端会话，忽略前端自行声明的 User/角色。
- 请求 JSON 最大 32768 字节。业务写入字段按下表校验；严格 schema 拒绝额外字段。无真实文件上传接口。
- `Tutor.id` 是公开家教资料 ID，**不同于**登录用户 ID。详情、预约、举报均使用 Tutor.id。

| HTTP | code | 客户端处理 |
| --- | --- | --- |
| 400 | INVALID | 修正字段、范围或请求格式 |
| 401 | UNAUTHORIZED | 未登录、密码错误、过期/撤销令牌；重新登录 |
| 403 | FORBIDDEN | 当前角色不能操作 |
| 404 | NOT_FOUND | 不存在/未公开，或预约不属于当前账户；不透露其他人的记录 |
| 409 | CONFLICT | 已处理、非法状态转换、并发更新或请求标识冲突；刷新查询 |
| 429 | RATE_LIMIT | 等待限流窗口结束后重试 |
| 500 | INTERNAL | 服务/数据库异常；不返回内部堆栈 |

Fastify 的其他 4xx（如过大请求 413）也封装为 INVALID。字段校验细节见 validation.ts。

## 身份接口

| 方法 / 路径 | 身份 | 输入 | data |
| --- | --- | --- | --- |
| GET `/health` | 公开 | 无 | `{status:'ok'}`，执行数据库 SELECT 1 |
| POST `/api/auth/login` | 公开 | `{loginId,password}` | `{token,user,expiresAt}` |
| GET `/api/auth/me` | 任意已登录 | 无 | User |
| POST `/api/auth/logout` | 任意已登录 | 无 | `{ok:true}`，立即撤销当前令牌 |

`loginId` 为 1–80 字符，password 为 1–200 字符；演示种子密码初始化时要求至少 12 位。User 为 `{id,displayName,role}`，role 为 `parent/tutor/admin`。登录限流计入成功和失败请求：每来源 IP + 账户每 60 秒最多 5 次、每来源 IP 每 60 秒最多 30 次；状态在进程内，重启清空。会话默认 24 小时，`SESSION_HOURS` 限制在 1–168。令牌只保存哈希，退出或用户停用后不能访问。

## 公开家教与价格筛选

GET `/api/tutors` 公开查询，仅返回 published、账户 active 且申请 approved 的资料。

| query | 类型 / 范围 | 默认与含义 |
| --- | --- | --- |
| keyword | string，最多 80 字符 | 可省略；名称、学校、专业、地区、科目包含匹配 |
| subject | string，最多 30 字符 | 可省略；科目精确匹配；前端“全部”不传 |
| teachingMode | `线上/线下` | 可省略；包括所选方式和家教“均可” |
| minPrice / maxPrice | number，0–2000，最多两位小数 | 独立可省略；闭区间，min 不得大于 max |
| page | integer，1–100000 | 1 |
| pageSize | integer，1–50 | 20 |

所有过滤在数据库分页之前执行，排序为 createdAt DESC、id DESC。返回 `{data:Tutor[],meta:{total,page,pageSize}}`。当前家教报价为整数元；小数筛选下限向上取整、上限向下取整后执行数据库比较，避免 Prisma 整数字段截断边界。例如 minPrice=80.01 不包含 80 元，maxPrice=79.99 不包含 80 元。查询参数中的未知字段被忽略，不作为新筛选能力。

Tutor：`{id,name,university,major,subjects:string[],teachingMode,area,pricePerHour,introduction,availability,tags:string[]}`。API 当前 tags 为空数组，不生成虚构标签。

| 方法 / 路径 | 身份 | 输入 / data |
| --- | --- | --- |
| GET `/api/tutors/:id` | 公开 | 返回公开 Tutor，否则 404 |
| GET `/api/tutors/me` | tutor | 自己的 Tutor 或 null；可包含未公开资料 |
| PATCH `/api/tutors/me` | tutor | 申请资料字段的子集；返回 Tutor；调用会撤回公开并回到 draft，待审核期间 409 |

## 入驻与审核

ApplicationInput：以下字段**全部必填**；POST 提交要求非空。价格是整数元，不改变既有存储结构。

| 字段 | 提交要求 |
| --- | --- |
| displayName | trim 后 1–20 字符 |
| university / major / area | 各 1–40 字符 |
| subjects | 1–6 个科目，每项 1–30 字符，不得重复 |
| teachingMode | `线上/线下/均可` |
| pricePerHour | integer，1–1000 |
| introduction | 10–500 字符 |
| availability | 1–100 字符 |

草稿 PUT 同样需要完整字段集合，但字符串可空、subjects 可为空（最多 6 项）、价格允许 0–1000；不接受任意额外字段。Application 返回输入字段加 `{id,userId,status,createdAt,updatedAt,reviewedAt?,rejectionReason?}`，status 为 `draft/pending/approved/rejected`。

| 方法 / 路径 | 身份 | 输入 | data / 规则 |
| --- | --- | --- | --- |
| GET `/api/tutor-applications/mine` | tutor | 无 | 自己的 Application 或 null |
| PUT `/api/tutor-applications/draft` | tutor | 完整草稿字段 | Application；pending 时 409；修改 approved 会撤回公开 |
| POST `/api/tutor-applications` | tutor | ApplicationInput | pending Application；pending/approved 重复提交 409 |
| GET `/api/admin/tutor-applications` | admin | page / pageSize 可省略 | Application[] 与 meta；默认每页 50 条 |
| GET `/api/admin/tutor-applications/:id` | admin | 无 | Application 或 404 |
| POST `/api/admin/tutor-applications/:id/review` | admin | `{decision:'approved'/'rejected',reason?:string}` | Application；只有 pending 可处理；拒绝原因 trim 后非空且最多 500 字符 |

重新送审：已批准资料先保存草稿以撤回公开，再提交；前端 B 的操作封装完成这两步，不能跳过状态规则。状态与资料公开/审计同步写入事务。

## 预约

POST `/api/bookings` 仅 parent；输入严格为 `{tutorId,studentName,subject,expectedTime,note?,requestId?}`。tutorId 1–100 字符；studentName 1–40、subject 1–30、expectedTime 1–100；note 最多 500，默认空串；requestId 8–100。只允许预约当前公开且已审核的家教及其科目。

不接收/存储联系电话。为前端兼容，Booking 的 contact 固定输出空串。Booking：`{id,parentId,tutorId,tutorName,studentName,subject,expectedTime,note,contact:'',status,createdAt,updatedAt}`。

同一家长同一 requestId + 相同内容重复提交返回原预约；同一标识对应不同内容返回 409。网络结果未知时，客户端应复用 requestId 查询/重试，不能每次重建标识。

| 方法 / 路径 | 身份 | data / 归属 |
| --- | --- | --- |
| POST `/api/bookings` | parent | 创建并返回 Booking |
| GET `/api/bookings/mine` | parent | 仅自己的预约与 meta；默认每页 100 条 |
| GET `/api/bookings/received` | tutor | 仅预约家教资料归属自己的预约与 meta；默认每页 100 条 |
| GET `/api/bookings/:id` | parent/tutor | 仅自己创建/收到的预约，越权按 404 返回 |
| POST `/api/bookings/:id/accept` | tutor | pending → accepted |
| POST `/api/bookings/:id/reject` | tutor | pending → rejected |
| POST `/api/bookings/:id/complete` | tutor | accepted → completed |
| POST `/api/bookings/:id/cancel` | parent | pending/accepted → cancelled |

状态操作返回 Booking。同一角色、归属正确且当前已经是目标状态时返回现有记录；其他非法转换 409。并发使用条件更新，状态与审计同事务。列表支持下述分页；total 仅统计当前登录账户有权查看的预约。

## 举报

| 方法 / 路径 | 身份 | 输入 / data |
| --- | --- | --- |
| POST `/api/reports` | parent | `{tutorId,reason,description?}`；家教必须已发布，返回 Report |
| GET `/api/admin/reports` | admin | Report[] 与 meta；默认每页 100 条 |
| POST `/api/admin/reports/:id/resolve` | admin | 返回 resolved Report；重复处理返回已有结果 |

reason 为 `资料不实/内容不当/其他`，description 最多 500 字符，默认空串。Report：`{id,reporterId,tutorId,reason,description,status,createdAt,updatedAt}`，status 为 `open/resolved`。处理举报不自动封禁、发送消息或联系用户。

## 预约与管理列表分页

以下四个 GET 接口接受可选的 `page`（整数 1–100000，默认 1）与 `pageSize`（整数 1–100）：`/api/bookings/mine`、`/api/bookings/received`、`/api/admin/tutor-applications`、`/api/admin/reports`。申请列表默认每页 50，其余默认 100；不传参数保持原默认条数。公开家教接口仍使用原来的 20 默认值和 50 上限。

统一返回 `{data:[...],meta:{total,page,pageSize}}`。超出末页返回空 data 和真实 total；非法范围、空值、非整数及重复分页参数返回 400 INVALID。未知查询字段忽略，不允许通过 userId/role 参数更换归属。先验证身份与角色，再查询；401/403 不返回 meta。

申请按 updatedAt DESC、id DESC 排序，预约和举报按 createdAt DESC、id DESC 排序。单次请求的计数与记录查询在同一数据库事务中执行，预约计数与记录使用相同归属条件。同一时间戳下通过 ID 排序保证顺序确定；页码分页不提供跨请求快照，翻页期间有新增记录或申请更新时，应从第一页刷新。

示例：`GET /api/bookings/received?page=2&pageSize=20`，携带家教令牌。前端现有适配器只读取 data，继续显示默认第一页；本次没有新增前端“加载更多”。前端负责人接入时需要扩展 BusinessService 和 Mock 契约、保留 meta 并提供分页操作，不能直接把 total 当成当前页条数。

## 环境、CORS 与前端交接

- `DATABASE_URL=file:...`：相对路径相对于 server/prisma；长期演示使用受控持久磁盘上的绝对路径。
- `CORS_ORIGINS`：逗号分隔的精确前端 origin，不含路径或末尾 `/`。跨域允许不是身份校验，API 每个受保护请求仍检查令牌。
- 账号种子：demo.parent / demo.tutor / demo.admin；密码仅在本机环境的 SEED_*_PASSWORD 中，不写到本文或前端。
- A/B/D 继续依赖 BusinessService；新增价格参数均为可选，不改变旧调用。前端 `VITE_DATA_MODE=api`、`VITE_API_BASE_URL` 是构建时设置。Mock 记录不自动上传；API 失败不能以虚构数据伪装成功。
- 初始化/持久化/启动与 HTTPS 方案见 `SERVER_DEMO.md`；启动保护保持不变，`NODE_ENV=production` 拒绝演示服务启动。
