# B 家教端与管理员端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking. Native execution is recommended; execution method awaits user selection.

**Goal:** 在现有 H5 站点交付可联调的家教入驻/预约和管理员审核/举报闭环，保留后续 UI 美化空间。

**Architecture:** 复用现有五个页面、路由、BusinessService 和会话层；局部组件、操作控制辅助、测试和文档放入个人目录。服务端负责真实权限和状态机，页面以服务返回为准。UI 样式可后续调整，不改变业务契约。

**Tech Stack:** 现有 uni-app / Vue 3 / TypeScript / Vite / Vitest / vue-tsc；联调复用 Fastify / Prisma / SQLite 开发 API，不新增依赖。

**Spec:** [2026-10-18-tutor-admin-design.md](./2026-10-18-tutor-admin-design.md)（用户已确认；UI 后续可美化）。

## Global Constraints

- 允许写入：workspaces/chunxiaruo-commits/、src/pages/tutor/、src/pages/admin/。
- 基线固定 2622d5849338ce1a1e3d9a14add587b94b84543a，工作分支 feat/tutor-admin-workflows。
- 不直接推送 main、不合并上游 PR、不改写他人分支。
- 公共路由、共享类型/服务、根级配置/依赖、server/、A/D 页面只读。
- 只用虚构演示资料，密钥和密码留在未提交环境变量。
- API 不可用时准确报错，不自动回退 Mock 并冒充持久化成功。
- 现有页面 URL、服务签名、状态值与权限不变；颜色、间距、布局后续可在本方范围迭代。
- 所有 UI CSS 限定作用域；共享视觉仅限 B 局部组件，不动 App.vue。
- 每个任务在提交前核对 diff 的全部路径；文件级冲突仅处理本人的授权目录。
- 每个任务完成先运行相关检查，再提交；失败先诊断，不用修改公共文件来绕过检查。

## Review Focus

- 管理员/家教切换后，旧账号的慢响应不能回填当前页面：任务 1 验证请求归属失效。
- 用户取消确认框或连点按钮不能发送额外请求：任务 1 和任务 3 验证。
- approved 资料重新送审必须先保存草稿；提交失败时已保存草稿仍准确可见：任务 2 验证顺序和中途失败。
- 另一账号已修改状态时，409 后刷新真实状态，原按钮不再可操作：任务 3 和任务 4 验证。
- 审核/举报接口有返回上限，草稿不能算已审核，计数不能冒充全站总量：任务 4 验证分组和范围提示。

## 任务 1：B 页面身份、异步反馈与局部 UI 基础

**Files**
- Create: workspaces/chunxiaruo-commits/components/RoleShell.vue
- Create: workspaces/chunxiaruo-commits/components/AsyncState.vue
- Create: workspaces/chunxiaruo-commits/logic/operations.ts
- Create: workspaces/chunxiaruo-commits/tests/operations.test.ts
- Create: workspaces/chunxiaruo-commits/vitest.config.ts
- Create: workspaces/chunxiaruo-commits/tsconfig.json
- Modify: 上述五个现有 B 页面（先只接入本任务能力）。

**Interfaces**
- 消费：currentSession、restoreSession、logout、canAccess、apiMode；只 import，不改实现。
- RoleShell props：title: string、role: 'tutor' | 'admin'，内容使用默认 slot；展示称呼/身份/模式并复用现有首页、工作台、登录路径。
- AsyncState props：state: 'loading' | 'error' | 'empty'、message: string；emit retry。
- createRequestScope(identity: () => string | null) 返回 begin(): { isCurrent(): boolean } 和 invalidate(): void；begin 捕获身份并淘汰上一批请求。
- runConfirmedAction<T>(options: { confirm: () => Promise<boolean>; execute: () => Promise<T> }): Promise<{ kind: 'cancelled' } | { kind: 'success'; value: T }>；页面在打开确认前先设置操作忙碌状态，用 finally 释放。
- 身份 key 由 mode、user.id、user.role 组合；测试可注入字符串，辅助不依赖 uni 全局。

- [ ] 使用已有 Vitest 写并运行失败测试：cancel 不调用 execute；confirm 拒绝时不调用 execute；身份改变或第二次 begin 后旧 token.isCurrent() 为 false；invalidate 后旧 token 失效。断言实际调用次数和返回值。
- [ ] 实现上述辅助，以最少逻辑满足测试；确认异常上抛给页面显示，不误报 cancelled/success。
- [ ] 写 B 独立 Vitest 配置：测试 include 仅个人目录 tests；node 环境，不加载 uni 插件。B tsconfig extends ../../tsconfig.json，并显式 include 本目录和两个 B 页面目录；保留项目类型，不改根配置。
- [ ] 实现两个局部组件并接入五页。保留现有 uni-app 标签、onShow/onLoad；页面开始加载先清旧数据，在写入结果前检查 scope。onUnload 调用 invalidate，避免旧请求回写。
- [ ] 退出/切换调用共享 logout；API 退出失败按当前会话层实际清理结果提示，不把未撤销说成成功。页面权限仍单独检查，组件不是鉴权替代。
- [ ] 运行 B 单测、B 类型检查、根类型检查；浏览器检查三个角色与未登录时的 B 页面入口；通过后仅提交本任务文件。

