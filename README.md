# 校园家教撮合平台（创新创业项目）

> **V0.2 · 前端演示开发中** | 微信小程序 + H5 网页 | uni-app + Vue 3 + TypeScript

## 项目简介

面向**学生/家长**与**大学生家教**的供需撮合平台。针对寻找家教渠道分散、信息不透明、大学生兼职供需匹配低效等痛点，逐步建设家教展示、科目筛选、预约沟通、审核与评价体系。

目前为**无后端的演示版**，所有家教信息、价格均为虚构数据；预约仅存储在当前设备，不会通知老师。登录和身份选择仅模拟本机状态，没有真实身份认证、支付、订单服务。**请勿填写真实私人信息或用于实际交易。**

## 已实现

- 首页：关键词搜索、科目筛选、演示家教列表。
- 家教详情：大学/专业、科目、地区、授课方式、参考价格、介绍。
- 预约表单：演示数据校验及本机存储。
- 我的预约：查看及取消本机演示预约。
- 演示登录、身份选择、退出与本机会话恢复；学生/家长及大学生家教角色展示。
- 首页、我的预约、我的底部导航；预约入口按演示角色引导。

## 技术栈

- uni-app / Vue 3 / TypeScript / Vite
- H5 + 微信小程序共用业务代码
- Mock 数据 + uni 本地存储；未来再确定后端 API 和数据库

## 启动

本轮在 Node.js 24.19.0、npm 11.9.0 验证；CI 使用 Node.js 20。小程序预览需要微信开发者工具和自己的测试 AppID。

```bash
npm ci
npm run dev:h5
# 另开终端或停止 H5 服务后运行：
npm run dev:mp-weixin
```

检查和构建：`npm run typecheck`、`npm run build:h5`、`npm run build:mp-weixin`。H5 开发服务默认在 `http://localhost:5173/`；微信小程序构建产物在 `dist/build/mp-weixin`。

微信开发者工具导入 `dist/dev/mp-weixin`（开发）或 `dist/build/mp-weixin`（构建），使用自己的测试 AppID；正式发布前修改 `src/manifest.json` 中的 `mp-weixin.appid`。

本轮已验证本机安装、类型检查、H5 开发服务和双端构建，以及 H5 浏览器中的家长登录、预约、退出流程。微信开发者工具及真机交互**未验证**。

演示流程：打开首页 → 老师详情 → 发起演示预约 → 选择“学生/家长”登录 → 填写**虚构**预约数据 → “我的预约”查看/取消 → “我的”退出。模拟会话重启后从本机存储恢复；退出仅清除会话，不清除已有本机演示预约。家教角色目前只用于身份展示和预约访问引导，其工作台由其他成员开发。

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
  services/         认证服务抽象与 Mock 实现
  types/            数据类型
  utils/            本地预约存储
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

认证与角色接入约定见 [docs/AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md)。
