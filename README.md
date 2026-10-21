# 校园家教撮合平台（创新创业项目）

本批新增：**西安 AI 需求助手 + 地图家长选点 + 附近家教推荐**，Mock/API 共用 24 份合成家教资料。输入需求 → 确认解析 → 地图选点 → 查看推荐理由 → 原流程预约。体验及边界见 [西安演示指南](docs/XIAN_AI_DEMO.md)。

已集成家长端响应式展示、价格筛选、服务端分页/状态筛选/全量统计和备份恢复；接口与启动见 [API 契约](docs/API_CONTRACT.md)、[演示后端](docs/SERVER_DEMO.md)。

D 交付：**AI 家教匹配规则演示**（无需密钥）已接入首页和原预约流程。启动、演示身份、数据重置与五分钟脚本见 [DEMO_GUIDE.md](DEMO_GUIDE.md)；部署实况与操作见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)，架构与规则见 [docs/MATCHING_DESIGN.md](docs/MATCHING_DESIGN.md)。

> **V0.4 · Mock / 开发 API 双模式** | 微信小程序 + H5 网页 | uni-app + Vue 3 + TypeScript

## 项目简介

面向**学生/家长**与**大学生家教**的供需撮合平台。针对寻找家教渠道分散、信息不透明、大学生兼职供需匹配低效等痛点，逐步建设家教展示、科目筛选、预约沟通、审核与评价体系。

默认是**本机 Mock 演示**；新增独立开发后端、SQLite 数据库、服务端角色权限及 API 模式。家教推荐默认使用公开规则；API 模式可选配置服务端模型解析自然语言需求，解析建议需用户确认，模型不决定最终排序。开发后端只使用虚构资料和本地开发账户，不含微信正式认证、真实资质核验、支付或消息通知。**请勿填写真实私人信息或用于实际交易。**

## 已实现

- 首页：关键词、科目、授课方式、价格上下限组合筛选；Mock/API 过滤后分页，桌面卡片网格和手机单列布局。
- 家教详情：大学/专业、科目、地区、授课方式、参考价格、介绍。
- 预约表单：价格/授课方式摘要、校验及提交防重复；Mock 存在当前设备，API 存在开发服务器数据库；家长、家教共享预约状态。
- 我的预约：按当前数据模式查看及取消允许取消的预约，查询家教接单与完成状态。
- 演示登录、身份选择、退出与本机会话恢复；家长、家教、管理员三角色。
- 首页、我的预约、我的底部导航；预约入口按演示角色引导。
- 中文家教工作台：入驻资料、草稿、审核状态、接受/拒绝/完成预约及二次确认。
- 中文管理员工作台：审核及拒绝原因、举报处理、注明数据范围的概览。
- 可解释规则推荐：复用公开家教数据，展示筛选和评分理由，进入已有详情与预约流程。

## 技术栈

- uni-app / Vue 3 / TypeScript / Vite
- H5 + 微信小程序共用业务代码
- 默认 Mock + uni 本地存储；可选 Fastify 5 + Prisma 6 + SQLite 开发 API

## 启动

本轮在 Node.js 24.19.0、npm 11.9.0 验证；CI 使用 Node.js 20。小程序预览需要微信开发者工具和自己的测试 AppID。

```bash
npm ci
npm run typecheck
npm test
npm run test:workflows
npm run typecheck:workflows
npm run dev:h5
# 另开终端或停止 H5 服务后运行：
npm run dev:mp-weixin
```

构建：`npm run build:h5`、`npm run build:mp-weixin`。H5 开发服务默认在 `http://localhost:5173/`；微信小程序构建产物在 `dist/build/mp-weixin`。

微信开发者工具导入 `dist/dev/mp-weixin`（开发）或 `dist/build/mp-weixin`（构建），使用自己的测试 AppID；正式发布前修改 `src/manifest.json` 中的 `mp-weixin.appid`。

V0.3 已验证 Mock 模式 H5 浏览器三角色核心流程；V0.4 已验证类型检查、自动化测试、双端构建与实际 HTTP 冒烟流程。API 模式 H5 浏览器已验证家长预约、家教接单及管理员入口；微信开发者工具/真机交互**未验证**。

演示流程：家长进入老师详情 → 登录并填写**虚构**预约 → 家教登录，在“我的”进入工作台并接受/拒绝预约 → 家长查看新状态。家教也可保存入驻草稿并提交模拟审核；管理员从登录页选择演示身份，在“我的”审核台查看并处理申请。家长可举报虚构资料，管理员可标记处理。示例“小林老师”（`t001`）的预约关联演示家教账号；其他示例老师尚无可登录的家教账号。

模拟会话重启后从本机存储恢复；退出仅清除会话，不清除本机预约、申请和举报。旧版预约可读取并在首次新操作时写入新存储键，原键仍保留。所有状态只在当前设备同步，不会通知任何真实用户，也不代表真实审核或订单。

Mock 首次使用保留虚构家教样例；演示家教开始提交/修改入驻资料后，仅在审核通过时公开其资料。退回草稿、待审或驳回时，首页、详情和推荐均撤下该家教；已有预约记录继续保留。

## V0.4 开发 API 模式（已验证本机命令）

默认不配置环境变量时仍为 Mock 模式。API 模式需要两个终端：

