# AI 模型接入与双主题验收

2026-10-23，基线 main `5d04c4f`。只提交 PR，不合并。

## 实现

- 管理员模型接入：地址/模型/密钥、加密保存、启用开关、独立图片能力开关、固定小请求连接测试。
- 新配置即时用于助手聊天、文字批改与既有图片批改；聊天/批改路由复用认证、限流和上游约束。
- 右下角悬浮聊天面板，保留完整页面与语音/图片工具，新增独立 AI 批改页及家教入口。
- H5 头部两种外观：原绿色玻璃（默认）/ Jenny 浅蓝。作用于全部共享布局，保留最新功能，设备记忆选择。
- 新控件有可见焦点、键盘发送/激活、ESC 关闭和焦点归还；原生输入标签补全；减少动态效果设置下关闭新增入场动画。

## 已执行

| 检查 | 结果 |
|---|---|
| 前端 typecheck | 通过 |
| 前端单元测试 | 110 通过 |
| 教学工作区 typecheck / 测试 | 通过 / 9 通过 |
| H5 构建 | 通过（Mock 与 API 模式均构建） |
| 微信小程序构建 | 通过；不代表真机验收 |
| 后端 Prisma 客户端生成、TypeScript 构建 | 通过 |
| 后端全量测试 | 121 通过，其中新增模型配置测试 7 项 |
| 双主题浏览器流程 | 390 / 1440 px × 绿色 / Jenny，共 4 组通过 |

后端测试覆盖访客与非管理员拒绝访问、服务域名限制、密钥加密与不回传、重启恢复、测试限流、保存后调用新配置、文字批改权限/参数校验、上游失败脱敏、禁用立即生效、视觉开关和配置损坏安全关闭。所有模型调用使用受控响应，不消耗真实 API。

浏览器以 API 构建配合拦截的测试接口，验证配置保存、密钥输入清空、测试成功状态、主题切换与刷新保留、题目提交和结果展示、聊天发送、ESC 后焦点回到悬浮球、无页面错误/横向溢出及 reduced-motion。记录：[api-browser-review.json](screenshots/ai-assistant/api-browser-review.json)。后端端点真实请求校验由 Fastify 注入测试覆盖；浏览器拦截测试不等同于已连接 DeepSeek。

截图为真实 Edge 渲染，模型文字是测试夹具，不能作为模型答题质量证据：

| 界面 | 绿色玻璃 | Jenny 浅蓝 |
|---|---|---|
| 管理员，桌面 | [截图](screenshots/ai-assistant/settings-green-1440.jpg) | [截图](screenshots/ai-assistant/settings-jenny-1440.jpg) |
| 管理员，手机 | [截图](screenshots/ai-assistant/settings-green-390.jpg) | [截图](screenshots/ai-assistant/settings-jenny-390.jpg) |
| 批改，桌面 | [截图](screenshots/ai-assistant/review-green-1440.jpg) | [截图](screenshots/ai-assistant/review-jenny-1440.jpg) |
| 批改，手机 | [截图](screenshots/ai-assistant/review-green-390.jpg) | [截图](screenshots/ai-assistant/review-jenny-390.jpg) |
| 聊天，桌面 | [截图](screenshots/ai-assistant/chat-green-1440.jpg) | [截图](screenshots/ai-assistant/chat-jenny-1440.jpg) |
| 聊天，手机 | [截图](screenshots/ai-assistant/chat-green-390.jpg) | [截图](screenshots/ai-assistant/chat-jenny-390.jpg) |

## 设计自查

按两个设计 skill 自查，未使用独立代理评分。第一轮发现入场动画截帧使内容显淡、表单与浮窗的自定义控件缺少原生输入命名；第二轮等待过渡结束重拍、降低玻璃透底干扰、补齐输入标签、键盘响应与关闭焦点。绿色以纸张色、深绿细线/顶线和衬线标题建立层次；Jenny 保留原有浅蓝背景与页面素材，并让新增 AI 区域使用相应青色变量。未改写 Jenny 原始样式文件，以 H5 作用域样式实现并存。

首轮 GitHub 检查的构建及后端任务通过，浏览器检查暴露完整聊天页在 375×667 手机上的输入框超出首屏，以及旧语音测试仍假定悬浮球直接跳页。已缩短手机聊天记录区域并让输入框排在扩展工具之前；语音测试改为从悬浮面板点击“完整对话”，继续验证识别、匹配、朗读和权限失败。

## 尚未验证

负责人真实 API 密钥、供应商额度/模型可用性、真实网络延迟、作业批改质量和图片识别能力未验证。没有发布公网服务，也没有合并 PR。小程序只完成编译，双外观切换限定网页。配置持久化为单实例本地文件；多实例同步、流式输出、会话/作业持久化不在本次范围。

## 手动复验

管理员先按 [接入说明](AI_ASSISTANT_SETUP.md) 保存配置并测试；成功后开启服务。家长或家教在两种主题下分别发送问题、填写示例批改，检查新窗口不跳离原任务、结果可读、错误可重试。关闭模型后重新发送，确认显示不可用而非伪造模型答复。
