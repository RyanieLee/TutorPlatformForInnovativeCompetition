from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
root=Path(__file__).resolve().parent.parent
out=root/'exports';out.mkdir(exist_ok=True)
font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
bg='#f6f3eb';green='#234d3a';muted='#607268'
def f(n,b=False):return ImageFont.truetype(bold if b else font,n)
def canvas():
 im=Image.new('RGB',(1920,1080),bg);return im,ImageDraw.Draw(im)
def text(d,xy,t,size=36,color=green,b=False):d.text(xy,t,font=f(size,b),fill=color)
def center(d,y,t,size=36,b=False):d.text((960,y),t,font=f(size,b),fill=green,anchor='mt')
def footer(d):center(d,1000,'源码与演示边界可核验 · 非生产部署 · 未调用真实模型',24)
def node(d,xy,wh,label,sub):
 x,y=xy;w,h=wh;d.rounded_rectangle((x,y,x+w,y+h),radius=20,fill='#e2ecdf',outline='#83a28b',width=2);d.text((x+w/2,y+30),label,font=f(34,True),fill=green,anchor='mt');d.text((x+w/2,y+95),sub,font=f(23),fill=muted,anchor='mt')
def arrow(d,a,b):
 d.line((a,b),fill='#648c73',width=5);x,y=b;d.polygon([(x,y),(x-15,y-9),(x-15,y+9)],fill='#648c73')
im,d=canvas();text(d,(128,70),'技术结构｜共享代码，区分运行模式',48,b=True)
for x,label,sub in [(128,'H5 / 小程序','uni-app · Vue 3 · TypeScript'),(712,'业务服务','同一契约 · Mock / API 适配'),(1296,'开发后端','Fastify API · Prisma · SQLite')]:node(d,(x,260),(496,180),label,sub)
arrow(d,(630,350),(705,350));arrow(d,(1215,350),(1290,350));text(d,(128,535),'本次录制：H5 → Mock 服务 → 当前浏览器本地存储',34,b=True);text(d,(128,620),'可选开发 API：共享前端 → Fastify → Prisma → SQLite',34);text(d,(128,735),'小程序构建已通过；微信真机与公网运营仍需另行验收。',30);footer(d);im.save(out/'architecture.png')
im,d=canvas();text(d,(128,70),'治理链路｜建议经过核验，才成为发布内容',46,b=True)
for x,label,sub in [(128,'辅助提议','模型可选 / 明示预置'),(552,'规则校验','结构 · 证据 · 45分钟'),(976,'教师核验','目标 · 题目 · 标准答案'),(1400,'历史版本','确认发布 v1 → v2')]:node(d,(x,300),(392,190),label,sub)
for x in [525,949,1373]:arrow(d,(x,395),(x+20,395))
center(d,610,'家长查看已发布内容；教师审定修改；API 校验预约归属',34,True);center(d,710,'本片实际使用预置样例，未连接或调用教学模型',31);footer(d);im.save(out/'governance.png')
im,d=canvas();text(d,(128,90),'当前已完成｜可运行、可核对的演示',48,b=True)
for i,(a,b) in enumerate([('可运行演示','Mock H5；本机数据，不是公网运营'),('四节课程','一元一次方程 · 4节×45分钟预置样例'),('三角色流程','家长预约 · 教师确认 · 管理员审核入口'),('可复现测试','本次 main 的构建、后端与 E2E 均通过')]):
 y=250+i*155;text(d,(165,y),'0'+str(i+1),36);text(d,(280,y),a,38,b=True);text(d,(280,y+57),b,29,color=muted)
footer(d);im.save(out/'completed.png')
im,d=canvas();text(d,(128,110),'下一阶段｜在真实场景检验价值',48,b=True)
for i,t in enumerate(['经授权的真实试点与教学效果验证','模型质量评测与错误分析','资质核验、隐私治理与安全机制']):text(d,(230,320+i*170),'→  '+t,42)
center(d,870,'这些是后续计划，尚不作为已完成成果。',28);im.save(out/'next.png')
im,d=canvas();brand=root/'evidence/actual-site-brand.png'
if brand.exists():
 pic=Image.open(brand).convert('RGB');pic.thumbnail((960,250));im.paste(pic,((1920-pic.width)//2,230))
center(d,560,'领航云学堂',76,True);center(d,680,'两个角色，同一条教学服务链',42);center(d,860,'虚构案例演示 · 感谢观看',28);im.save(out/'brand.png')
