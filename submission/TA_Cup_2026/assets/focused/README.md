# 九页作品介绍的精选页面图

8张PNG来自真实运行的Mock H5，采集时间见capture-inventory.json。人物、预约和教学记录均为虚构演示，未连接真实模型。应用基线为5d04c4f；实际采集工作树c6b578b的src、server及依赖／Vite配置与该基线一致，视频工程差异不影响本组页面。

图1为首页首屏局部，保留顶部主要功能导航与主按钮；图2只截取实际解析建议，避免整张长表单缩小；图3呈现完整推荐理由；图4—5对应家长待确认与教师接受预约；图6展示反馈依据和发布按钮；图7保留课程修改前后；图8呈现v1／v2历史。figure-index.json记录裁切与纸面宽度，requirements-validation.json记录原图哈希。Word嵌入原始PNG，未重绘UI或修改图内数字。

复现：Node≥20，在应用仓库运行npm ci并安装Playwright Chromium，以npm run demo日志地址设置DEMO_URL，运行node submission/TA_Cup_2026/tools/capture_focused.cjs。脚本创建全新浏览器上下文，经真实UI完成预约、接受、课程与反馈发布、修订采纳和v2发布；不注入localStorage。可用CAPTURE_REPO指定安装依赖的应用目录，SCREENSHOT_DIR指定新输出目录。新预约编号和时间会变化，不应要求重采文件哈希相同。

文档生成使用tools/finalize_documents.py --only-brochure，PDF由LibreOffice导出。正文按图2—8的实际画面解释流程，来源标签和人工确认边界保留。
