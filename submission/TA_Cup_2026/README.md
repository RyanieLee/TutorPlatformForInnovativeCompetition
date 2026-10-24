# 参赛材料｜当前整合版

2026年10月24日更新。作品全称以负责人最新指示为准：**领航云学堂——AI赋能的校园家教智能匹配与个性化学习服务平台**。

- [三份材料公开校对版](finalization/README.md)：264字简介、未签名承诺书、8页作品介绍及可编辑Word。
- [作品介绍PDF](02_作品介绍文档.pdf)与[文字源稿](02_作品介绍文档.md)：保留同伴3903f32的主体内容，统一新作品名称、日期和赛道定位。
- [修改溯源与定稿核对](FINALIZATION_REVIEW.md)：说明谁修改、是否已进main、哪些文件仍是历史稿，以及教师成员/官方模板待核对事项。
- assets/02-home.png与02-assistant.png均为原项目的真实演示截图，不是伪造业务页面。

所属赛道：**赛道一：AI+高等教育**；选题方向：**AI+教学**；团队：智教未来队。官方参赛要求截图明确“以学生为主体的团队须至少包含1名教师”，当前尚待核实教师成员。

带签名和联系方式的文档仅在本机下载目录导出，公共Git不放签名原图、真实电话/邮箱或身份证信息。用户收到的私有版已填其确认的身份与日期；公开版保留个人字段占位。

生成可编辑Word再导出PDF：

```bash
python3 submission/TA_Cup_2026/tools/finalize_documents.py --output /tmp/submission-review
soffice --headless --convert-to pdf --outdir /tmp/submission-review /tmp/submission-review/*.docx
```

需要Python3、python-docx、Pillow、LibreOffice和Noto CJK字体。原ReportLab脚本保留为历史生成方案。

drafts/为2026年10月22日的历史Word草稿，不应从旧02覆盖本次新版；03视频脚本仍为旧9分30秒方案，不能当成16段9分钟固定时间轴的最新稿。正文明确区分已实现功能、需要模型配置的接口及后续规划，测试和虚构案例不作为真实教学成效。
