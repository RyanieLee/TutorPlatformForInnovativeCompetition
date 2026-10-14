# 校园家教撮合平台（创新创业项目）

> **V0.3 · 三角色本机演示开发中** | 微信小程序 + H5 网页 | uni-app + Vue 3 + TypeScript

## 项目简介

面向**学生/家长**与**大学生家教**的供需撮合平台。针对寻找家教渠道分散、信息不透明、大学生兼职供需匹配低效等痛点，逐步建设家教展示、科目筛选、预约沟通、审核与评价体系。

目前为**无后端的演示版**，所有家教信息、价格均为虚构数据；预约仅存储在当前设备，不会通知老师。登录和身份选择仅模拟本机状态，没有真实身份认证、支付、订单服务。**请勿填写真实私人信息或用于实际交易。**

## 已实现

- 首页：关键词搜索、科目筛选、演示家教列表。
- 家教详情：大学/专业、科目、地区、授课方式、参考价格、介绍。
- 预约表单：演示数据校验及本机存储；家长、家教共享预约状态。
- 我的预约：查看及取消允许取消的本机演示预约。
- 演示登录、身份选择、退出与本机会话恢复；家长、家教、管理员三角色。
- 首页、我的预约、我的底部导航；预约入口按演示角色引导。
- 家教入驻资料、草稿、模拟审核状态、工作台和接单操作。
- 管理员模拟审核、拒绝原因；家长模拟举报与管理员标记处理。

## 技术栈

- uni-app / Vue 3 / TypeScript / Vite
- H5 + 微信小程序共用业务代码
- Mock 数据 + uni 本地存储；未来再确定后端 API 和数据库

## 启动

本轮在 Node.js 24.19.0、npm 11.9.0 验证；CI 使用 Node.js 20。小程序预览需要微信开发者工具和自己的测试 AppID。

```bash
npm ci
npm run typecheck
npm test
npm run dev:h5
# 另开终端或停止 H5 服务后运行：
npm run dev:mp-weixin
```

构建：`npm run build:h5`、`npm run build:mp-weixin`。H5 开发服务默认在 `http://localhost:5173/`；微信小程序构建产物在 `dist/build/mp-weixin`。

微信开发者工具导入 `dist/dev/mp-weixin`（开发）或 `dist/build/mp-weixin`（构建），使用自己的测试 AppID；正式发布前修改 `src/manifest.json` 中的 `mp-weixin.appid`。

本轮已验证本机安装、类型检查、自动化测试、H5 开发服务和双端构建，以及 H5 浏览器中的三角色核心模拟流程。微信开发者工具及真机交互**未验证**。

演示流程：家长进入老师详情 → 登录并填写**虚构**预约 → 家教登录，在“我的”进入工作台并接受/拒绝预约 → 家长查看新状态。家教也可保存入驻草稿并提交模拟审核；管理员从登录页选择演示身份，在“我的”审核台查看并处理申请。家长可举报虚构资料，管理员可标记处理。示例“小林老师”（`t001`）的预约关联演示家教账号；其他示例老师尚无可登录的家教账号。

模拟会话重启后从本机存储恢复；退出仅清除会话，不清除本机预约、申请和举报。旧版预约可读取并在首次新操作时写入新存储键，原键仍保留。所有状态只在当前设备同步，不会通知任何真实用户，也不代表真实审核或订单。

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
  services/         认证与业务服务契约、Mock 实现
  types/            数据类型
  utils/            会话和旧预约兼容入口
  App.vue main.ts pages.json manifest.json
.github/             Issue/PR 模板、构建检查
docs/                架构、路线图、分工
CONTRIBUTING.md      团队协作规范
```

## 协作

仓库地址：https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition

成员加入仓库 Collaborators 后，先创建 Issue 认领任务，从 `main` 建 `feat/*` 或 `fix/*` 分支，提交 Pull Request，由其他成员评审后合并。详细规则见 [CONTRIBUTING.md](CONTRIBUTING.md)；里程碑见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 安全边界

后续上线前必须补齐身份及家教资质审核、未成年人保护、监护人同意、隐私政策、个人信息最小化收集、投诉举报与数据删除等机制。不要提交真实学生资料、密码、AppSecret 或 API Key。

认证与角色接入约定见 [docs/AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md)；预约状态、Mock 存储和后端交接见 [docs/BUSINESS_INTEGRATION.md](docs/BUSINESS_INTEGRATION.md)。
