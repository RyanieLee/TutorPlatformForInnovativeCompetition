# 技术架构与业务流程

## 1. 目标

使用 uni-app（Vue 3 + TypeScript）复用业务代码，同时支持微信小程序和 H5。当前采用 Mock 数据完成交互演示，未来再接后端。

## 2. 角色

- 需求方：学生/家长，浏览、筛选、预约、查看预约状态。
- 供给方：大学生家教，后续注册、提交资质、管理接单意向。
- 管理员：后续审核家教、处理举报、管理订单与数据。

## 3. 当前演示流程

```text
打开首页 → 搜索/按科目筛选 → 查看家教详情
                              ↓
                          填写演示预约
                              ↓
                        uni 本地存储
                              ↓
                     我的预约 → 取消预约
```

**注意：** 本地存储不是订单服务；不跨设备同步，也没有老师通知。

## 4. 模块边界

- `src/mocks/tutors.ts`：虚构老师数据与查询函数。
- `src/types/tutor.ts`：家教、预约类型定义。
- `src/utils/bookings.ts`：本地演示预约持久化。
- `src/types/auth.ts`、`src/services/auth.ts`、`src/utils/session.ts`：角色/会话契约、认证适配、页面共用状态。当前仅 Mock；服务端接入见 `docs/AUTH_INTEGRATION.md`。
- `src/components/TutorCard.vue`：列表通用卡片。
- `src/pages`：业务页面通过共享会话状态控制演示入口；服务端仍须独立校验权限。

`src/pages.json` 新增登录、身份选择路由与首页/我的预约/我的 tabBar，原因是三端导航和未登录引导需要固定路由。`src/types/tutor.ts` 和既有预约存储格式未改；演示家长使用一个固定本机身份，原有预约记录仍可见。退出后记录仍保留在设备上。

## 5. 未来 API 草案（尚未实现）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /api/tutors | 列表、关键词、科目筛选 |
| GET | /api/tutors/:id | 家教详情 |
| POST | /api/bookings | 创建预约（鉴权） |
| GET | /api/bookings/mine | 查询本人预约 |
| PATCH | /api/bookings/:id/cancel | 取消预约 |
| POST | /api/tutors/applications | 家教资质申请 |

后端技术、数据库与部署方案须在团队评审后确定，不能把上表当成已上线接口。

## 6. 安全设计待办

鉴权和角色权限、家教身份/资质人工审核、数据最小化、手机号脱敏、加密传输、服务端校验、预约状态机、监护人同意、举报与数据删除机制。真实上线前不得收集未成年人敏感信息。
