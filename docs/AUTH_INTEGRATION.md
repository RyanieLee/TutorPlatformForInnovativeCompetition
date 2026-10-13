# V0.2 演示身份与后续接入

本文件描述前端契约，**不是已上线 API**。当前服务只有 `MockAuthService`，登录仅切换本机虚构身份。

## 前端使用

- `src/types/auth.ts` 定义 `UserRole`（`parent`、`tutor`、`admin`）、`User`、`AuthSession`、`AuthLoginRequest`、`AuthService`。
- 页面读取 `src/utils/session.ts` 的 `currentSession`，在 `onShow` 中调用 `restoreSession()`；`canAccess(['parent'])` 用于家长预约入口。`logout()` 清除演示会话。
- `src/services/auth.ts` 提供 `authService` 和 `MockAuthService`。演示会话存在 `tutor-platform:mock-session:v1`；没有密码、Token 或真实微信授权。无效会话会清除。
- 首页、我的预约、我的使用 `uni.switchTab`；详情、预约表单和登录页使用 `uni.navigateTo`。预约表单与预约列表只允许 `parent` 演示身份，家教身份显示引导。家教端可新增路由并按 `canAccess(['tutor'])` 控制自己的页面。
- `admin` 只在类型里预留，不提供演示入口。

## 后端交接

将来由服务端决定用户 ID 和角色。`AuthService.login({ kind: 'wechat', code })` 仅是前端预留的凭据交换形状；**目前不会发起请求**。后端团队应先确定登录、刷新、退出、获取当前用户接口的路径、响应和失效规则，再用真实服务替换 `authService`，并调整登录页调用。业务页面继续读取共享会话。真实预约 API、角色权限、资质审核必须在服务端执行；前端 `canAccess` 仅控制界面。

本机预约沿用 `src/types/tutor.ts` 的 `BookingInput` / `BookingOrder` 和 `src/utils/bookings.ts` 的原存储键，没有按用户分区。当前只有一个固定演示家长身份。接入真实多用户与预约 API 时，必须将记录按服务端用户隔离；不要把本地演示记录视作真实订单或自动上传。