```bash
# 终端 1：后端（Node.js >=20）
cd server
npm ci --no-audit --no-fund
cp .env.example .env
# 编辑 .env：给 SEED_PARENT_PASSWORD、SEED_TUTOR_PASSWORD、SEED_ADMIN_PASSWORD
# 各设置不同且长度至少 12 位的本地密码；不要提交 .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
# GET http://127.0.0.1:3001/health

# 终端 2：前端（在仓库根目录）
npm ci --no-audit --no-fund
cp .env.example .env
# 修改 VITE_DATA_MODE=api，H5 的 VITE_API_BASE_URL 可使用示例本机地址
npm run dev:h5
```

登录账户 ID：`demo.parent`、`demo.tutor`、`demo.admin`；密码使用本地 `.env` 中各自的值。初始化会生成一份虚构的已审核家教资料，便于家长直接预约。家教修改资料会下架并进入草稿，再提交后由管理员审核。切回 `VITE_DATA_MODE=mock` 可离线演示；两种模式的数据互不迁移。

后端检查：`cd server && npm run build && npm test`。测试脚本创建临时 SQLite 数据库，实际执行迁移后运行 API 集成测试；迁移测试另用旧版数据库验证科目索引回填。已有本地数据库升级时运行 `npm run db:migrate`，无需清除原有家教资料。数据库重置命令 `npm run db:reset` **会清空当前 DATABASE_URL 对应的本地数据库**，仅在确认路径后使用。迁移文件及接口、安全边界见 [后端联调文档](docs/BACKEND_INTEGRATION.md)。

API 模式的 H5 使用本机地址；微信小程序须部署到可访问的 HTTPS 地址并配置微信合法请求域名、测试 AppID。微信开发者工具及真机 API 交互未验证。SQLite 当前适用于单实例本地开发，不适合作为正式生产数据库。前后端构建通过不代表真实资质核验或微信授权已实现。

可选模型解析：在 `server/.env` 配置 `MATCH_MODEL_BASE_URL`、`MATCH_MODEL_NAME` 和服务端 `MATCH_MODEL_API_KEY`；本机兼容接口可不设密钥。使用支持 Chat Completions 的模型地址，前端仍设置 `VITE_DATA_MODE=api`。未配置时规则推荐照常运行。接口、安全边界及实际验证情况见 [模型接入说明](docs/MODEL_INTEGRATION.md)。

## 目录

```text
src/
  components/       通用老师卡片
  mocks/            虚构老师数据
  pages/index/      搜索首页
  pages/tutors/     家教详情
  pages/orders/     预约表单和列表
  pages/profile/    个人中心
  pages/auth/       演示登录和身份选择
  pages/tutor/      家教申请、工作台和预约详情
  pages/admin/      模拟审核台
  pages/reports/    模拟举报
  services/         认证与业务服务契约、Mock / API 实现
  types/            数据类型
  utils/            会话和旧预约兼容入口
  App.vue main.ts pages.json manifest.json
.github/             Issue/PR 模板、构建检查
server/              Fastify 开发 API、Prisma 迁移、种子和测试
docs/                架构、路线图、分工
CONTRIBUTING.md      团队协作规范
```

## 协作

仓库地址：https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition

成员加入仓库 Collaborators 后，先创建 Issue 认领任务，从 `main` 建 `feat/*` 或 `fix/*` 分支，提交 Pull Request，由其他成员评审后合并。详细规则见 [CONTRIBUTING.md](CONTRIBUTING.md)；里程碑见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 安全边界

后续上线前必须补齐身份及家教资质审核、未成年人保护、监护人同意、隐私政策、个人信息最小化收集、投诉举报与数据删除等机制。不要提交真实学生资料、密码、AppSecret 或 API Key。

认证与角色接入约定见 [docs/AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md)；预约状态、Mock 存储和后端交接见 [docs/BUSINESS_INTEGRATION.md](docs/BUSINESS_INTEGRATION.md)。

### 西安 AI 与地图演示

已扩充 24 份合成家教，支持西安地图家长选点、线下附近筛选及需求解析确认。体验路径与真实能力边界见 [XIAN_AI_DEMO](docs/XIAN_AI_DEMO.md)。

## AI学习中心

首页和顶部导航新增“AI学习中心”：小初高主要学科22份原创入门笔记、官方资源入口、66道固定示例题，以及可配置模型的3/5/8题练习卷生成。支持自测、答案解析、有/无答案TXT导出和浏览器打印。示例题不会冒充模型生成；AI题目需核对。接入、来源与限制见 [docs/AI_LEARNING_CENTER.md](docs/AI_LEARNING_CENTER.md)。

## AI 功能检查与学习闭环

首页与导航可进入AI学习中心：原创笔记 → 主题练习 → 自测解析 → 带知识点找老师 → 返回原笔记。解析未识别字段不再沿用旧需求。功能边界、已修问题和下一批优先级见 [AI_FEATURE_AUDIT](docs/AI_FEATURE_AUDIT.md)。

## 小书灵与订单地图

右下角“小书灵”提供对话桌宠、需求整理与页面指引；顶部“订单地图”按角色查看预约，每10秒刷新API状态，点击片区查看对应订单。预约可主动选择公共片区；固定虚构示例与账户订单分开。模型未配置时明确提供有限本机演示。详情见 [AI_COMPANION_ORDER_MAP](docs/AI_COMPANION_ORDER_MAP.md)。
