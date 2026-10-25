# GitHub 公网演示发布

本次发布保留已确认的首版操作优化：去除背景大人物、放大按钮与文字、突出首页两个主要入口、折叠高级功能。补充 GitHub 项目子路径下的教师示例头像适配。

## 仓库拥有者只需完成一次设置

打开 https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/settings/pages

在 Build and deployment 中选择：

1. Source: Deploy from a branch
2. Branch: gh-pages
3. Folder: / (root)
4. Save

等待 GitHub 的 pages-build-deployment 成功，然后访问：

https://RyanieLee.github.io/TutorPlatformForInnovativeCompetition/

这是预期地址；必须以 Pages 设置显示已发布、且公网实际访问成功为准。当前连接没有仓库管理权限，不能代替拥有者开启 Pages。

## 重建

从 deploy/github-pages-source 分支安装依赖并构建：

```sh
npm ci
node scripts/build-github-pages.mjs
```

将 dist/build/h5 的内容（含 .nojekyll）发布到 gh-pages 分支根目录。已有 deploy-demo.yml 使用 GitHub Actions 发布方式；本次选择分支发布，请勿同时手动运行该工作流，避免两种发布方式相互覆盖。

## 范围与验证

GitHub Pages 仅托管静态前端。本发布为可交互的 Mock 演示，无需登录 GitHub；资料与预约存于访问者自己的浏览器，属于虚构演示。真实共享账户、跨设备预约、上传存储和模型服务需要独立后端，不能由 Pages 执行。

发布准备检查：TypeScript 类型检查通过，18 个测试文件共 110 项测试通过，H5 子路径构建成功。示例头像使用构建基础路径，保留真实 API 照片地址逻辑。
