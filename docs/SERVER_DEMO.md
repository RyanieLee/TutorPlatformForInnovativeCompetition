# 后端演示初始化、持久化和部署

此方案沿用 Fastify / Prisma / SQLite，限单实例受控演示，不承载真实学生资料、真实注册或交易。保留 `NODE_ENV=production` 拒绝启动和 seed 的保护。

## 一键初始化与启动

Node.js 20+，在 server/ 运行。先安装依赖并配置本机环境：

```bash
npm ci
cp .env.example .env
# 编辑 .env：DATABASE_URL=file:./dev.db，三个 SEED_*_PASSWORD 各至少12位
npm run db:init
```

`db:init` 按顺序执行客户端生成 → 两项已版本化迁移 → 演示种子。它先检查演示环境、SQLite URL 和三个密码；失败时不会迁移数据库。**不会执行 reset 或删除记录**，可重复执行：保留已有家教资料 ID、申请状态、预约和举报。种子会将三个 demo 账户恢复为 active，并更新其密码哈希，适合重建演示账户，不要用于真实账户系统。

从环境配置完毕到启动，只需一个命令：

```bash
npm run demo:serve
```

该命令先 db:init、后 TypeScript build，再启动编译后的 API；Ctrl+C/SIGTERM 会传给 API 子进程。已有编译和已初始化数据库的日常重启只运行 `npm start`，不需要反复 seed。

健康检查：GET `http://127.0.0.1:3001/health`，成功为 `{"data":{"status":"ok"}}`。检测会实际执行 SQLite SELECT 1。

## 真实的重启与初始化检查

```bash
npm run test:demo
```

检查脚本创建临时数据库和随机测试密码，验证：production/缺密码在创建数据库前被拒绝 → 初始化 → 启动实际 HTTP API → 家长预约 → 家教接受并完成 → 停止进程 → 重复初始化同一数据库 → 启动新进程 → 按同一预约 ID 查询仍为 completed，家教 ID 不变。完成后停止子进程并清理临时数据。它不读取或重置个人 .env 对应数据库，密码和 token 不输出；CI server job 也执行该检查。

## Linux 持久服务模板

已经交付可修改的 `deploy/tutor-demo.service` 和 `deploy/tutor-demo.env.example`。**没有在公网服务器上安装或启动**；本环境没有服务器/域名授权。模板路径是部署约定，须按实际机器调整，不能把文件存在当作部署成功。

管理员准备：

1. 创建非 root 服务账户 tutordemo，将仓库放入 `/srv/tutor`；确认 `/usr/bin/node` 为 Node 20+，否则修改 unit 的 ExecStart。
2. 在 `/srv/tutor/server` 安装依赖并 `npm run build`。创建仅服务账户可写的 `/var/lib/tutor-demo`；使用绝对路径 `DATABASE_URL=file:/var/lib/tutor-demo/demo.db`，数据库不放在静态网页目录。
3. 按 env.example 创建 `/etc/tutor-demo.env`，设置真实演示域名和三个独立随机演示密码；仅 root/服务账户组可读。不要将真实 env 文件加入 Git。
4. 以服务账户身份并加载上述环境，执行一次 `npm run db:init`。可通过管理员配置的 systemd oneshot/init 服务加载 EnvironmentFile，或在受控终端中设置这些变量；不要在共享日志、截图或命令参数中粘贴密码。
5. 将 unit 复制到 `/etc/systemd/system/tutor-demo.service`，执行 `systemctl daemon-reload`、`systemctl enable --now tutor-demo`，检查 status 和本机 /health。unit 的 StateDirectory 和 ReadWritePaths 仅允许持久目录写入；源代码在启动前已经编译。
6. API 本身监听0.0.0.0，**服务器防火墙仅允许反向代理访问3001端口**；公网只开放HTTPS入口。unit 使用 development 是明确的演示模式，不是绕过保护后声称生产可用。

模板未在 systemd 主机上实测。已验证的范围是前述本机子进程启动、健康、初始化与持久化检查。

## HTTPS 与前端

使用 `deploy/Caddyfile.example`：将自己的域名指向服务器、配置证书所需端口，反向代理 `/api/*` 和 `/health` 到127.0.0.1:3001，其余路径服务H5静态产物。把模板域名和静态根目录改为实际值。

- `CORS_ORIGINS` 是精确前端 origin，例如 `https://你的演示域名`，不包含路由路径和末尾 `/`。
- 前端构建：`VITE_DATA_MODE=api VITE_API_BASE_URL=https://你的演示域名 npm run build:h5`。这是构建时配置，修改后重新构建；不得把 seed 密码或数据库秘密放入 VITE_*。
- 对外验收必须包含 HTTPS 页面、/health、登录、推荐/预约/接单/查询/审核及服务重启后的记录；本机通过不替代公网验收。
- 公开 Mock 静态版可独立部署到 Pages/Vercel；与 API 版明确分开，不自动上传 Mock 数据。

## 备份与重置

停止演示 API 后，备份 SQLite 数据库及其同目录 journal/WAL 相关文件，或使用 SQLite 的正式备份能力。单纯重复 db:init 不会清空记录。

需要清空**自己的演示库**时，先确认 DATABASE_URL 指向正确位置、备份并停止服务，再执行 `npm run db:reset`，随后 `npm run db:init`；reset 会删除该库数据，不能作为每次启动步骤。环境/密码文件独立保管，不放入静态产物、Git 或公开截图。
