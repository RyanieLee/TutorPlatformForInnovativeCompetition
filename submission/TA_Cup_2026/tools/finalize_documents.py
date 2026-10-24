"""Build editable submission documents. Signatures remain local, original images unchanged.
Inputs: --output DIR [--identity private.json] [--signature-dir DIR]. Requires python-docx/Pillow.
PDF export: soffice --headless --convert-to pdf --outdir OUTPUT OUTPUT/*.docx
"""
from pathlib import Path
import argparse,re,json,hashlib,shutil
from datetime import datetime,timezone
from docx import Document
from docx.shared import Cm,Pt,RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
BASE=Path(__file__).resolve().parents[1]
SHORT='领航云学堂'
TITLE='领航云学堂——AI赋能的校园家教智能匹配与个性化学习服务平台'
SUMMARY='“领航云学堂”面向学生、家长与大学生家教，兼顾大学生教育实践支持，以“小书灵”AI伙伴入口连接需求整理、可解释匹配、预约教学与课后反馈。平台结合科目、时间、经验和费用公开推荐依据，提供学习笔记、自测练习及按配置启用的文字与图片辅导接口。教师可发布四节数学示范课程，记录逐题表现，核验反馈并修订下一课，保留历史版本；家长查看已确认成果。系统采用H5与微信小程序共享代码、Mock与开发API双模式。现已形成可运行原型与自动化验证；作业联动备课报告、长期学情档案和跨教师授权接续为后续规划，不将虚构案例或工程测试表述为真实教学成效。'
assert len(SUMMARY)<=300

def font(run,size=None,bold=None,color=None):
 run.font.name='Noto Serif CJK SC';run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Noto Serif CJK SC')
 if size:run.font.size=Pt(size)
 if bold is not None:run.bold=bold
 if color:run.font.color.rgb=RGBColor.from_string(color)
 return run

def init(title):
 d=Document();s=d.sections[0];s.page_width=Cm(21);s.page_height=Cm(29.7);s.top_margin=Cm(1.8);s.bottom_margin=Cm(1.8);s.left_margin=Cm(2.1);s.right_margin=Cm(2.1)
 st=d.styles['Normal'];st.font.name='Noto Serif CJK SC';st._element.rPr.rFonts.set(qn('w:eastAsia'),'Noto Serif CJK SC');st.font.size=Pt(11);st.paragraph_format.line_spacing=1.3;st.paragraph_format.space_after=Pt(5)
 for key,size in [('Title',19),('Heading 1',15),('Heading 2',12),('Heading 3',11)]:
  st=d.styles[key];st.font.name='Noto Sans CJK SC';st._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Noto Sans CJK SC');st.font.size=Pt(size);st.font.color.rgb=RGBColor.from_string('244E44')
 d.core_properties.title=title;d.core_properties.author='领航云学堂项目组';d.core_properties.comments='原始签名图片未改写；身份与官方模板待核对时仅作排版预览。';d.core_properties.modified=datetime.now(timezone.utc)
 return d

def paragraph(d,text,style=None,size=None,bold=None,align=None):
 p=d.add_paragraph(style=style);font(p.add_run(text),size,bold)
 if align is not None:p.alignment=align
 return p

def value(info,key):return info.get(key) or '【待补】'
def set_repeat_header(row):
 pr=row._tr.get_or_add_trPr();e=OxmlElement('w:tblHeader');pr.append(e)
def table_text(d,headers,rows):
 t=d.add_table(rows=1,cols=len(headers));t.style='Table Grid';t.autofit=False
 for cell,text in zip(t.rows[0].cells,headers):cell.text=text
 set_repeat_header(t.rows[0])
 for row in rows:
  cells=t.add_row().cells
  for cell,text in zip(cells,row):cell.text=text
 for row in t.rows:
  for cell in row.cells:
   cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   for p in cell.paragraphs:
    p.paragraph_format.space_after=Pt(4);p.paragraph_format.line_spacing=1.15
    for run in p.runs:font(run,10)
 return t

