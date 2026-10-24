# Online Demo Implementation Plan

> Execute inline using superpowers:executing-plans in the existing isolated worktree. Do not merge main.

**Goal:** 在线演示站通过云端调用 DeepSeek，并准备自定义域名发布。

**Architecture:** 静态演示业务保留；独立服务端函数只处理问答和文字批改。使用专属构建开关、独立口令及过期关闭保护。

**Tech Stack:** Vue / uni-app、Node Fetch API、EdgeOne Node Functions、Vitest。

**Spec:** ../specs/2026-10-25-online-demo.md

## Constraints and review focus

- 不改变现有 API/Mock 功能或两套主题；不上传本机 .env、数据库或用户照片。
- DeepSeek Key 不进入前端构建、不返回错误响应；仅固定上游地址。
- 空配置、过期、错口令和非同源请求不能调用上游。
- 访问限制只有单实例范围，不承诺全局费用硬上限；控制台额度和模型账户额度另行配置。
- 处理过大请求、取消口令、并发访问、响应截断及账户切换。

## Tasks

- [x] 先写并运行失败的网关与口令测试，覆盖上述边界。
- [x] 新增 deploy/edgeone/ 独立函数、云配置和说明；不启动原 SQLite 后端。
- [x] 新增前端演示口令请求模块及构建开关，限制为 AI 路径；401 不清除 Mock 会话。
- [x] 运行前端测试、类型检查与专用在线演示构建；本地运行同一函数适配器，浏览器验证两套主题下模型问答/批改协议和口令行为，使用模拟上游避免泄露 Key。
- [x] 制作不含密钥的部署包与配置指南，提交独立分支。
- [ ] 用户登录腾讯云后发布免费资源；确认并由用户购买域名，配置云端 Key，验证真实调用和可访问链接。

## Execution ledger

- 采用用户已确认的免费演示＋真实 DeepSeek 方案，新增小额域名预算；优先完成本地可验证产物。
- 已在现有隔离 worktree；当前分支 feat/ai-ui-handover，基线9897d1f。
- 交付分支为 feat/edgeone-deepseek-demo，依赖已有AI/UI分支，不覆盖main。
- 142项测试、类型检查及H5构建通过；两项独立评审发现已复现并修复，评审复核无其他可执行问题。
- ZIP根目录与函数入口检查通过，159个归档条目，约5.2MB；没有部署云资源或调用真实模型。
- 腾讯云登录和账号协议处理已完成；项目与两次生产部署成功，最新dpuhiecdicyj已通过配置校验；平台首页和状态接口实际可访问。
- 用户已购买yunbanxue-demo.top；归属验证、主域名CNAME、免费证书和强制HTTPS已配置完成。正式域名首页/API实测200，HTTP自动跳转HTTPS；浏览器双主题加载成功，用户确认手机流量可访问。
- 当前外部依赖仅剩云端Key与独立口令由本人填入已准备的变量窗口，再部署并验证真实模型调用。状态接口enabled:false，尚未调用真实模型。详细接续信息见docs/ONLINE_DEMO_RELEASE_STATUS.md。
