# D 验收记录（2026-10-20）

## 当前交付

分支 `feat/ai-demo-deployment`，叠加于 #6 head `2622d584`；PR #10。D01 计划提交 `2e9f7f3`，D02 匹配提交 `6b4f737`；D03 为本报告所在提交。未自行合并 A/B/C 的 PR。

已实现：独立可解释规则推荐；首页入口；需求校验、无匹配、预算和方式硬过滤、偏好及分数解释；结果进入原详情与预约；Mock/API 复用同一服务契约；开发 API 错误不自动伪装为 Mock 成功；五分钟演示、重置、离线备份、架构创新说明和部署配置。

## 实测命令与结果

| 检查 | 结果 |
| --- | --- |
| 根目录及 server `npm ci --no-audit --no-fund` | 成功 |
| `npm run typecheck` | 通过 |
| `npm test` | 34/34，通过；18 个新增匹配与分页边界测试 |
| Mock `npm run build:h5` / `npm run build:mp-weixin` | 均通过 |
| API 环境变量下 H5 / mp-weixin 构建 | 均通过 |
| GitHub Pages 子路径 `VITE_BASE_PATH=/TutorPlatformForInnovativeCompetition/` H5 构建 | 通过，HTML 资源前缀正确 |
| server `npm run db:generate` / `npm run build` / `npm test` | 均通过；17/17 测试，包括迁移与并发 |
| `npm run test:e2e` | 6 项通过；2 项 API 网络故障用例在 Mock 项目中跳过（不适用） |
| #2/#4/#6 远程 CI | 检查时均绿色，但无非作者评审结论 |
| #10 D02 远程 CI | build/server 均通过；D03 最终 CI 另见 PR 最新检查 |

E2E 四个项目：mock-desktop、mock-mobile、api-desktop、api-mobile，桌面 Chromium 1280×720 与 Pixel 7 模拟视口。每个项目执行搜索→空输入→预算 1 元无匹配→100 元推荐与理由→实际结果详情→家长登录预约→家教登录接受→家长查询和刷新恢复→家教资料提交→管理员审核。使用隔离临时 SQLite 和随机密码；无页面脚本错误。API 两个项目另外执行拦截请求断网→错误提示且没有候选→取消拦截后重试成功。

测试开发中修正了脚本对 uni-app 包装输入框、页面就绪与导航文本的定位，未以失败运行计作通过。最终完整运行 26.6 秒，所有适用用例通过。

## 截图证据

| 模式 | 推荐 | 家长查询 | 审核 |
| --- | --- | --- | --- |
| Mock 桌面 | [推荐](screenshots/d-mock-desktop-match.png) | [预约](screenshots/d-mock-desktop-orders.png) | [审核](screenshots/d-mock-desktop-review.png) |
| Mock 手机 | [推荐](screenshots/d-mock-mobile-match.png) | [预约](screenshots/d-mock-mobile-orders.png) | [审核](screenshots/d-mock-mobile-review.png) |
| API 桌面 | [推荐](screenshots/d-api-desktop-match.png) | [预约](screenshots/d-api-desktop-orders.png) | [审核](screenshots/d-api-desktop-review.png) |
| API 手机 | [推荐](screenshots/d-api-mobile-match.png) | [预约](screenshots/d-api-mobile-orders.png) | [审核](screenshots/d-api-mobile-review.png) |

## 未完成与风险

- **公开 HTTPS URL：未完成。** GitHub Pages 未启用；当前集成创建 Pages 返回 403 `Resource not accessible by integration`。已提供 workflow 和精确启用步骤，不能将预测 URL 写为部署成功。Sites 发布助手在当前环境不可用，未发布站点。
- **公网 API：未完成。** 没有演示服务器/域名配置。C 的服务是 SQLite 开发演示，保留 production 拒绝启动保护；未声称可承载生产交易。
- **合并：未完成。** #2→#4→#6→#10 均需非作者评审后依序合并，公共文件和冲突处理清单见 D_INTEGRATION_PLAN。没有以 CI 绿色替代人工评审。
- **微信开发者工具及真机：未验证。** 编译成功只代表生成产物；缺少 AppID 和真机/合法域名配置。
- **大模型：未接入。** UI 明示规则演示；未伪造模型调用。年级仅摘要，资料不含适教年级，故不以它计分。
- Mock 只在同一浏览器共享；仅 t001 关联演示家教。API 种子仅一个公开家教，不会混入 Mock 六条数据。

未完成项不影响本机可复现的规则推荐和三角色演示，但完整“公网部署、四 PR 合并和真机验收”尚未完成，不能宣称全部交付。
