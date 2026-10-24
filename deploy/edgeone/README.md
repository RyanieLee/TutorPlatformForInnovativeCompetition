# 领航云学堂在线演示部署

此部署保留浏览器中的演示业务数据，问答与文字作业批改调用真实 DeepSeek。不是完整 SQLite 业务后端的云端替代。

## 制作发布包

项目根目录运行 `npm run build:online-demo`。便携运行时可通过 `node .local/npm/package/bin/npm-cli.js run build:online-demo` 执行。脚本输出一个新的 `outputs/edgeone-online-demo-时间戳/`，根目录包含 index.html、静态资源、cloud-functions 和仅含缓存配置的 edgeone.json；可作为文件夹/ZIP直接上传 EdgeOne。

如果通过 Git 部署，以本目录作为项目根目录时，需要先把上述前端构建产物放入本目录的 public/；推荐先使用已生成的直接上传包，避免改动现有团队构建配置。

## 服务端环境变量

在云平台配置以下变量，均不要放入 VITE_*、前端文件或聊天：

- `DEEPSEEK_API_KEY`：团队已有 DeepSeek Key。
- `DEEPSEEK_MODEL`：默认 deepseek-flash（2026-10-25官方文档推荐名称），也可填账号支持的模型名。
- `DEMO_AI_ACCESS_CODE`：随机16–128字符演示口令，单独分享给体验者；不是模型Key。
- `DEMO_AI_EXPIRES_AT`：ISO到期时间，例如 `2026-12-25T15:59:59Z`。缺失、格式错误或到期自动关闭模型调用。

配置变更后按平台要求重新部署使之生效。接口状态 `/api/assistant/status` 不返回密钥；未启用时仍可浏览所有演示页面。文字批改入口需要先进入学生/家长或家教演示身份，再确认发送脱敏内容。首次调用输入演示口令，取消不会发送请求。

## 能力与额度

开放 `/api/assistant/chat` 和 `/api/assistant/homework-review-text`；后者包含错因、针对训练和老师备课建议。普通展示数据仍为本浏览器本地数据；长期档案中的演示报告不会自动变成模型生成报告。本轮未开放图片模型。

仅固定调用 `https://api.deepseek.com/chat/completions`，超时25秒、最大输出1600 tokens。单个温实例每IP每分钟3次、每小时60次、并发2；这些限制不会跨多个实例或重启持续累计，**不是账户全局账单上限**。DeepSeek账户额度、平台保护和密钥停用是额外控制手段；模型调用费用与免费托管额度分开。

## 访问地址

免费默认域名不能当作稳定大陆网址：中国站大陆预览链接3小时有效，非大陆可用区的默认域名对大陆网络返回401。若需要一两个月固定地址，购买低首年价自定义域名并绑定。大陆节点需要域名备案；未备案的自定义域名可评估非大陆节点并实测大陆网络访问。域名多数以年购买，不必为了两个月购买多年套餐；注册可用性与结算价需实际确认，购买和实名由账号本人完成。

## 验证状态

本地单元测试使用模拟上游，不代表已实际消耗团队模型额度。只有完成云平台登录、密钥配置、部署、域名绑定和真实请求验证后才算完整演示验收。当前实际部署状态见 ../../docs/ONLINE_DEMO_RELEASE_STATUS.md。

2026-10-25：前端142项测试、类型检查、专用H5构建通过。浏览器使用生成包内同一 onRequest 函数，验证口令取消不发送、文字批改协议、连续两轮问答、双主题切换与390px手机无横向溢出；上游明确标注为本地模拟。独立代码复核发现的多轮历史长度和中文请求字节预算问题已修复并增加回归。

用户选定候选域名 `yunbanxue-demo.top`。腾讯云查询页显示首年14元、可加购；尚未购买，未保留或注册域名，最终以订单为准。使用一两个月可优先购买最短年限，无须多年购买。HTTPS优先使用托管平台的免费证书，域名页面的付费SSL广告不属于本方案。

官方参考：
- https://pages.edgeone.ai/zh/document/direct-upload
- https://pages.edgeone.ai/zh/document/node-functions
- https://edgeone.cloud.tencent.com/pages/document/175191784523485184
- https://api-docs.deepseek.com/zh-cn/