def intro(info,out):
 d=init('参赛作品简介表');d.styles['Normal'].paragraph_format.line_spacing=1.15;d.styles['Normal'].paragraph_format.space_after=Pt(4);p=paragraph(d,'参赛作品简介表','Title',align=WD_ALIGN_PARAGRAPH.CENTER)
 paragraph(d,'西安交通大学《电信T.A杯》“AI+教育”创新应用技能大赛',size=10,align=WD_ALIGN_PARAGRAPH.CENTER)
 rows=[('案例名称',info.get('workTitle') or TITLE),('所属赛道',value(info,'track')),('选题方向',value(info,'direction')),('团队名称',value(info,'team')),('所在高校（单位）',value(info,'school')),('团队负责人',value(info,'leader'))]
 table_text(d,['项目','填写内容'],rows)
 paragraph(d,'作者信息','Heading 2')
 names=info.get('signatureNames') or ['【成员1】','【成员2】','【成员3】','【成员4】']
 table_text(d,['成员','所在高校／学院'],[(n,info.get('affiliations',[value(info,'school')]*4)[i]) for i,n in enumerate(names)])
 paragraph(d,'教师成员：'+(info.get('teacherName') or '【待核对：学生为主体的团队须至少包含1名教师】'),size=9)
 paragraph(d,'联系人：'+value(info,'contact')+'　　电话：'+value(info,'phone'),size=10)
 paragraph(d,'电子邮箱：'+value(info,'email'),size=10)
 paragraph(d,'案例介绍（300字以内）','Heading 2');paragraph(d,SUMMARY,size=11)
 paragraph(d,'正文已与新版作品介绍统一；身份栏待按报名记录补齐。正式提交前须套用官网附件1模板。',size=8)
 d.save(out/'01a_参赛作品简介_内容校对版.docx')
 (out/'01a_案例介绍正文.txt').write_text(SUMMARY+'\n',encoding='utf-8')
 return {'summaryCharactersIncludingPunctuation':len(SUMMARY),'missingIdentityFields':[k for k in ['workTitle','track','team','school','leader','contact','phone','email','signatureNames'] if not info.get(k)]}

CROPS=[(110,205,1030,615),(155,295,660,505),(105,40,1245,650),(0,0,276,92)]
def picture_crop(p,path,box):
 # Word's own source-rectangle crop; the embedded JPEG remains byte-identical.
 with Image.open(path) as im:w,h=im.size
 l,t,r,b=box;r=min(r,w);b=min(b,h);ratio=(r-l)/(b-t);height=min(1.7,5.5/ratio);width=height*ratio
 shape=p.add_run().add_picture(str(path),width=Cm(width),height=Cm(height))
 fill=shape._inline.graphic.graphicData.pic.blipFill;rect=OxmlElement('a:srcRect')
 for key,n in [('l',l/w),('t',t/h),('r',(w-r)/w),('b',(h-b)/h)]:rect.set(key,str(round(n*100000)))
 fill.insert(1,rect)
 return {'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cropPixels':[l,t,r,b],'originalPixels':[w,h],'displayCm':[width,height]}

