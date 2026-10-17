# 技术架构与业务流程

## 1. 目标

使用 uni-app（Vue 3 + TypeScript）复用业务代码，同时支持微信小程序和 H5。默认采用 Mock 数据完成离线演示；V0.4 新增可选开发 API，详见 `docs/BACKEND_INTEGRATION.md`。

## 2. 角色

- 需求方：学生/家长，浏览、筛选、预约、查看预约状态。
- 供给方：大学生家教，填写虚构入驻资料、查看模拟审核、管理本机预约。
- 管理员：模拟审核家教申请、标记模拟举报处理；真实后台待开发。

## 3. 当前演示流程

```text
家长：搜索 → 详情 → 模拟预约 → 我的预约（可取消）
家教：入驻草稿 → 提交 → 查看审核状态；工作台 → 接受/拒绝/完成预约
管理员：审核申请（通过/拒绝） → 家教查看结果；查看/处理模拟举报
```

**注意：** 本地存储不是订单服务；不跨设备同步，也没有老师通知。

## 4. 模块边界

- `src/mocks/tutors.ts`：虚构老师数据与查询函数。
- `src/types/tutor.ts`：家教、预约类型定义。
- `src/utils/bookings.ts`：本地演示预约持久化。
- `src/types/auth.ts`、`src/services/auth.ts`、`src/utils/session.ts`：角色/会话契约、认证适配、页面共用状态。已支持 Mock / 开发 API 双模式；接入见 `docs/BACKEND_INTEGRATION.md`。
- `src/components/TutorCard.vue`：列表通用卡片。
- `src/services/contracts.ts`、`src/services/mock/`：统一异步业务接口、Mock 存储与状态规则；`src/services/business.ts` 是页面唯一业务服务入口。
- `src/pages`：业务页面通过共享会话状态控制演示入口；服务端仍须独立校验权限。

`src/pages.json` 的登录、身份选择路由与首页/我的预约/我的 tabBar 延续 V0.2 导航。演示家长使用一个固定本机身份；旧预约格式保留在原存储键，退出后记录仍留在设备上。

V0.3 增加家教、管理员与举报路由，保留原 tabBar。预约类型新增英文状态与 `parentId`；旧存储格式仍由兼容层读取。完整迁移和权限约定见 `docs/BUSINESS_INTEGRATION.md`。

## 5. 历史 API 草案（V0.3，实际路径见后端联调文档）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /api/tutors | 列表、关键词、科目筛选 |
| GET | /api/tutors/:id | 家教详情 |
| POST | /api/bookings | 创建预约（鉴权） |
| GET | /api/bookings/mine | 查询本人预约 |
| PATCH | /api/bookings/:id/cancel | 取消预约 |
| POST | /api/tutors/applications | 家教资质申请 |
| GET | /api/bookings/tutor | 家教查看收到的预约 |
| PATCH | /api/bookings/:id | 服务端校验并执行接单状态转换 |
| PATCH | /api/tutors/applications/:id/review | 管理员审核 |
| POST | /api/reports | 提交举报 |
| PATCH | /api/reports/:id/resolve | 管理员处理举报 |

V0.4 已提供 Fastify + SQLite 开发实现，路径与部分动词和上表不同；以上草案不代表已上线接口。真实部署方案仍需团队评审。

## 6. 安全设计待办

鉴权和角色权限、家教身份/资质人工审核、数据最小化、手机号脱敏、加密传输、服务端校验、预约状态机、监护人同意、举报与数据删除机制。真实上线前不得收集未成年人敏感信息。
