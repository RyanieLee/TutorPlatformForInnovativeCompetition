# V0.2 演示身份与后续接入

本文件描述前端契约，**不是已上线 API**。当前服务只有 `MockAuthService`，登录仅切换本机虚构身份。

## 前端使用

- `src/types/auth.ts` 定义 `UserRole`（`parent`、`tutor`、`admin`）、`User`、`AuthSession`、`AuthLoginRequest`、`AuthService`。V0.3 的管理员也可以从登录页选择演示身份。
- 页面读取 `src/utils/session.ts` 的 `currentSession`，在 `onShow` 中调用 `restoreSession()`；`canAccess(['parent'])` 用于家长预约入口。`logout()` 清除演示会话。
- `src/services/auth.ts` 提供 `authService` 和 `MockAuthService`。演示会话存在 `tutor-platform:mock-session:v1`；没有密码、Token 或真实微信授权。无效会话会清除。
- 首页、我的预约、我的使用 `uni.switchTab`；详情、预约表单、家教端和审核台使用 `uni.navigateTo`。家长预约、家教工作台、管理员审核台分别按角色显示引导。页面仅做演示访问控制；服务端仍须独立鉴权。

## 后端交接

将来由服务端决定用户 ID 和角色。`AuthService.login({ kind: 'wechat', code })` 仅是前端预留的凭据交换形状；**目前不会发起请求**。后端团队应先确定登录、刷新、退出、获取当前用户接口的路径、响应和失效规则，再用真实服务替换 `authService`，并调整登录页调用。业务页面继续读取共享会话。真实预约 API、角色权限、资质审核必须在服务端执行；前端 `canAccess` 仅控制界面。

本机预约沿用原 `BookingInput` 字段，新 `BookingOrder` 增加 `parentId` 与状态机，并兼容读取旧存储键。接入真实多用户与预约 API 时，必须由服务端隔离记录；不要把本地演示记录视作真实订单或自动上传。迁移细节见 `docs/BUSINESS_INTEGRATION.md`。
