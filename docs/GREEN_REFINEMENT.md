# 绿色界面精修与一键启动

2026-10-23；继续使用 PR #39，不合并。

## 设计方向

学生、家长与家教需要清楚的学习入口和可读的解题内容。按用户要求恢复绿色磨砂版本的书页感：衬线标题、深绿线条、纸张白与柔和玻璃层次。首页由已有的抛物线解题翻页卡承担主要视觉，不添加替代人物或装饰。绿色网页首页和完整聊天页不渲染卡通人物；Jenny 版本保留原人物资源与布局，小程序继续使用既有表现。

UI/UX Pro Max 先检索玻璃可读性，首项结果未匹配，改用 `contrast readability --domain ux` 验证命中“Contrast Readability”。据此使用深色正文、高不透明度纸张底和 1.8 正文行高。Distinctive AI Design 遵循用户已确定的方向，使用实际浏览器截图自查：保留原绿色层次，删除人物，将教学卡从素材叠加布局恢复为独立内容卡，改善字号、边框与留白。翻页沿用现有过渡，补齐 Enter/空格操作，保留减少动态效果设置。

## 验证

- 一键启动首次初始化与第二次启动均成功；第二次保留已有 `.env`、密码和数据库迁移状态。后端健康检查、API 模式网页均就绪，未调用模型。
- 绿色 / Jenny × 390 / 1440 px 实际 Edge 检查通过：绿色人物节点为 0；Jenny 节点保留；切换主题后相应恢复/移除；可见翻页控件支持 Enter 与空格；375×667 手机完整聊天页输入框可见；没有页面异常或横向溢出。
- 按两项技能进行截图自查，未使用独立代理评分。截图与检查记录位于 [green-refinement](screenshots/green-refinement/review.json)。
- 未验证真实 API 答题质量；仍由负责人在管理员界面接入密钥。

截图：[绿色首页（桌面）](screenshots/green-refinement/home-green-1440.jpg) · [绿色首页（手机）](screenshots/green-refinement/home-green-390.jpg) · [绿色助手（手机）](screenshots/green-refinement/assistant-green-390.jpg)。
