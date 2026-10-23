"""Composite actual browser video with restrained camera moves and original text graphics."""
import argparse,json,math,os,re,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageStat
p=argparse.ArgumentParser();p.add_argument('--ffmpeg',default=os.environ.get('FFMPEG_PATH','ffmpeg'));p.add_argument('--font',default=os.environ.get('PROBE_FONT','C:/Windows/Fonts/msyh.ttc'));p.add_argument('--bold-font',default=os.environ.get('PROBE_BOLD_FONT','C:/Windows/Fonts/msyhbd.ttc'));a=p.parse_args()
root=Path(__file__).resolve().parents[1];os.chdir(root)
for d in ['assets/graphics','exports','subtitles','screenshots','assets/validation-frames']:Path(d).mkdir(parents=True,exist_ok=True)
def run(args,check=True):
 r=subprocess.run([a.ffmpeg,*args],capture_output=True,text=True,encoding='utf8',errors='replace')
 if check and r.returncode:raise RuntimeError(r.stderr[-7000:])
 return r
raw='assets/raw/browser.webm';probe=run(['-hide_banner','-i',raw],False);m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe.stderr);rawduration=int(m[1])*3600+int(m[2])*60+float(m[3])
capture=json.loads(Path('capture-log.json').read_text(encoding='utf8'))
scenecheck=run(['-hide_banner','-i',raw,'-vf',"scale=192:108,select='gt(scene,0.12)',showinfo",'-an','-f','null','-'])
scene_times=[float(x) for x in re.findall(r'pts_time:([\d.]+)',scenecheck.stderr)]
first_route=next(x['seconds'] for x in capture['actions'] if x['type']=='match-route-confirmed')
first_scene=next((x for x in scene_times if 4<x<12),None)
offset=max(0,first_scene-first_route) if first_scene is not None else max(0,rawduration-40.6)
Path('assets/scene-sync.json').write_text(json.dumps({'navigationWallTime':first_route,'navigationVideoTime':first_scene,'trimStart':offset,'sceneTimes':scene_times},indent=2),encoding='utf8')
def font(n,bold=False):return ImageFont.truetype(a.bold_font if bold else a.font,n)
def graphic(name,w,h,lines,bg=(246,252,249,244),outline=(190,219,210,255)):
 im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im);d.rounded_rectangle((1,1,w-2,h-2),radius=24,fill=bg,outline=outline,width=2)
 for text,y,size,color,bold in lines:
  f=font(size,bold);box=d.textbbox((0,0),text,font=f);d.text(((w-(box[2]-box[0]))/2,y),text,font=f,fill=color)
 im.save('assets/graphics/'+name+'.png')
