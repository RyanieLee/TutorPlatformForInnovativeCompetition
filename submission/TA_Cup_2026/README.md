# 参赛材料｜2026年10月24日定稿

**作品名称：领航云学堂——AI赋能的校园家教智能匹配与个性化学习服务平台。**

赛道二：AI+大学生创新创业；选题方向：大学生OPC创新创业AI agent；团队：智教未来队。该版本以用户最终选择为准，不再沿用赛道一字段。

- [三份材料与可编辑Word](finalization/README.md)：1页简介、未签名公开承诺书、6页作品介绍。
- [作品介绍PDF](02_作品介绍文档.pdf)与[文字源稿](02_作品介绍文档.md)：仅保留已实现功能，移除未落地规划，统一黑色文字与淡灰表头；加强AI服务主线、两类落地场景、技术创新和应用成效。
- [审阅修复和修改溯源](FINALIZATION_REVIEW.md)：记录原稿作者、同伴PR #40与本次PR #49，以及具体修复项。

带签名/实际联系方式的私有版在/workspace/shared/downloads/submission-finalization/定稿_20261024/，不进公共Git。原始草稿和同伴8页稿仅供历史追溯，不应作为这次定稿。

生成方式：Python3、python-docx、Pillow、LibreOffice和Noto CJK字体。

```bash
python3 submission/TA_Cup_2026/tools/finalize_documents.py --output /tmp/submission-final
soffice --headless --convert-to pdf --outdir /tmp/submission-final /tmp/submission-final/*.docx
```

模型接口按配置启用，课程与规则演示保留来源说明。文件修改未代替赛事报名后台操作；官网附件1/2原文件尚未逐字核验。旧03视频脚本单独保留，不属于本次三份定稿。
