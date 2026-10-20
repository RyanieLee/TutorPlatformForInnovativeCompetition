# D 演示部署

## 实际状态（2026-10-20）

当前没有可交付的公开 HTTPS 地址。`gh api .../pages` 返回 404；尝试启用 Pages 返回 **403 Resource not accessible by integration**。这是当前 GitHub 集成权限边界，不是网站构建失败。Sites 技能所需 `site-workflow.mjs` 在当前执行环境中不可用，技能资源读取也失败，因此没有创建空站点或声称发布成功。

## 已补充的 Vercel 静态部署配置

根目录 `vercel.json` 已设置 uni-app 构建与 `dist/build/h5` 产物，并明确构建 Mock 模式与根路径。安装并连接 Vercel 后，可直接导入本仓库的 main 分支发布，无需前端密钥。不要配置旧的 VITE_API_BASE_URL；这个托管版本仅为本机 Mock 演示。当前 Vercel 尚未确认连接，不宣称已发布。

当前 GitHub Actions 还会上传 `mock-h5-dist` artifact，便于下载静态产物部署；artifact 下载地址不是公开网站 URL。

## 方案一：独立 Mock 静态演示（无需 API 密钥）

仓库管理员在 [Settings → Pages](https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/settings/pages) 将 **Source 设置为 GitHub Actions** 启用 Pages（现有 API 凭据不能代为启用）。随后在 Actions 选择 **Deploy Mock H5 demo → Run workflow**，branch 选择 `main`（D 及依赖已合并）。工作流会类型检查、测试、以仓库子路径构建 Mock H5 并部署。首次部署也可能需要管理员在 Environment 中允许该分支。

只有 workflow 的 deployment 返回的 `page_url` 且页面验收通过后，才将 URL 记录为公开演示地址。不要把按用户名拼接的预测 URL 当作已上线地址。

本地复现其产物：

```bash
npm ci
VITE_DATA_MODE=mock VITE_BASE_PATH=/TutorPlatformForInnovativeCompetition/ npm run build:h5
```

根域名静态托管则省略 VITE_BASE_PATH（默认 `/`），上传 `dist/build/h5`。使用 hash 路由，所有页面 URL 含 `#/pages/...`，无需服务端 history 回退。Mock 预约保存在每台设备自己的浏览器中，不跨设备共享。

## 方案二：开发 API + HTTPS 反向代理

C 的 SQLite 服务仅用于受控开发演示，保持 `NODE_ENV=development`，**不移除 production 启动保护**。公开长期运营前另行完成生产架构与身份等建设。部署演示 API 需管理员提供演示服务器、域名、持久磁盘和访问限制，当前没有这些资源。

1. 按根目录 DEMO_GUIDE.md 初始化后端。进程在 localhost/受控网络运行 3001 端口；不要把开发数据库或 .env 放入静态站目录。
2. DNS 指向演示服务器，配置 Caddy（模板 `deploy/Caddyfile.example`），使用自己的域名，开放 HTTPS 所需端口并将静态产物目录改为实际路径。
3. `CORS_ORIGINS` 设置为精确的前端 HTTPS origin（无路径、无末尾 `/`）；前端设置 `VITE_DATA_MODE=api VITE_API_BASE_URL=https://你的演示域名` 构建。环境变量是**构建时**读取，改值后重建。
4. 通过 `https://域名/health` 验证数据库健康，再验证登录、公开列表、推荐和预约闭环。API 不通时前端显示错误，不静默切换 Mock；演示前手动选择单独构建的 Mock 备份。
5. HTTPS 前端不可请求 HTTP API（混合内容）；跨域部署须同时配置 CORS 与 TLS。小程序还需合法请求域名和 AppID，不能用本机浏览器通过代替真机验证。

不要在前端 VITE_* 中放数据库密码、种子密码或大模型密钥。没有配置大模型，本实现不产生模型 API 请求。