graphic('intro',1450,190,[('领航云学堂',16,66,(22,66,56),True),('从盲目寻找，到有依据的家教匹配',111,32,(57,99,85),False)])
graphic('closing',1550,160,[('不只是找到老师，',17,44,(22,66,56),True),('更是找到适合的学习伙伴。',77,44,(22,66,56),True)])
graphic('disclosure',440,48,[('本机演示 · 虚构数据 · 规则推荐',10,18,(235,250,242),False)],(23,57,48,235),(23,57,48,235))
cues=[(5,11.7,'从演示导航，一键带入匹配示例。'),(12,16.8,'数学 · 初中（演示）· 100元/小时 · 周六下午'),(17,20,'确认真实条件，点击“生成推荐”。'),(20.5,25,'根据实际条件，查看老师与逐项推荐依据。'),(25,31.9,'匹配理由清晰可见，让选择更有依据。'),(32,35.5,'进入老师详情，进一步了解资料与授课信息。')]
for i,(start,end,text) in enumerate(cues):graphic('caption-'+str(i),1540,76,[(text,15,30,(246,253,248),False)],(21,48,43,230),(21,48,43,230))
allcues=[(0,4.8,'领航云学堂：从盲目寻找，到有依据的家教匹配。'),*cues,(35.7,39.8,'不只是找到老师，更是找到适合的学习伙伴。')]
def srt_time(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
Path('subtitles/probe_01.srt').write_text('\n\n'.join(f'{i+1}\n{srt_time(s)} --> {srt_time(e)}\n{text}' for i,(s,e,text) in enumerate(allcues))+'\n',encoding='utf-8-sig')
# Smooth-step interpolation keeps the entire real page video continuous.
keys=[(0,1.0),(5,1.035),(7,1.075),(11,1.075),(12.5,1.25),(16.7,1.25),(19.3,1.1),(21,1.36),(30.3,1.40),(32.8,1.16),(35.8,1.08),(40,1.08)]
def curve(keys):
 expr=str(keys[-1][1])
 for (t0,v0),(t1,v1) in reversed(list(zip(keys,keys[1:]))):
  q=f'((on/30-{t0})/{t1-t0})';value=f'({v0}+({v1-v0})*{q}*{q}*(3-2*{q}))';expr=f'if(lt(on,{t1*30}),{value},{expr})'
 return expr
z=curve(keys)
filters=[f"[0:v]trim=start={offset:.3f}:duration=40,setpts=PTS-STARTPTS,fps=30,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,setsar=1[base]"]
overlays=[('disclosure',1440,110,0,40),('intro',235,837,0,4.8),*[(f'caption-{i}',190,978,s,e) for i,(s,e,_) in enumerate(cues)],('closing',185,846,35.7,39.8)]
inputs=['-i',raw]
for name,_,_,_,_ in overlays:inputs+=['-loop','1','-framerate','30','-i',f'assets/graphics/{name}.png']
last='base'
for i,(name,x,y,s,e) in enumerate(overlays,1):
 nxt=f'v{i}';filters.append(f"[{last}][{i}:v]overlay=x={x}:y={y}:enable='between(t,{s},{e})':eof_action=repeat[{nxt}]");last=nxt
filters.append(f'[{last}]fade=t=in:st=0:d=0.5,fade=t=out:st=39.2:d=0.8,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[final]')
Path('assets/camera-filter.txt').write_text(';\n'.join(filters),encoding='utf8')
silentIndex=1+len(overlays)
args=['-hide_banner','-y',*inputs,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-filter_complex_threads','2','-filter_complex_script','assets/camera-filter.txt','-map','[final]','-map',f'{silentIndex}:a','-t','40','-r','30','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-threads','4','-c:a','aac','-b:a','128k','-movflags','+faststart','exports/probe_01_match.mp4']
print('Rendering 40 seconds of actual recorded web interaction...',flush=True);r=run(args);Path('assets/render-log.txt').write_text(r.stderr,encoding='utf8')
metadata=run(['-hide_banner','-i','exports/probe_01_match.mp4'],False).stderr;Path('exports/media-info.txt').write_text(metadata,encoding='utf8')
decode=run(['-v','error','-i','exports/probe_01_match.mp4','-f','null','-']);
for name,t in [('01-opening',2.5),('02-real-click',19.25),('03-recommendation',25.5),('04-ending',37.2)]:run(['-y','-ss',str(t),'-i','exports/probe_01_match.mp4','-frames:v','1',f'screenshots/{name}.png'])
run(['-y','-i','exports/probe_01_match.mp4','-vf','fps=1,scale=160:90','assets/validation-frames/%02d.png'])
frames=[]
for f in sorted(Path('assets/validation-frames').glob('*.png')):
 im=Image.open(f).convert('RGB');mean=sum(ImageStat.Stat(im).mean)/3;frames.append({'second':int(f.stem)-1,'meanRGB':round(mean,2)})
facts={'width':1920,'height':1080,'fps':'30','duration':40,'codec':'H.264','pixelFormat':'yuv420p','audio':'silent AAC stereo 48kHz; reserved for voiceover','bytes':Path('exports/probe_01_match.mp4').stat().st_size,'rawDuration':rawduration,'rawTrimStart':round(offset,3),'decodeExit':decode.returncode,'sampledFrames':frames}
Path('validation.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in facts.items() if k!='sampledFrames'},ensure_ascii=False),flush=True)