## 任务 2：入驻与审核完整闭环

**Files**
- Modify: src/pages/tutor/application.vue
- Modify: src/pages/admin/application-detail.vue
- Create: workspaces/chunxiaruo-commits/logic/application.ts
- Create: workspaces/chunxiaruo-commits/tests/application.test.ts

**Interfaces**
- 消费 BusinessService 的 getMyApplication/saveApplicationDraft/submitApplication/getApplication/reviewApplication 及 TutorApplication/Input、User。
- submitReviewedApplication(service: Pick<BusinessService, 'saveApplicationDraft' | 'submitApplication'>, user: User, current: TutorApplication | null, input: TutorApplicationInput, onDraftSaved: (draft: TutorApplication) => void): Promise<TutorApplication>。
- 当 current.status === 'approved' 时先 saveApplicationDraft，再调用 onDraftSaved，再 submitApplication；其他可提交状态直接提交。待审页面禁止发起该操作，后端仍作最终校验。

- [ ] 写失败测试：approved 保存成功后才提交；保存失败时 submit 未被调用；提交失败时 onDraftSaved 已收到服务返回草稿；rejected 首次只提交，不额外保存；输入对象不被辅助修改。
- [ ] 实现上述顺序；复用现有表单字段与验证规则。草稿允许不完整，提交必须验证，拒绝原因为 trim 后非空，保持 200 字页面上限。
- [ ] 家教页面区分未申请、draft、pending、rejected、approved；pending 只读；已通过编辑前提示保存会撤销公开展示；草稿保存、正式提交、重提分别明确反馈。
- [ ] 管理详情只在 pending 显示批准/拒绝。操作前确认，请求中禁用冲突操作；拒绝原因保留至服务确认。冲突时重新读取，失败保留输入但不保留虚假的状态。
- [ ] 运行 B 单测/类型检查；Mock 浏览器走拒绝重提和批准后修改；API 运行同样流程，确认公开列表随审核变化。保留截图和实际记录，通过后提交。

## 任务 3：预约分组与安全操作反馈

**Files**
- Modify: src/pages/tutor/workbench.vue
- Modify: src/pages/tutor/booking-detail.vue
- Create: workspaces/chunxiaruo-commits/logic/bookings.ts
- Create: workspaces/chunxiaruo-commits/tests/bookings.test.ts

**Interfaces**
- 消费 listTutorBookings、getTutorBooking、transitionBooking 和共享 BookingStatus/BookingAction/bookingStatusLabels。
- tutorActions(status: BookingStatus): readonly BookingAction[]，仅控制界面可操作项，不能代替后端校验。
- pending → accept/reject；accepted → complete；rejected/cancelled/completed → []。不增加家教 cancel。
- 工作台分组从当前列表派生，状态文案复用共享映射，筛选为页面内行为。

- [ ] 写失败测试：五个状态的动作集准确；终态为空；输入记录不被分组逻辑改变。对页面 busy 行为补充可执行浏览器场景：确认框打开期间连点也只出现一次操作。
- [ ] 实现分组和动作映射；工作台展示待确认、已接受、历史，状态筛选和每组空态；保留原有详情路由和 id 参数。
- [ ] 详情接受/拒绝/完成调用任务 1 的确认辅助；确认框打开前设置 busy，finally 释放；操作成功使用返回记录，409 后重新读取并提示更新。
- [ ] 重新进入工作台时刷新；缺失/非本人记录显示安全提示；长需求和称呼换行，API 不显示联系方式。
- [ ] 运行 B 单测/类型检查；API 实测家长创建 → 家教接受 → 家长看到更新 → 家教完成，并单独验证拒绝、家长取消后家教只读、状态冲突。通过后提交。

## 任务 4：管理员队列、举报和有限范围概览

**Files**
- Modify: src/pages/admin/index.vue
- Modify: src/pages/admin/application-detail.vue（若任务 2 后需要列表返回衔接）
- Create: workspaces/chunxiaruo-commits/logic/admin.ts
- Create: workspaces/chunxiaruo-commits/tests/admin.test.ts

**Interfaces**
- 消费 listApplications、listReports、resolveReport 与 TutorApplication/TutorReport。
- groupApplications(items: readonly TutorApplication[]): { draft: TutorApplication[]; pending: TutorApplication[]; approved: TutorApplication[]; rejected: TutorApplication[] }。
- 举报 open/resolved 按共享类型显示；概览只基于加载记录，并持续显示“本次加载记录，非全平台总量”。

