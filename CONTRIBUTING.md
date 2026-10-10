# 团队协作规范（V0.1）

本仓库用于家教平台创新创业项目，代码和文档均通过 GitHub 协作。**main 是可演示主分支，不允许直接推送未评审的功能代码。**

## 一、成员入组

1. 仓库管理员在 GitHub Settings → Collaborators 邀请成员。
2. 成员 Clone 仓库，阅读 README、docs/ARCHITECTURE.md、docs/ROADMAP.md。
3. 先创建或认领 Issue，确认需求范围、负责人、完成标准。
4. 不要把任何 Token、密码、真实用户数据提交到 Git。

## 二、分支规范

| 分支 | 用途 | 示例 |
|---|---|---|
| main | 可演示的稳定版本 | main |
| feat/* | 新功能 | feat/tutor-search |
| fix/* | 修复缺陷 | fix/booking-validation |
| docs/* | 文档和竞赛材料 | docs/business-plan |
| refactor/* | 不改变功能的重构 | refactor/storage |

推荐流程：

```bash
git checkout main
git pull origin main
git checkout -b feat/tutor-search
# 开发、测试后：
git add .
git commit -m "feat: 增加家教筛选"
git push -u origin feat/tutor-search
```

然后在 GitHub 创建 PR 指向 main。

## 三、提交信息

采用 `类型: 中文描述`：

- `feat: 增加家教预约页面`
- `fix: 修复科目筛选错误`
- `docs: 更新商业模式说明`
- `refactor: 整理预约数据逻辑`
- `test: 补充表单校验测试`
- `chore: 更新构建配置`

一次提交尽量只做一件事，不提交 `node_modules`、`dist`、`.env` 或密钥。

## 四、Pull Request 规范

PR 必须说明：关联 Issue、改动摘要、测试方式和结果、截图（涉及界面时）、风险及待办。至少一位**非作者**评审后再合并；有冲突先解决冲突。禁止直接在 main 上实验性开发。

推荐检查：

- [ ] 功能满足 Issue 的验收标准
- [ ] H5 页面无明显报错
- [ ] 微信小程序页面已验证（如涉及）
- [ ] 演示数据与真实数据明确区分
- [ ] 没有敏感信息、密钥或真实学生资料
- [ ] 文档同步更新

## 五、Issue 管理

标题推荐：`[功能] 家教筛选`、`[Bug] 预约返回异常`、`[文档] 竞品分析`。正文写背景、目标、验收标准、负责人、预计完成时间。任务不要只在群聊中口头分配。

## 六、代码风格与冲突

Vue 组件使用 PascalCase，工具函数和变量使用 camelCase，路径和分支用 kebab-case。TypeScript 尽量使用明确类型。共用逻辑放 `src/utils`，共用 UI 放 `src/components`，页面放 `src/pages`。跨模块接口变更必须通知相关负责人。

## 七、协作角色（可调整）

- 项目负责人：需求拆分、版本管理、竞赛材料统筹。
- 前端负责人：uni-app 页面与双端适配。
- 后端负责人：后续用户、审核、预约 API 和数据库。
- 产品/设计：用户流程、原型、UI 与可用性测试。
- 商业/运营：用户调研、竞品、商业模式、路演材料。

## 八、发布纪律

V0.1 仅演示，不能对外宣称已完成家教认证、支付、在线沟通或真实匹配。真实试运营前须经过安全、隐私、合规和业务流程评审。
