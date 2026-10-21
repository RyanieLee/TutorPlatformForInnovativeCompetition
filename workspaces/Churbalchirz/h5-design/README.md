# Churbalchirz 的 H5 视觉设计预览

此分区保存「校园学习手册」方案的独立前端副本，基于主分支 `959dd092`。家长、家教、管理员、登录和推荐页面均可在预览中体验。仓库原有 `src/`、`server/` 和 B 的个人分区没有改动；这里的工作台是设计副本，不是对 B 原页面的提交。

## 直接体验

下载本目录的 **preview.html**，用浏览器打开，无需安装依赖。此文件包含前端代码、样式和 SVG 插画，默认使用虚构 Mock 数据。浏览器需执行 JavaScript 并允许本地存储；手机文件管理器内置的文本预览可能无法运行，请选择浏览器打开。也可在本目录运行 `python3 -m http.server 4173`，访问 `http://localhost:4173/preview.html`。

此版本不是公网部署，也没有真实身份核验、通知或交易。Mock 数据只保存在当前浏览器，不跨设备同步。推荐仍使用原有规则算法。

## 目录

- `preview.html`：可直接打开的单文件预览。
- `src/`：独立前端源代码及首页局部 SVG 学习场景插画。
- `screenshots/`：电脑、390px 手机和320px窄屏的实际浏览器截图。
- `check-preview.cjs`：对打包后 HTML 进行浏览器验收的脚本。
- `package-preview.cjs`：将 H5 编译结果合并为离线预览。
- `tests/`：从基线复制的44项前端规则与适配层测试。

## 运行和构建

```bash
cd workspaces/Churbalchirz/h5-design
npm ci
npm run dev:h5
npm run typecheck
npm test
npm run build:h5
npm run package:preview
npm run build:mp-weixin
```

浏览器验收：

```bash
npx playwright install chromium
node check-preview.cjs
# 可选：指定已安装的 Chromium 可执行文件
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium node check-preview.cjs
```

无需修改仓库根目录的工程配置。不要将此目录的 `src/` 直接覆盖主工程；确认视觉方案后，应由对应模块负责人按文件评审并单独集成。

## 设计规范

- 暖白背景 `#F7F6F2`、墨绿主色 `#185448`、正文 `#202C28`、次要文字 `#61716A`。
- 系统中文无衬线字体，正文16px、辅助14px、电脑首页标题44px、手机标题28px。
- 家教卡片桌面三列、中屏两列、手机单列；姓名、价格和操作形成明确层级。
- 手机保留底部导航，隐藏重复的家长顶部导航；电脑使用顶部导航。
- 首页使用原创 SVG 学习桌插画，无外部图片、字体、Canva资源或密钥依赖。
- 两侧角色工作台延用原结构和交互，只统一视觉层；保留演示与数据范围说明。

## 验收与限制

见 `VALIDATION.md`。截图为运行中的独立 Mock 预览，不代表已在主项目集成或公网发布。API 模式沿用原代码，本轮不声称已完成后端或微信真机验收。