- [ ] 写失败测试：draft 独立于已处理；空数据分组完整；同一记录仅进入一个状态组；组内保留服务返回顺序且输入不变。取消处理确认不发送请求由任务 1 测试覆盖，浏览器再核对页面接线。
- [ ] 实现状态队列、空状态、概览及范围说明。当前申请上限 50、举报上限 100；达到上限时提醒列表可能截断，不实现不存在的翻页接口。
- [ ] 举报处理前确认，busyId 锁定期间禁用冲突操作，成功后刷新。保留已处理历史；不增加封禁、处理理由保存等新 API 能力。
- [ ] 独立处理申请/举报加载反馈，单一区域失败时能重试并保留成功区域；身份变更时两区域一并清空，旧响应不回填。
- [ ] 运行 B 单测/类型检查；用虚构数据验证举报处理、空列表、混合状态及长理由。API 权限验证由后端拒绝错误角色，通过后提交。

## 任务 5：响应式验收、交接与 PR

**Files**
- Modify: 仅五个 B 页面和个人局部组件样式。
- Create: workspaces/chunxiaruo-commits/docs/VALIDATION.md
- Create: workspaces/chunxiaruo-commits/docs/DEMO_B.md
- Create: workspaces/chunxiaruo-commits/docs/screenshots/ 下的实际截图。

**Interfaces**
- 页面样式保持 scoped；局部主题值集中在 RoleShell 和必要的 B 局部样式中，不引入全局设计系统或新库。
- UI 美化是后续迭代；本轮验收针对可读、可操作和无溢出，不把当前外观标为最终视觉稿。
- 协调人需要的公共 CI 命令写入交接，不修改根工作流。

- [ ] 1440px、390px、320px 浏览器验收。覆盖长文本、按钮忙碌、确认对话框、表单错误、空列表及导航返回；按需要只修本方局部布局。
- [ ] 运行下表命令并记录退出码和摘要；失败先复现与定位，基线问题与本次回归分开记录，任何未运行步骤明确标注。
- [ ] Mock/API 两种模式各走入驻审核、预约接单、举报处理；API 额外验证刷新、退出重登以及不 reset/seed 的服务重启持久化。记录实际使用的虚构账号 ID，不记录密码/令牌。
- [ ] 若 A 页面或 C 接口阻塞闭环，在 VALIDATION.md 写确切步骤、返回错误和责任边界；不越权修复，不宣布完整验收通过。
- [ ] 保存桌面/手机截图，写 B 演示操作说明、UI 后续可调整范围、公共 CI 接入命令和未完成项。
- [ ] 最终核对 diff 路径允许列表、接口未改、无环境秘密；提交独立 PR，初始目标 feat/real-backend-integration，说明依赖 #6，列实际验证、截图、风险；不合并 PR。

## 验证命令与成功标准

先在独立本地 checkout/worktree 执行；依赖安装仅用于本机运行，禁止提交授权目录外的 lockfile 变化。临时数据库、环境文件和日志留在个人目录的本地临时子目录，不加入 Git。

| 命令/检查 | 成功证据 |
| --- | --- |
| npm ci --no-audit --no-fund | exit 0；安装失败先调查环境/基线，不改公共依赖 |
| npm run typecheck | exit 0 |
| npm test | exit 0，记录实际通过数量 |
| npx vue-tsc --noEmit -p workspaces/chunxiaruo-commits/tsconfig.json | exit 0，个人模块也参与检查 |
| npx vitest run --config workspaces/chunxiaruo-commits/vitest.config.ts | exit 0，B 的新增行为测试通过 |
| VITE_DATA_MODE=mock/api 分别设置后 npm run build:h5 | 两种模式分别 exit 0；Windows 使用 PowerShell 环境变量赋值 |
| 同样分别 npm run build:mp-weixin | 可用时两种模式 exit 0；编译通过不等于微信真机交互通过 |
| 开发 API 启动 | 按既有 server/package.json 与联调文档初始化个人临时数据库，health 成功 |
| 桌面/手机浏览器链路 | 实际截图与操作结果，页面脚本无未处理错误 |
| git diff 2622d5849338ce1a1e3d9a14add587b94b84543a...HEAD --name-only | 每一项都位于三个授权目录 |

## 自检

- 设计中的入驻、预约、审核、举报、身份、统计限制、UI 可迭代及双端验证均已映射到任务。
- 复用现有共享类型，不添加互相冲突的状态值和公共服务签名。
- 五类重点失败场景已分配自动化测试或明确的浏览器/API 验收；不能用编译替代交互验收。
- 当前仅计划完成；复选框均未勾选，不能当成实际测试或实现结果。
