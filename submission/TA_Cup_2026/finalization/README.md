# 三份材料｜公开版本

采用黑色字体、加粗标题与淡灰表头。正式作品名称、赛道二与智教未来队已统一；个人姓名/联系方式在公共版本中保留占位，不含签名原图。私有交付已按用户确认填齐并使用最新粗笔签名。

- 01a_参赛作品简介.docx／PDF：269字简介与基本信息表。
- 01b_参赛承诺书_未签名校对版.docx／PDF：公开无签名版本；私有版为四人签名承诺书。
- 02_作品介绍文档.docx／PDF：5页，只保留已实现功能、工程证据和创业应用特点。

history/下的8页PDF是同伴历史版本，不是本次定稿。原稿作者和本次修复见../FINALIZATION_REVIEW.md。

复现：运行../tools/finalize_documents.py，再用LibreOffice转换PDF。带身份版本用--identity读取本机JSON，带签名版本用--signature-dir读取本机图片；第一张替换图可通过私有JSON的signatureOverrides指定原路径、裁切框和Word旋转角度。不得把私人JSON或带联系方式/签名的产物提交公共仓库。
