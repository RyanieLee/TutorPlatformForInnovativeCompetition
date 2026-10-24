# 在线演示部署状态

更新：2026-10-25（北京时间）。本文件不包含密钥、口令或实名资料。

## 已完成

- 腾讯云 EdgeOne Makers 项目 `yunbanxue-demo` 已创建，项目 ID `makers-iey09htjj0ym`。
- 加速区域为全球可用区（不含中国大陆）；未备案自定义域名按此区域评估和验证访问，不能把区域名称理解为已经验证了大陆用户体验。
- 最新生产部署 `dpuhiecdicyj` 状态成功；云函数构建成功，配置文件校验通过。首版中缓存配置对象/数组格式问题已按官方格式修复并重新部署。
- 平台地址：https://yunbanxue-demo-be3omjwv.edgeone.dev/
- 域名 `yunbanxue-demo.top` 已由用户购买，注册状态正常、已实名认证；到期时间为2027-10-25（北京时间）。
- 已新增 `edgeonereclaim` TXT归属验证记录，EdgeOne验证成功；自定义域名已关联生产环境。
- 正式域名：https://yunbanxue-demo.top/ 。主机记录 `@` 的 CNAME 为平台分配的 `yunbanxue-demo.top.pages.dnsoe6.com`；权威DNS与独立公共DNS均已返回该目标。
- 免费RSA 2048证书已部署，当前证书到期时间为2027-01-22 07:59:59（北京时间），平台显示到期前15天自动更新。强制HTTPS已开启（302）。
- 正式域名首页及 `/api/assistant/status` 实测返回200，HTTP访问自动跳转至HTTPS；浏览器实际加载中文首页并验证双主题。用户确认手机流量可以正常打开。
- 外部3节点HTTPS首页检测全部200（https://check-host.net/check-report/532b9c08kc77），另3节点公开API检测全部200（https://check-host.net/check-report/532ba12akd5e）。这些外部节点均非大陆节点；手机流量反馈不等于大陆三网全覆盖验收。
- 当前浏览器已实际打开中文首页、显示演示老师并切换双主题；当前执行环境的 HTTPS 状态接口返回200、Cache-Control为no-store。
- `/api/assistant/status` 当前返回 `enabled:false`、provider为DeepSeek。模型仍未启用，没有执行真实付费模型请求。
- 已保存非敏感环境变量 `DEEPSEEK_MODEL=deepseek-flash`、`DEMO_AI_EXPIRES_AT=2026-12-25T15:59:59Z`。
- 代码前端142项测试、类型检查和专用构建通过；本地同一生成函数的协议验证见 deploy/edgeone/README.md。

## 待账号本人完成

1. 项目设置中新建环境变量弹窗已准备两行名称：`DEEPSEEK_API_KEY` 和 `DEMO_AI_ACCESS_CODE`。值需要本人填入并保存，不要发到聊天。随机演示口令在本机忽略文件 `.local/edgeone-demo.env`，未进入发布包或Git。

## 随后继续完成

- 确认两个敏感变量保存后重新部署，使配置生效。
- 验证实际DeepSeek问答和文字批改；只用非个人信息的简单示例。
- 域名、DNS与免费HTTPS已完成；后续按实际演示需要补充大陆不同地区及运营商的访问抽查。
- 完整验收前保留PR #50为草稿，不合并main。

控制台：https://console.cloud.tencent.com/edgeone/makers/project/makers-iey09htjj0ym/index

项目设置：https://console.cloud.tencent.com/edgeone/makers/project/makers-iey09htjj0ym/setting

域名管理：https://console.cloud.tencent.com/edgeone/makers/project/makers-iey09htjj0ym/domain
