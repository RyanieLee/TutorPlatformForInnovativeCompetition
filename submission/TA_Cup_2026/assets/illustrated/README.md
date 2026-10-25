# 作品介绍功能截图

24张PNG于2026年10月24日从真实Mock H5新采集；正文使用22个独立截图文件、23处图示。全部数据虚构。原始PNG保留，Word仅作源矩形裁切与等比排版；无生成或重绘UI。

capture-inventory.json记录实际页面、文本和原始PNG哈希，figure-index.json记录正文用图、裁切与宽度。操作使用一个全新浏览器上下文，通过UI完成家长预约、教师接受、v1发布、3/5记录、反馈发布、修订采纳、v2发布和家长只读查看；另提交一份虚构教师资料并打开管理员待审核详情，未实际批准。未调用真实模型。

复现：项目根目录Node≥20并安装锁文件依赖和Playwright Chromium。先npm run demo，以日志地址为准；设置DEMO_URL后运行node submission/TA_Cup_2026/tools/capture_illustrations.cjs。若工具脚本与安装依赖的项目不在同一目录，可设置CAPTURE_REPO；SCREENSHOT_DIR可指定独立输出目录。脚本会生成新的虚构订单、日期与截图，历史文件字节不应预期相同。生成Word仍使用finalize_documents.py --only-brochure；PDF用LibreOffice从Word导出。
