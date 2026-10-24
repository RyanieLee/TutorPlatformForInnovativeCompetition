"""Package the actual video, scripts and evidence. Do not include raw captures."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
validation=json.loads((root/'evidence/validation.json').read_text())
video=root/'exports/clip_S04.mp4'
assert validation['status']=='passed'
assert hashlib.sha256(video.read_bytes()).hexdigest()==validation['videoSha256']
target=root/'exports/S04_delivery.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for path in sorted(root.rglob('*')):
        if not path.is_file():continue
        rel=path.relative_to(root)
        if rel.parts[0]=='raw' or '__pycache__' in rel.parts:continue
        if rel.parts[0]=='exports' and rel.name!='clip_S04.mp4':continue
        if rel.name in ['.gitkeep','contact-sheet.png'] or rel.name.startswith('browser_'):continue
        archive.write(path,Path('video-production/segments/S04')/rel)
checksums=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [video,target])
(root/'exports/checksums.txt').write_text(checksums)
print(checksums,end='')
print('Bundle bytes:',target.stat().st_size)
