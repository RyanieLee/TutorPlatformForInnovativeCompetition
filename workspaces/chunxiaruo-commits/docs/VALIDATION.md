# B 中文界面验证记录

验证日期：2026-10-19。范围仅家教端、管理员端及 B 局部组件；不代表整个参赛产品已完成。

## 基线与文件边界

- PR #6 固定提交：2622d5849338ce1a1e3d9a14add587b94b84543a。
- 个人分支：feat/tutor-admin-workflows；初始合并目标 feat/real-backend-integration，依赖 #6。
- 现有业务文件只修改 src/pages/tutor/ 三页、src/pages/admin/ 两页；新增局部运行时模块位于 src/pages/tutor/shared/。
- 个人目录存放测试、独立检查配置、截图、规划与交接说明。全局路由、共享服务/类型、App.vue、依赖/锁文件、后端源代码均未更改。
- 本地 Git 网络不可用，使用 GitHub 工具固定快照；已校正下载工具额外添加的尾换行并按 Git blob SHA 核查，非授权目录的已有文本文件与固定快照一致。远程提交另核对完整文件清单。

## 已执行的验证

| 检查 | 结果 |
| --- | --- |
| 按前端和后端原始 package-lock 安装依赖 | npm ci --no-audit --no-fund，均 exit 0 |
| 根类型检查 | vue-tsc --noEmit，exit 0 |
| B 独立类型检查 | vue-tsc --noEmit -p workspaces/chunxiaruo-commits/tsconfig.json，exit 0 |
| 原前端单测 | Vitest，16/16 通过 |
| B 新增单测 | Vitest，9/9 通过；先观察未实现时的失败再实现 |
| Mock / API H5 构建 | 两种模式分别 exit 0 |
| Mock / API 微信小程序编译 | 两种模式分别 exit 0；修复 src 外模块导致的 chunk 路径错误后通过 |
| 既有后端构建 / Prisma 客户端生成 | exit 0 |
| 临时数据库迁移 | 原有两项迁移成功应用 |
| 既有后端 API 单测 | tests/api.test.ts，16/16 通过，包含角色/归属、状态流转、并发与请求去重等 |
| Mock 浏览器 | 入驻提交、确认取消、拒绝原因校验、拒绝后重提、批准、退出切换均通过，无 pageerror |
| API 浏览器 | 家长界面从家教详情创建预约 → 家教接受 → 家长看到接受 → 家教完成 → 家长刷新看到完成，通过 |
| API 审核 | 已通过资料先 PUT 草稿再 POST 审核；拒绝、修改重提、批准通过 |
| 举报 | 虚构家长创建举报，管理员处理并在已处理分类可见，通过 |
| 重复操作 | 确认取消零次请求；连续两次点击接受仅一次 POST，通过 |
| API 权限 | 家长调用家教接受操作返回 403；家长进入管理员页面被明确阻止，通过 |
| 网络结果不确定 | 模拟服务端草稿已写入但响应丢失，状态读取也失败；页面显示“状态待确认”、暂停编辑和提交，恢复查询后正确显示草稿，通过 |
| 服务重启持久化 | 不 seed/reset，重启本任务独立 API 后按同一 ID 查询，预约仍 completed、举报仍 resolved，通过 |
| 桌面/手机 | 1440px 桌面、390px 手机、320px 管理端窄屏；管理员无横向溢出，已检查家教手机截图与桌面布局 |
| 独立代码审查 | 一名独立审查者只读审查；重要的网络不确定状态问题已修复并通过红→绿浏览器回归，复核无剩余 Critical / Important |

测试使用 Node 24.19.0、npm 10.9.4、本机临时 Edge 无界面浏览器。Vitest 使用 --pool=threads --poolOptions.threads.singleThread；这绕过受限进程环境，不修改公共测试配置。可复用脚本位于 ../tests/browser-mock.cjs 和 browser-api.cjs，浏览器模块、可执行文件和虚构账户密码由环境变量传入。

## 未验证与已有环境限制

- 微信开发者工具、微信真机交互未运行；编译通过不能替代真机验证。
- 既有 server/scripts/run-tests.mjs 在本机 Windows 临时 npm 布局下调用 npx 失败；已独立运行后端 API 单测和迁移，但未宣称 server/npm test 全套通过。既有 migration.test.ts 的跨进程 npx 迁移测试未运行；留给原 Linux CI 复核。
- 本地 npm 包有上游弃用提示，Vitest 有 Vite CJS 提示；未扩大范围升级依赖。
- GitHub CI 结果在 PR 页面另行确认，不以本地结果冒充 CI 通过。
- 真实通知、身份/资质核验、生产部署、全量统计/分页及 AI 推荐属于团队其他模块；B 沿用现有开发 API 能力。
- 共享 Mock 在资料重新回到草稿时会回退到示例家教资料；真实开发 API 则撤销公开展示。未修改共享 Mock 业务实现，展示差异应由 C/协调人后续统一。

## 实际执行中的调整

1. uni-app 小程序输出不接受 src 外组件生成的 ../workspaces/... 路径。运行时文件移入授权的 src/pages/tutor/shared/，管理页直接复用；个人测试引用该实现。不改全局构建逻辑。
2. 缓存页面激活时销毁并重建表单会触发 uni-app ResizeSensor 空引用。相同身份刷新保留表单 DOM 并用 v-show 隐藏加载内容；身份变化仍同步清空资料。故障在浏览器复现后修复，复测无页面脚本错误。
3. 写入失败不等于服务端未执行。已发送写请求失败时重新读取状态；无法读取时锁定资料变更，保留输入并提供恢复查询。
4. onHide 和 onUnload 都使请求批次失效；页面缓存隐藏后不允许旧响应继续回填。
5. UI 为当前功能基线，后期可在 B 局部样式内美化，不冻结最终视觉。
