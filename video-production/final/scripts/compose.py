from pathlib import Path
import json,hashlib,subprocess,sys
root=Path(__file__).resolve().parent.parent;repo=root.parent.parent
order=['S02','S03','S01','S04','S05','S06','S07','S08','S09','S10','S11','S12','S13','S14','S15','S16'];seconds=[35,35,40,30,30,25,25,25,40,30,35,40,40,35,35,40]
rows=[];offset=0;gaps=[];cues=['# 全片配音时间表（静音交付，无配乐）','', '只有实际存在且校验通过的片段可进入最终合成；缺口不补造画面。','']
for s,d in zip(order,seconds):
 p=repo/'video-production/segments'/s;row={'id':s,'startSec':offset,'durationSec':d,'contributor':None,'status':'missing'}
 try:
  m=json.loads((p/'manifest.json').read_text());v=json.loads((p/'evidence/validation.json').read_text());video=p/'exports'/('clip_'+s+'.mp4');h=hashlib.sha256(video.read_bytes()).hexdigest()
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]));assert v['status']=='passed' and h==v['videoSha256'];assert abs(float(probe['format']['duration'])-d)<.001;assert m['durationSec']==d
  assert (p/('captions_'+s+'.srt')).exists() and (p/'validation-report.md').exists()
  for block in (p/('captions_'+s+'.srt')).read_text().strip().split('\n\n'):
   times=block.splitlines()[1].split(' --> ')
   def sec(t):
    h,m,z=t.split(':');return int(h)*3600+int(m)*60+float(z.replace(',','.'))
   assert 0<=sec(times[0])<sec(times[1])<=d
  assert any(x.get('codec_type')=='video' for x in probe['streams'])
  row.update(status='verified artifact present',sha256=h,bytes=video.stat().st_size,gitSha=m['gitSha'],contributor=m.get('contributor',m.get('role')),actualDurationSec=float(probe['format']['duration']))
  cues.extend([f'## {s}｜{offset//60:02}:{offset%60:02}–{(offset+d)//60:02}:{(offset+d)%60:02}',(p/'voiceover.md').read_text() if (p/'voiceover.md').exists() else '缺配音文稿，合成前补齐。',''])
 except Exception as e:
  row['reason']=str(e);gaps.append(s);cues.extend([f'## {s}｜{offset//60:02}:{offset%60:02}–{(offset+d)//60:02}:{(offset+d)%60:02}','**缺少已验收片段，台词未填造。**',''])
 rows.append(row);offset+=d
assert offset==540
root.mkdir(exist_ok=True);(root/'segment-inventory.json').write_text(json.dumps({'fixedSequence':order,'expectedDurationSec':540,'expectedSectionsSec':{'overview':70,'core':360,'summary':110},'missingOrInvalid':gaps,'segments':rows},ensure_ascii=False,indent=2)+'\n');(root/'voiceover_cue_sheet.md').write_text('\n'.join(cues).rstrip()+'\n')
report='# 9分钟总片验收报告\n\n'+('阻塞：缺少 '+ '、'.join(gaps)+'。没有生成或宣称完成9分钟总片。\n\n' if gaps else '全部源片基础格式/哈希已核对，继续编码。\n\n')
report+='固定顺序：'+','.join(order)+'。预期概述70秒≤120、核心360秒≤360、总结110秒≤120，总计540秒≤600。文件≤500MB仅能在最终实际产物生成后验证，目前不把预期值当作实测。\n\n'
report+='|片段|起点|要求秒数|状态|\n|---|---:|---:|---|\n'+''.join(f'|{r["id"]}|{r["startSec"]}|{r["durationSec"]}|{r["status"]}|\n' for r in rows)
report+='\n缺片不得用静态业务UI、复用其他功能或抽象图形假充；本次110秒总结独立交付，不冒充540秒总片。现有片段哈希与贡献者实况见segment-inventory.json，配音文稿按准确起点列入voiceover_cue_sheet.md。历史片段贡献者字段来自其清单，角色不等于真实团队成员署名。\n'
(root/'final_qc_report.md').write_text(report)
if gaps:print('BLOCKED: missing/invalid '+','.join(gaps));sys.exit(2)
# Run only when all sixteen validated, real source segments exist.
review=root/'truthfulness-review.json'
if not review.exists() or json.loads(review.read_text()).get('approvedForComposition') is not True:
 print('BLOCKED: complete-film truthfulness/subtitle review not yet recorded');sys.exit(3)
work=root/'work';work.mkdir(exist_ok=True)
for s in order:
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(repo/'video-production/segments'/s/'exports'/('clip_'+s+'.mp4')),'-an','-vf','scale=1920:1080,fps=30,setsar=1','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',str(work/(s+'.mp4'))],check=True)
(work/'concat.txt').write_text(''.join("file '"+str(work/(s+'.mp4'))+"'\n" for s in order))
output=root/'LingHang_TA_Cup_2026_09m00s.mp4'
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(work/'concat.txt'),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-ar','48000','-t','540','-movflags','+faststart',str(output)],check=True)
assert output.stat().st_size<=500_000_000
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(output)]));assert abs(float(probe['format']['duration'])-540)<.001
(root/'ffprobe.json').write_text(json.dumps(probe,indent=2))
import re
def parse(t):
 h,m,s=t.split(':');return float(h)*3600+float(m)*60+float(s.replace(',','.'))
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
blocks=[];offset=0
for s,d in zip(order,seconds):
 for block in (repo/'video-production/segments'/s/('captions_'+s+'.srt')).read_text().strip().split('\n\n'):
  lines=block.splitlines();a,b=lines[1].split(' --> ');blocks.append(f'{len(blocks)+1}\n{stamp(parse(a)+offset)} --> {stamp(parse(b)+offset)}\n'+ '\n'.join(lines[2:]))
 offset+=d
(root/'LingHang_TA_Cup_2026.srt').write_text('\n\n'.join(blocks)+'\n')
(root/'final_qc_report.md').write_text(report+'\n已编码540秒、1080p/30fps H264/yuv420p与AAC48kHz；最终播出前仍须人工章节抽样审核字幕断句/真实性/跳帧与可读性，不把脚本通过等同人工终审。\n')
print(output)
