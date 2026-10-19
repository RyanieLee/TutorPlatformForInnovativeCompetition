# B 中文演示与交接

## 启动

在本分支仓库根目录执行 npm ci，然后 npm run dev:h5 -- --host 127.0.0.1。默认 Mock 模式，网页登录页可选择“学生/家长”“大学生家教”“管理员演示”；不需要真实注册信息。

API 联调按仓库 docs/BACKEND_INTEGRATION.md 初始化 server/ 的依赖、Prisma 客户端、迁移和虚构种子账户。三个 SEED_PARENT_PASSWORD、SEED_TUTOR_PASSWORD、SEED_ADMIN_PASSWORD 由运行者在本地环境设置，不能提交。示例账户 ID 为 demo.parent、demo.tutor、demo.admin。

API 前端设置 VITE_DATA_MODE=api、VITE_API_BASE_URL 为自己的开发 API 地址，再启动 H5。端口须在后端 CORS_ORIGINS 中允许。此次本机验证使用 H5 5173（Mock）、5174（API），独立 API 3107，避免占用其他人的服务。

## 五分钟演示路径

1. 家教账户登录，进入“我的工作台”，查看资料审核状态和收到的预约。
2. 进入“查看 / 编辑资料”，保存虚构草稿，填写后提交；待审显示本次资料只读摘要。
3. 切换管理员，在工作台查看待审核申请；先演示拒绝时必须填写原因，再拒绝。
4. 家教刷新状态，查看原因并重提；管理员批准；资料按 API 规则公开展示。
5. 家长从现有详情页面创建预约；切换家教接受，再由家长刷新查看状态；家教标记完成。
6. 管理员查看并标记演示举报已处理。概览明确只统计本次加载记录。

所有界面标题、导航、按钮、状态和提示均为中文。现有蓝白风格为功能演示基线，后续美化修改 src/pages/tutor/shared/workflow.css 与局部组件样式即可，无需改动服务契约。

## 本轮页面与复用位置

- 家教：/pages/tutor/workbench、application、booking-detail?id=...。
- 管理员：/pages/admin/index、application-detail?id=...。
- B 局部运行时：src/pages/tutor/shared/。同时被管理端引用，仍属于 B 授权目录。
- 页面 URL 与公共 pages.json 不变。

## 检查命令

在根目录执行：

```text
npm run typecheck
npm test
npx vue-tsc --noEmit -p workspaces/chunxiaruo-commits/tsconfig.json
npx vitest run --config workspaces/chunxiaruo-commits/vitest.config.ts
npm run build:h5
npm run build:mp-weixin
```

Mock / API 分别显式设置 VITE_DATA_MODE 后构建。小程序真机需要团队提供 AppID、HTTPS 和合法域名。

浏览器验收脚本使用 Playwright 库，不引入新的项目依赖。运行者在测试工具环境提供 playwright，或设置 PLAYWRIGHT_MODULE 指向已有模块；可选 BROWSER_EXECUTABLE 指向临时测试浏览器，B_H5_URL 指定对应模式网页地址。API 脚本还使用 B_API_URL 和三个本地 SEED_*_PASSWORD 环境变量；仅对虚构演示数据库运行，会创建测试预约/举报并修改演示申请状态。

```text
node workspaces/chunxiaruo-commits/tests/browser-mock.cjs
node workspaces/chunxiaruo-commits/tests/browser-api.cjs
```

脚本截图在 docs/screenshots/，不打印密码和令牌。API 故障测试结束后申请为已保存草稿，可手动重新提交审核。

## 给协调人的接入事项

- 按 #2 → #4 → #6 的上游依赖评审合并，本分支 PR 初始目标为 feat/real-backend-integration；不要把叠加差异直接当作 main 的独立改动。
- 若公共 CI 要覆盖 B 的个人目录测试，请加入上述两条 B 独立类型检查/单测命令；B 没有改工作流。
- 原先 main 的个人 AGENTS.md 只允许个人目录，当前本分支文档记录用户已扩展授权至两个 B 页面目录；合并时由本目录负责人保留扩展范围。
- 概览接口返回数量有上限，不是全站统计。新统计、分页、角色规则等契约由 C 提供后再接入。
- UI 后续可以美化，但不能因此改 A 的页面、公共样式或共享路由；需要跨目录时先取得用户授权。

## 截图

[API 管理员桌面](screenshots/api-admin-desktop.png) · [API 家教手机](screenshots/api-tutor-mobile.png) · [API 管理员窄屏](screenshots/api-admin-320.png)
