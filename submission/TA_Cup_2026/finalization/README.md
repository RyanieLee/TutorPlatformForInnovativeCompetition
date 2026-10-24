# 三份材料的公开校对版

作品名称已按用户2026-10-24最新指示统一。这里仅保存不含实际签名/联系方式的版本；带签名及报名身份信息的DOCX/PDF只在本机会话下载目录导出。

- 01a：264字简介正文及可编辑基本信息表。
- 01b：仓库原承诺声明的未签名校对版，官方模板仍待核对。
- 02：保留同伴3903f32主体内容，统一新名称与核查日期，提供8页PDF和可编辑Word。

修改者与PR状态、未知报名字段、条款和视频旧稿问题见../FINALIZATION_REVIEW.md。新版介绍来源PR #40未在核查时合入main，本分支已保留其作者信息整合，无需再从旧Word覆盖新版。

## 复现

```bash
python3 submission/TA_Cup_2026/tools/finalize_documents.py --output /tmp/submission-review
soffice --headless --convert-to pdf --outdir /tmp/submission-review /tmp/submission-review/*.docx
```

工具：Python3、python-docx、Pillow、LibreOffice及Noto CJK字体。带身份版本另加--identity指向本机JSON（workTitle/track/team/school/leader/contact/phone/email/signatureNames/signingDate）；带签名版本另加--signature-dir指向四张本机原图，文件名1-照片-1.jpg至4-照片-4.jpg。不要将私人JSON、签名原图或带电话的输出放进公共Git。

原ReportLab生成器保留为同伴历史方案；本轮使用Word→PDF流程，解决本机无微软雅黑字体路径的问题。
