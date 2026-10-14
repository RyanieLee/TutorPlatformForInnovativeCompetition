# V0.3 本机业务闭环与接入约定

当前仅为 **Mock 演示**：`src/services/contracts.ts` 的 `BusinessService` 是页面统一异步接口，`src/services/business.ts` 注入 `MockBusinessService`。更换真实 API 实现时保留接口，由服务端读取当前用户和校验全部权限。前端传入的 `User` 与 `canAccess` 可被客户端篡改，不构成安全保障。

## 模型与状态

- `src/types/tutor.ts`：`Tutor`、原 `BookingInput` 字段、带 `parentId` 的新 `BookingOrder` 和 `LegacyBookingOrder`。
- `src/types/business.ts`：`TutorApplication` 与 `TutorReport`。
- 申请：`draft → pending → approved/rejected`；拒绝须填写原因。被拒或已通过的资料可重新编辑，保存草稿后需重新提交审核。
- 预约：`pending → accepted/rejected/cancelled`；`accepted → completed/cancelled`。家长只能取消自己的 `pending/accepted`；家教只能接受、拒绝、完成分配给自己的预约。重复或非法操作返回 `CONFLICT`。
- 举报：`open → resolved`。家长提交、管理员标记处理。

## Mock 数据与兼容

- 已有虚构家教数据仍在 `src/mocks/tutors.ts`，只有 Mock 服务读取。`t001`（小林老师）关联演示家教 `demo-tutor`，其通过审核的申请覆盖 `t001` 的展示字段；其他种子老师没有可登录的演示家教账号。
- 新预约键为 `tutor-platform:demo-bookings:v2`。如果不存在，新服务读取 `v1`，把“待沟通/已取消”映射为 `pending/cancelled`，归属于唯一旧版演示家长 `demo-parent`。首次创建或状态更新写入 `v2`，**不会删除或修改 `v1`**。格式异常会报告错误并保留原数据。
- 申请和举报各自存在本机存储键。退出登录不会删除数据；设备之间不共享。演示联系号码不应填写真实个人信息。
- `src/utils/bookings.ts` 的旧函数保留给尚未迁移的调用方，新页面只调用 `businessService`。后续禁止新代码再写旧键。

## 后端交接

后端可按 `BusinessService` 分域实现家教目录、申请审核、预约、举报接口。服务端必须自行确定 `parentId`、家教归属和角色，建立预约状态机及并发控制；不要信任客户端传入的用户 ID 或审核决定。上线前还需真实身份/资质核验、隐私政策、监护人同意、举报处置流程与数据删除机制。本机旧记录不能自动当作真实订单上传。

`src/pages.json` 新增 `pages/tutor/*`、`pages/admin/*` 与 `pages/reports/create`，保留原首页/我的预约/我的 tabBar，以减少与家长端 UI 分支冲突。家教与管理员入口位于“我的”。
