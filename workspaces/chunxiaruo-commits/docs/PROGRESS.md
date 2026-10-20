# 执行记录：2026-10-18-tutor-admin-plan.md

- 用户已确认方案、计划及当前会话执行；2026-10-19 补充全部面向用户的界面须为中文。
- 允许修改个人目录及 src/pages/tutor/、src/pages/admin/。远程起点 ac393439b73216cef831398f9b8b51e83641c16c。
- Ruling: Git 本机 DNS 失败，使用 GitHub 连接器读取固定提交建立独立代码副本；提交通过 GitHub Git 对象与 expected_sha 更新本人分支。公共源文件保持逐字不变。
- Ruling: 本机提供 Node/pnpm 而无 npm；用 pnpm 的 hoisted/copy 模式安装现有依赖，禁止提交任何额外锁文件和安装产物。私有临时环境、数据库、日志均放个人 .local 目录且不提交。
- Pre-flight: 五页面复用相同局部身份/请求控制与确认辅助；操作页面必须在确认框弹出之前加忙碌锁，并验证发起时身份仍一致。
- Pre-flight: 已通过资料重提先保存草稿再提交；管理员列表与详情共用现有状态契约，草稿独立展示。
- 执行中：测试先行、基线验证、任务 1–4。

- Task 1–4: complete。原前端 16/16，新增 B 9/9；两类类型检查通过；Mock/API 浏览器链路通过。
- Task 5: 本地验收 complete；Mock/API H5 和 mp-weixin 四项构建通过；后端 API 16/16；同 ID 服务重启持久化通过。远程 PR/CI 状态另查。
- Ruling: npm 官方包下载至个人临时目录后，已切回 npm ci 按原始 lock 精确安装前后端；不提交 pnpm 安装结果。
- Ruling: 小程序拒绝 src 外运行时 chunk，局部运行时移至授权的 src/pages/tutor/shared/，个人目录保留测试与文档；所有公共文件只读。
- Ruling: 同身份刷新保留 DOM 配合 v-show，修复已复现的 ResizeSensor onActivated 空引用；身份切换仍同步 clear。
- Final review: 独立审查完成；重要的未知写入结果问题已用丢失响应/回读断网场景红→绿修复；onHide 失效、待审摘要及已处理举报计数已补齐，复核无剩余 Critical/Important。
- Final rulings: API 权限/持久化已用真实开发接口验证；共享契约中的旧 401 和价格整数差异未扩范围修改；剩余小程序真机、公共 CI、生产能力见 VALIDATION.md。
