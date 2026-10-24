from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parent.parent;repo=root.parent.parent.parent
v=json.loads((root/'evidence/validation.json').read_text());video=root/'exports/clip_S14-S16.mp4';assert v['status']=='passed' and hashlib.sha256(video.read_bytes()).hexdigest()==v['videoSha256']
target=root/'exports/S14-S16_delivery.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for base in [root.parent/s for s in ['S14','S15','S16','S14-S16']]+[repo/'video-production/final']:
  for p in sorted(base.rglob('*')):
   if not p.is_file():continue
   rel=p.relative_to(base)
   if any(x in rel.parts for x in ['raw','work','__pycache__']):continue
   if rel.parts[0]=='exports' and p.name!='clip_'+base.name+'.mp4':continue
   if p.name=='.gitkeep':continue
   z.write(p,p.relative_to(repo))
(root/'exports/checksums.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [video,target]));print(target,target.stat().st_size)