def pledge(info,out,signatures):
 d=init('参赛承诺书');paragraph(d,'参 赛 承 诺 书','Title',align=WD_ALIGN_PARAGRAPH.CENTER)
 paragraph(d,'西安交通大学《电信T.A杯》“AI+教育”创新应用技能大赛',size=10,align=WD_ALIGN_PARAGRAPH.CENTER)
 paragraph(d,'签名图片排版预览｜教师成员及官方模板待核对',size=8,align=WD_ALIGN_PARAGRAPH.CENTER)
 original=Document(BASE/'drafts/01b_参赛承诺书_待签字.docx');texts=[p.text for p in original.paragraphs]
 first=next(x for x in texts if x.startswith('本人____________'))
 work=info.get('workTitle') or SHORT
 first=first.replace('本人____________／本团队____________（团队名称）', '本团队'+(info.get('team') or '____________')+'（团队名称，负责人：'+(info.get('leader') or '____________')+'）').replace('《____________》','《'+work+'》')
 body=[first,next(x for x in texts if x.startswith('在作品开发过程中')),next(x for x in texts if x.startswith('本人（本团队）同时承诺'))]
 for text in body:
  p=paragraph(d,text,size=11);p.paragraph_format.first_line_indent=Cm(.7)
 paragraph(d,'特此声明！',size=11)
 paragraph(d,'参赛赛道：'+(info.get('track') or '________________________')+'　所在高校（单位）：'+(info.get('school') or '________________________'),size=10)
 paragraph(d,'选题方向：'+value(info,'direction'),size=10)
 paragraph(d,'声明人（团队负责人及全体成员签字）：',size=11,bold=True)
 table=d.add_table(rows=2,cols=2);table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
 sources=[]
 for i in range(4):
  cell=table.cell(i//2,i%2);cell.width=Cm(8.3);p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.alignment=WD_ALIGN_PARAGRAPH.LEFT
  label=(info.get('signatureNames') or ['签字1','签字2','签字3','签字4'])[i]
  font(p.add_run(label+'：'),9)
  picp=cell.add_paragraph();picp.paragraph_format.space_after=Pt(1)
  if signatures:
   path=signatures/f'{i+1}-照片-{i+1}.jpg'
   if not path.exists():raise FileNotFoundError(path)
   sources.append(picture_crop(picp,path,CROPS[i]))
  else:font(picp.add_run('________________________'),11)
 paragraph(d,'日期：'+(info.get('signingDate') or '________年________月________日'),size=11,align=WD_ALIGN_PARAGRAPH.RIGHT)
 name='01b_参赛承诺书_签名排版预览.docx' if signatures else '01b_参赛承诺书_未签名校对版.docx';d.save(out/name)
 if signatures:(out/'signature-provenance.private.json').write_text(json.dumps({'sources':sources,'processing':'Original JPEGs embedded byte-for-byte. OOXML source-rectangle cropping only; no generative reconstruction.','signingDateNotAssumed':not bool(info.get('signingDate')),'signingDate':info.get('signingDate')},ensure_ascii=False,indent=2)+'\n')
 return sources

def brochure(info,out):
 # Editable counterpart to the teammate's authoritative Markdown/PDF; wording preserved.
 md=(BASE/'02_作品介绍文档.md').read_text();d=init('作品介绍文档')
 normal=d.styles['Normal'];normal.font.size=Pt(10);normal.paragraph_format.line_spacing=1.18;normal.paragraph_format.space_after=Pt(5)
 lines=md.splitlines();i=0
 while i<len(lines):
  line=lines[i].strip();i+=1
  if not line:continue
  if line=='<!-- PAGE -->':d.add_page_break();continue
  if line.startswith('<!-- FLOW:'):
   labels=line[len('<!-- FLOW:'):].split('-->')[0].strip().split('|');t=d.add_table(rows=1,cols=len(labels))
   for cell,lab in zip(t.rows[0].cells,labels):
    cell.text=lab
    for p in cell.paragraphs:
     p.alignment=WD_ALIGN_PARAGRAPH.CENTER
     for r in p.runs:font(r,9,True,'246E70')
   d.add_paragraph();continue
  if line=='<!-- ARCH -->':
   table_text(d,['共享双端','统一服务层','开发后端'],[['H5／微信小程序','角色／预约归属校验\nMock／API双模式','Fastify\nPrisma／SQLite'],['本次为演示原型','模型适配器（按配置启用）','服务端保管密钥']]);continue
  if line.startswith('<!-- NOTE:'):
   txt=line[len('<!-- NOTE:'):].split('-->')[0].strip().replace('|','：',1);p=paragraph(d,txt,size=9);p.paragraph_format.space_before=Pt(3);continue
  if line.startswith('!['):
   match=re.match(r'!\[(.*?)\]\((.*?)\)',line)
   path=BASE/match[2]
   with Image.open(path) as im:w,h=im.size
   pic=d.add_paragraph();pic.alignment=WD_ALIGN_PARAGRAPH.CENTER;pic.add_run().add_picture(str(path),width=Cm(min(16,5.5*w/h)),height=Cm(min(5.5,16*h/w)))
   paragraph(d,match[1],size=8,align=WD_ALIGN_PARAGRAPH.CENTER);continue
  if line.startswith('|'):
   rows=[line]
   while i<len(lines) and lines[i].strip().startswith('|'):rows.append(lines[i].strip());i+=1
   cells=[[x.strip() for x in row.strip('|').split('|')] for row in rows];table_text(d,cells[0],[row for row in cells[1:] if not all(re.fullmatch(r'[-: ]+',x or '-') for x in row)]);continue
  if line.startswith('#'):
   level=len(line)-len(line.lstrip('#'));text=line[level:].strip();paragraph(d,text,'Title' if level==1 else 'Heading '+str(min(level-1,3)),align=WD_ALIGN_PARAGRAPH.CENTER if level==1 else None);continue
  is_keywords=line.startswith('**关键词**');line=re.sub(r'\*\*(.*?)\*\*',r'\1',line);paragraph(d,line,size=10)
  if is_keywords and info.get('school') and info.get('leader'):
   paragraph(d,'学校：'+info['school']+'　负责人：'+info['leader']+'　团队：'+info.get('team','【待补】'),size=10)
   paragraph(d,'所属赛道：'+info.get('track','【待补】')+'　选题方向：'+info.get('direction','【待补】'),size=10)
 d.core_properties.comments='基于chunxiaruo-commits提交3903f32的新版Markdown制作可编辑Word；官方PDF沿用该提交原件。'
 d.save(out/'02_作品介绍文档_整合定稿.docx')
 # The original teammate PDF remains available via Git commit 3903f32; no duplicate old-title PDF in the current bundle.
 shutil.copy2(BASE/'02_作品介绍文档.md',out/'02_作品介绍文档_整合定稿.md')

def main():
 a=argparse.ArgumentParser();a.add_argument('--output',type=Path,required=True);a.add_argument('--identity',type=Path);a.add_argument('--signature-dir',type=Path);args=a.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 info=json.loads(args.identity.read_text()) if args.identity else {}
 details=intro(info,args.output);pledge(info,args.output,args.signature_dir);brochure(info,args.output)
 (args.output/'build-status.json').write_text(json.dumps({'summary':details,'identityComplete':not details['missingIdentityFields'],'officialTemplatesVerified':False,'teacherRequirementConfirmed':bool(info.get('teacherRequirementConfirmed')),'otherDocumentsAssumption':'参赛作品简介 + 作品介绍文档；等待用户确认','teammateSource':'3903f325b07c3bc27a3974deddee1c7178a3dbf1','teammatePR':'https://github.com/RyanieLee/TutorPlatformForInnovativeCompetition/pull/40','signaturesEmbedded':bool(args.signature_dir),'status':'已确认报名字段已填；教师成员与官方模板待核对'},ensure_ascii=False,indent=2)+'\n')
 print(args.output,'summary chars',len(SUMMARY))
if __name__=='__main__':main()
