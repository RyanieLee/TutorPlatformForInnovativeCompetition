from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parent.parent
roots=[root.parent/p for p in ['S05','S06','S07','S05-S07']]
validation=json.loads((root/'evidence/validation.json').read_text())
video=root/'exports/clip_S05-S07.mp4'
assert validation['status']=='passed'
assert hashlib.sha256(video.read_bytes()).hexdigest()==validation['videoSha256']
target=root/'exports/S05-S07_delivery.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
 for base in roots:
  for path in sorted(base.rglob('*')):
   if not path.is_file():continue
   rel=path.relative_to(base)
   if rel.parts[0]=='raw' or '__pycache__' in rel.parts:continue
   if rel.parts[0]=='exports' and rel.name!='clip_'+base.name+'.mp4':continue
   if rel.name=='.gitkeep' or rel.name.startswith('failure-') and path.suffix!='.json':continue
   archive.write(path,Path('video-production/segments')/base.name/rel)
checksums=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [video,target]);(root/'exports/checksums.txt').write_text(checksums);print(checksums,end='');print('Bundle bytes:',target.stat().st_size)
