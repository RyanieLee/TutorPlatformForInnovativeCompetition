# 后端演示初始化、持久化和部署

此方案沿用 Fastify / Prisma / SQLite，限单实例受控演示，不承载真实学生资料、真实注册或交易。保留 `NODE_ENV=production` 拒绝启动和 seed 的保护。

## 一键初始化与启动

Node.js 20+，在 server/ 运行。先安装依赖并配置本机环境：

```bash
npm ci
npm run demo:setup
# 首次生成 .env 和三个随机演示密码；已有 .env 不会覆盖
# 在本机打开 .env 查看密码，勿放进截图或提交 Git
npm run db:init
```

`db:init` 按顺序执行客户端生成 → 两项已版本化迁移 → 演示种子。它先检查演示环境、SQLite URL 和三个密码；失败时不会迁移数据库。**不会执行 reset 或删除记录**，可重复执行：保留已有家教资料 ID、申请状态、预约和举报。种子会将三个 demo 账户恢复为 active，并更新其密码哈希，适合重建演示账户，不要用于真实账户系统。

从环境配置完毕到启动，只需一个命令：

```bash
npm run demo:serve
```

该命令先 db:init、后 TypeScript build，再启动编译后的 API；Ctrl+C/SIGTERM 会传给 API 子进程，API 等待请求关闭并断开数据库连接。默认只监听 127.0.0.1；可在 .env 显式设置 HOST，PORT 要求 1–65535 的整数。已有编译和已初始化数据库的日常重启只运行 `npm start`，不需要反复 seed。

健康检查：GET `http://127.0.0.1:3001/health`，成功为 `{"data":{"status":"ok"}}`。检测会实际执行 SQLite SELECT 1。

## 真实的重启与初始化检查

```bash
npm run test:demo
```

检查脚本创建临时目录、数据库和随机密码，实际验证配置生成不覆盖已有文件、production/缺密码初始化保护、HTTP 健康、预约重试去重与接受/完成、资料撤回与驳回重提/批准、举报处理、管理员权限及全量统计。随后停止进程、重复初始化并重启，检查预约和举报记录；再对正在运行的 WAL 数据库生成一致性快照，确认重复输出不会覆盖旧备份，并将快照复制到另一临时数据库，执行 integrity_check、检查审计和预约去重，最后通过 demo:serve 启动恢复库并经 HTTP 查询状态。

检查不读取或重置个人 .env 对应数据库，不打印密码或令牌；结束后停止服务并清理临时数据。已接入现有 CI server job。本轮 Linux Node 24 环境通过，不替代 Windows、微信真机或公网验收。

## Linux 持久服务模板

已经交付可修改的 `deploy/tutor-demo.service` 和 `deploy/tutor-demo.env.example`。**没有在公网服务器上安装或启动**；本环境没有服务器/域名授权。模板路径是部署约定，须按实际机器调整，不能把文件存在当作部署成功。

管理员准备：

1. 创建非 root 服务账户 tutordemo，将仓库放入 `/srv/tutor`；确认 `/usr/bin/node` 为 Node 20+，否则修改 unit 的 ExecStart。
2. 在 `/srv/tutor/server` 安装依赖并 `npm run build`。创建仅服务账户可写的 `/var/lib/tutor-demo`；使用绝对路径 `DATABASE_URL=file:/var/lib/tutor-demo/demo.db`，数据库不放在静态网页目录。
3. 按 env.example 创建 `/etc/tutor-demo.env`，设置真实演示域名和三个独立随机演示密码；仅 root/服务账户组可读。不要将真实 env 文件加入 Git。
4. 以服务账户身份并加载上述环境，执行一次 `npm run db:init`。可通过管理员配置的 systemd oneshot/init 服务加载 EnvironmentFile，或在受控终端中设置这些变量；不要在共享日志、截图或命令参数中粘贴密码。
5. 将 unit 复制到 `/etc/systemd/system/tutor-demo.service`，执行 `systemctl daemon-reload`、`systemctl enable --now tutor-demo`，检查 status 和本机 /health。unit 的 StateDirectory 和 ReadWritePaths 仅允许持久目录写入；源代码在启动前已经编译。
6. API 默认只监听127.0.0.1，**服务器防火墙仅允许反向代理访问3001端口**；公网只开放HTTPS入口。unit 使用 development 是明确的演示模式，不是绕过保护后声称生产可用。

模板未在 systemd 主机上实测。已验证的范围是前述本机子进程启动、健康、初始化与持久化检查。

## HTTPS 与前端

使用 `deploy/Caddyfile.example`：将自己的域名指向服务器、配置证书所需端口，反向代理 `/api/*` 和 `/health` 到127.0.0.1:3001，其余路径服务H5静态产物。把模板域名和静态根目录改为实际值。

- `CORS_ORIGINS` 是精确前端 origin，例如 `https://你的演示域名`，不包含路由路径和末尾 `/`。
- 前端构建：`VITE_DATA_MODE=api VITE_API_BASE_URL=https://你的演示域名 npm run build:h5`。这是构建时配置，修改后重新构建；不得把 seed 密码或数据库秘密放入 VITE_*。
- 对外验收必须包含 HTTPS 页面、/health、登录、推荐/预约/接单/查询/审核及服务重启后的记录；本机通过不替代公网验收。
- 公开 Mock 静态版可独立部署到 Pages/Vercel；与 API 版明确分开，不自动上传 Mock 数据。

## 备份与重置

在 server/ 执行：

```bash
npm run db:backup
# 或指定一个全新的输出路径，可含空格
npm run db:backup -- --output "backups/before-demo.db"
```

命令默认写入 server/backups/ 下的时间戳文件；该目录已忽略 Git。通过 SQLite VACUUM INTO 生成独立一致性快照，可包含 WAL 中已提交的记录，不修改源数据库；输出文件已存在或指向源库时拒绝覆盖。备份含账户密码哈希、会话及业务数据，不能公开上传。Linux 创建权限为 0600；Windows 请通过目录访问权限控制保管。进程被强制中断可能留下不完整文件，该文件不能直接当作可用备份。

恢复时先停止所有使用目标库的进程。推荐将快照复制到一个全新路径，更新本机 DATABASE_URL 指向该绝对路径，再启动 demo:serve，避免旧库的 journal/WAL 文件混入恢复库；保留原库供回退。演示账户密码取自当前 .env，初始化会更新演示账户密码；备份本身不包含 .env。本轮自动验收已在临时目录按此流程恢复并通过 HTTP 检查，无需对自己的库执行破坏性恢复测试。

单纯重复 db:init 不会清空记录。确需清空自己的演示库时，先确认 DATABASE_URL、备份并停止服务，再执行 db:reset 和 db:init。不要将 reset 作为日常启动步骤。
