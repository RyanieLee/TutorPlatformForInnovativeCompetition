from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parent.parent;video=root/'exports'/('clip_'+root.name+'.mp4');v=json.loads((root/'evidence/validation.json').read_text());assert v['status']=='passed' and hashlib.sha256(video.read_bytes()).hexdigest()==v['videoSha256']
with zipfile.ZipFile(root/'exports'/(root.name+'_delivery.zip'),'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if not p.is_file():continue
  r=p.relative_to(root)
  if any(x in r.parts for x in ['raw','__pycache__']):continue
  if r.parts[0]=='exports' and p!=video:continue
  if p.name=='.gitkeep':continue
  z.write(p,Path('video-production/segments')/root.name/r)
