# 课次、预习资料与作业：个人目录审核版

新增功能、后端副本、测试与运行工具均在个人目录。主项目文件保持原样，尚未合并或部署。

## 已实现

- 老师在已接受预约下创建课次，保存草稿、发布预习课件和作业要求。
- 学生沿用“学生/家长”账号，从“我的预约”进入课次，下载课件、上传作业。
- 老师查看提交状态、说明、提交时间、图片和文档。
- 重新提交创建独立版本，保留旧文件；逾期允许提交并标记。
- 文件真实保存在独立后端，服务重启、重新生成审核应用后仍保留。
- 仅对应预约的双方可访问；管理员没有默认读取学生作业的权限。

支持 JPG、PNG、WebP、PDF、DOCX、PPTX，每个文件最多20 MiB、每组最多5个。图片可查看，其他文件可下载；不包含评分、批注或 Office 在线编辑。

[老师端电脑截图](docs/screenshots/teacher-1440.png) · [老师端手机宽度截图](docs/screenshots/teacher-390.png) · [学生端窄屏截图](docs/screenshots/student-320.png)

## 启动审核版

需要 Node.js >=20、npm、Git，当前仓库需包含基线提交 5c189221bb80a6232e20c3902e550f1d867eb97b。

先在当前终端设置 SEED_PARENT_PASSWORD、SEED_TUTOR_PASSWORD、SEED_ADMIN_PASSWORD，各至少12位；这是你自行设置的虚构账号本地密码，不写入 Git。

从仓库根执行：

    node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs setup
    node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs serve

网页：http://127.0.0.1:5174；API：http://127.0.0.1:3002。账号为 demo.parent、demo.tutor、demo.admin，使用对应环境变量中的密码。

setup 只在个人目录 .local 下安装依赖、迁移和初始化审核账号，不连接主项目数据库。再次运行保留课次、作业与文件，并按当前环境变量重设虚构账号密码。本审核环境仅监听本机。

## 手动审核

1. 学生/家长登录，选择示例老师创建预约。
2. 老师登录，在家教工作台接受预约，进入“课次与作业”。
3. 新建课次并保存草稿，上传课件后发布；移除的未发布附件重新进入草稿后不会恢复。
4. 学生从“我的预约 → 课次与作业”下载资料，选择作业文件，上传完成后点击提交。
5. 老师刷新该课次的提交记录，查看图片并下载文档。
6. 学生再次提交，老师应同时看到第1版、第2版；重启后仍可读取。

时间按浏览器本地时区填写 YYYY-MM-DD HH:mm，服务端按 UTC 保存。发布后本版内容锁定；预约取消后只读，预约完成后仍可补交已有课次作业。

## 自动验证与清理

首次浏览器验证前安装本目录专用 Chromium，然后执行验收：

    node workspaces/chunxiaruo-commits/teaching/scripts/install-browser.mjs
    node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs verify

包含原有前后端测试、原B工作流、教学测试、类型检查、H5和小程序构建、双浏览器真实收交及重启恢复。浏览器验收会重设此隔离环境的虚构账号密码；验收后手动体验前重新运行 setup。

结果见 [验收记录](docs/VALIDATION.md) 和 [机器可读结果](docs/validation-results.json)。手机宽度的网页验证与实体手机、小程序真机验证分别记录。

清理超过24小时的未绑定附件：

    node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs clean-temp

已发布课件及历史作业不会被清理。

## 目录与集成

- overlay/src、overlay/server：主项目相对路径的修改副本。
- scripts、tests、docs：生成与验证工具、测试、验收记录和截图。
- .local/review-app：生成的完整应用；不提交。
- .local/data：独立 SQLite 和私有上传；不提交。
- integration-manifest.json：目标位置、基线/当前 SHA-256、原因及集成审批状态。

manifest 中 approvedForIntegration 均为 false，没有自动覆盖主项目的命令。审核通过后再逐文件检查共享接口、迁移、依赖与部署配置；上传目录应配置到源码目录之外。当前不直接推送 main、不自行合并。

