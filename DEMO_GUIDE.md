# D 演示指南

当前版本：AI 家教匹配**规则演示**，无大模型调用。所有数据仅用于演示；推荐辅助选择，不保证教学效果。集成 PR #10 及依赖已按用户免评审指令合入 main，任务：#9；后续 B 工作台与首页方式筛选集成见后续兼容集成 PR。部署实际状态见 [DEPLOYMENT](docs/DEPLOYMENT.md)。

## 快速启动：Mock 离线备份

Node.js 20+（CI 使用 20），npm。首次安装需要网络，装好后演示不依赖 API 或模型密钥。

```bash
npm ci
npm run dev:h5 -- --host 127.0.0.1
```

打开启动日志中的本机 URL（默认 `http://127.0.0.1:5173`）。首页 → AI 家教匹配，选择 数学 / 初中（演示）/ 100 元 / 均可 / 偏好“耐心 讲解”。第一名为小林老师，规则 84 分：50 + 20 + 4 + 10；查看详情进入已有预约。

演示账户：登录页面选择“学生/家长”“大学生家教”“管理员演示”，无密码，均为本机模拟身份。预约只在同一浏览器里共享。填写“虚构同学”和演示数字 `13800000000`，不要填写真实资料。只有 `t001`（小林）关联演示家教工作台。

重置 Mock：开发者工具 Console 执行下列代码，再刷新；仅移除本项目演示键，保留其他网站存储：

```js
for (const key of Object.keys(localStorage)) {
  if (key.startsWith('tutor-platform:')) localStorage.removeItem(key)
}
location.reload()
```

## 开发 API 模式

```bash
cd server
npm ci
cp .env.example .env
# 编辑 .env，设置三个独立的 SEED_*_PASSWORD，至少 12 位；不提交 .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

另开终端在仓库根目录执行：

```bash
VITE_DATA_MODE=api VITE_API_BASE_URL=http://127.0.0.1:3001 npm run dev:h5 -- --host 127.0.0.1
```

账户为 `demo.parent`、`demo.tutor`、`demo.admin`，密码分别使用本地 `.env` 配置的值。默认初始化一个公开审核通过的小林家教（80 元、线上、数学/物理），API 推荐不混用六位 Mock 老师。先检查 `http://127.0.0.1:3001/health`，再使用 **线上或均可**、数学、预算 100 生成推荐。

API 重置：先停止服务，在 `server/` 执行 `npm run db:reset`（会清空当前 DATABASE_URL 对应的**演示数据库**）再 `npm run db:seed`。仅针对自己的本地演示库。只重复 seed 不会清空预约或恢复已修改的申请。旧 Mock 预约不会上传到 API。

## 自动验收

```bash
npm run typecheck
npm test
npm run test:workflows
npm run typecheck:workflows
npm run build:h5
npm run build:mp-weixin
cd server
npm run db:generate
npm run build
npm test
cd ..
npx playwright install --with-deps chromium
npm run test:e2e
```

E2E 自动启动 5173（Mock）、5174（桌面 API 前端）、5175（手机 API 前端）和 3001/3002（两套独立 API）；这些端口必须空闲。各 API 实例使用独立临时 SQLite 数据库及独立限流状态，测试不会通过放宽登录限流来绕过反复切换角色的限制。测试使用随机密码，结束后删除临时库，不修改个人 .env 或正式演示数据库。

四个项目：Mock/API × 桌面 Chrome/Pixel 7 手机视口。覆盖组合筛选、空输入、无匹配、推荐理由、详情预约、家教接受和完成、家长查询与刷新恢复、家教申请与审核；进一步验证资料退回草稿后从列表及推荐撤下、重新审核后恢复，已有预约仍可查。API 另含断网错误与重试。HTML 报告 `playwright-report/index.html`；失败 trace 在 `test-results/`，CI 保存 artifact。截图位于 `docs/screenshots/d-*.png`。

这验证 Chromium 浏览器与手机视口，不代表微信开发者工具、iOS Safari 或真机验证。

## 五分钟评委演示脚本

| 时间 | 操作 | 说明 |
| --- | --- | --- |
| 0:00–0:40 | 首页搜索数学，进入 AI 家教匹配 | 面向家长与大学生家教的需求撮合；当前为规则演示 |
| 0:40–1:40 | 数学、初中演示、100 元、均可、耐心 讲解，生成推荐 | 展示硬过滤与逐项分数；年级不参与能力判断；试预算 1 元展示无匹配，再改回 100 |
| 1:40–2:40 | 第一位小林→详情→预约→家长登录→提交虚构预约 | 推荐连入原有业务流程，没有孤立页面 |
| 2:40–3:30 | 我的→退出→家教登录→工作台→接受并确认；切回家长查预约 | 同一浏览器 Mock 可演示；API 模式由服务端校验归属与角色 |
| 3:30–4:30 | 家教填写/修改资料→提交；管理员登录审核通过 | 新版工作台支持“修改并重新送审”，会确认后撤回公开再送审；同一浏览器不要另开无痕窗口 |
| 4:30–5:00 | 介绍架构与边界 | 同一服务源、可解释规则、无密钥备份；尚无真实身份核验、通知、支付和效果验证 |

## 失败备选

- 公网不可达：使用提前安装并启动的本机 Mock 版本。静态产物本地通过 HTTP 服务打开，不能直接 file:// 打开。
- API 不可达：确认服务、健康检查、构建时 API 地址、CORS、HTTPS。切换到单独准备的 Mock 构建，明确告知评委数据模式，不自动伪装 API 成功。
- 无匹配：检查科目、价格与方式；API 初始家教仅支持线上。调整输入后重新生成。
- 数据已被上场演示修改：按上述步骤重置演示数据；重置后再跑一遍五分钟脚本。
- 当前未实现大模型；“无密钥降级”即完整规则模式，不演示虚构模型调用。

架构和创新说明：[MATCHING_DESIGN](docs/MATCHING_DESIGN.md)。批次和合并清单：[D_INTEGRATION_PLAN](docs/D_INTEGRATION_PLAN.md)。实际测试结果：[D_ACCEPTANCE](docs/D_ACCEPTANCE.md)。
