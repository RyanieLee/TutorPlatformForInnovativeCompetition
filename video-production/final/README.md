# 最终9分钟合成入口

当前只有S01–S07与本次S14–S16；S08–S13缺失。真实缺口报告在final_qc_report.md，固定时间轴与源片SHA/角色来源在segment-inventory.json。未生成、未伪称存在9分钟总片。

先放入各段独立目录与真实MP4、manifest、SRT、验证JSON和报告，再运行：

```bash
python3 video-production/final/scripts/compose.py
```

脚本遇缺片/哈希不符/时长不符返回2并写缺口报告；不补造业务界面。齐片后，还须人工核查全片故事与字幕真实性，将签核记录存为本目录truthfulness-review.json（approvedForComposition: true，以及检查人、日期、问题处理记录）；这只用于未来齐片后的事实检查，不要求本次用户审批。当前未签核，不宣称全片通过。

齐片并完成检查才编码输出LingHang_TA_Cup_2026_09m00s.mp4、LingHang_TA_Cup_2026.srt、ffprobe.json；配音cue表保持固定起点，缺片台词留缺口。逐段视频去除原音、统一重编码1080p/30fps/H264/yuv420p，再拼接视频并重新生成540秒静音AAC48kHz。没有授权配音或配乐时不自动生成声音。成片文件<=500MB、准确540秒；最后仍需人工章节抽样核对可读性、断句、跳帧与音轨，才能报告最终验收。
