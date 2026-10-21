# C 后端开发上手与本轮进度

2026-10-21。上传的 V0.2 分工文档中 C 原负责家教端，但仓库后续分工已调整：`D_INTEGRATION_PLAN.md` 将 C 定为后端负责人，B 负责家教及管理员工作台。本轮按当前仓库推进 C 的 Fastify、Prisma、SQLite 开发后端。

最新补齐分支为 `feat/c-demo-backend-complete`；下文分页初次交付保留作历史记录，当前验收与接入说明见 [C_DEMO_ACCEPTANCE.md](C_DEMO_ACCEPTANCE.md)。

## 你现在应当做什么

先跑通已有系统，再按接口缺口逐项补齐。PR #6 的后端已经合入 main，无需重新搭建。C 的主要代码目录为 `server/`；接口变更写进 `docs/API_CONTRACT.md`，共享前端服务、类型及路由由相应负责人协调接入。

建议顺序：启动现有 API → 检查健康接口 → 用三个演示身份验证预约与审核 → 做一个有验收标准的小任务 → 执行后端检查 → 提交独立分支 → 开 PR → 查看 CI → 团队集成。当前阶段仍是开发演示，不是正式运营服务。

## 如何连接 GitHub 并写入

本次 ChatGPT GitHub 连接已成功找到 `RyanieLee/TutorPlatformForInnovativeCompetition`，工具返回 `push: true`，可以向独立分支提交代码。你继续在此对话明确描述任务即可，无需把密码或访问令牌发到聊天中。

你在自己电脑写代码时，需要另外配置本机 Git；ChatGPT 的连接不会自动替你登录电脑。最容易操作的是使用 GitHub Desktop：登录自己的 GitHub 账号，克隆该仓库，用 VS Code 打开；切换或创建自己的分支，修改后在 Changes 查看差异、Commit，再 Push origin，最后创建 Pull Request。账号必须被仓库授予写入权限。

命令行方式可用下面的流程。首次 clone 后在终端进入项目目录；推送时使用你本机已配置的 GitHub 认证方式。

```bash
git clone https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition.git
cd TutorPlatformForInnovativeCompetition
git switch -c feat/c-next-backend-task
```

修改和验证完成后，明确列出要提交的文件，避免把本机配置一起加入：

```bash
git status
git diff
git add server/src/app.ts server/tests/your-task.test.ts docs/API_CONTRACT.md
git commit -m "feat: describe your backend change"
git push -u origin feat/c-next-backend-task
```

`your-task.test.ts` 是示例文件名，需换成实际修改的文件；不要原样提交不存在的文件。`git commit` 只保存到本机，`git push` 才会上传；PR 用来查看差异和集成。`.env`、数据库文件和真实用户数据均不加入提交。

要接着本轮代码做：待本轮分支已发布，在仓库里运行 `git fetch origin`，然后 `git switch --track origin/feat/api-stability-demo`；如果本机已有该分支，直接切换到它。

## 本机启动后端

安装 Node.js 20 或以上版本，在仓库中打开终端。Windows PowerShell：

```powershell
cd server
npm ci
Copy-Item .env.example .env
```

在 VS Code 打开 `server/.env`，为 `SEED_PARENT_PASSWORD`、`SEED_TUTOR_PASSWORD`、`SEED_ADMIN_PASSWORD` 各填写独立的至少 12 位密码，保留默认 SQLite 和 development 设置。然后：

```powershell
npm run demo:serve
```

在浏览器访问 `http://127.0.0.1:3001/health`，应返回 `data.status` 为 `ok`。演示账号为 `demo.parent`、`demo.tutor`、`demo.admin`，使用刚设置的对应密码。初始化保留已有业务数据，不需要反复执行清库操作。

若要联调前端，另开 PowerShell，在仓库根目录运行：

```powershell
npm ci
$env:VITE_DATA_MODE="api"
$env:VITE_API_BASE_URL="http://127.0.0.1:3001"
npm run dev:h5 -- --host 127.0.0.1
```

打开日志中的前端地址。先以家长身份创建虚构预约，再退出并以家教身份接单，最后回家长端查看更新；管理员可检查申请审核。业务操作与验收脚本见 `DEMO_GUIDE.md`。

## 本轮已推进的代码

分支：`feat/api-stability-demo`，基于 main 的 `959dd0927bac774befea42412f0511b51b05bf12`。

旧预约及举报列表只返回最近 100 条，审核列表只返回最近 50 条；超过上限的旧记录无法通过列表继续查询。本轮为四个列表补充服务端分页：

| 接口 | 默认每页 | 新增能力 |
| --- | --- | --- |
| GET /api/bookings/mine | 100 | 家长只查询自己的预约与总数 |
| GET /api/bookings/received | 100 | 家教只查询属于自己的预约与总数 |
| GET /api/admin/tutor-applications | 50 | 管理员可继续查询旧申请 |
| GET /api/admin/reports | 100 | 管理员可继续查询旧举报 |

可选 query 为 page、pageSize；返回保留原 data 数组并新增 meta。每页最多 100 条；校验非法参数；同一时间戳下按 ID 确定顺序；计数和记录查询在单次事务中执行。数据未变化时可完整翻页；翻页期间新增或更新会移动页码位置，需要从第一页刷新。

后端编译成功；完整后端测试 35/35 通过，其中新增 16 项覆盖旧上限外查询、总数、稳定排序、空页、非法参数、认证与角色/归属隔离。测试使用临时数据库和虚构记录，没有修改个人演示库。

后续补齐：PR #18 已合入主分支。本轮改用 node --import tsx 执行种子，消除了此前 tsx CLI 管道权限阻塞，真实 HTTP 重启及备份恢复验收已通过。最新完成项和前端交接见 C_DEMO_ACCEPTANCE.md，测试数量以该文件为准。

前端现有适配器继续显示默认第一页；本轮未给页面增加“加载更多”，也未修改共享类型或 Mock 服务。下一步应与 B/A 协调分页契约，在适配器保留 meta、前端加分页入口，并补 Mock/API 一致性及页面验证。

## 每次提交前检查

在 server 目录执行：

```bash
npm run db:generate
npm run build
npm test
npm run test:demo
```

最后执行 `git diff --check`，检查差异中没有环境密码及数据库。后端测试通过不等于前端交互、微信真机或公网部署通过；这些检查由联调阶段另行完成。
