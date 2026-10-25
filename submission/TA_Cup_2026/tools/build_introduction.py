"""Build the submission PDF from the editable Markdown source.

Requires reportlab and Pillow. Chinese TrueType collection paths can be
supplied with --font and --bold-font. The application has no dependency on
this document-only build helper.
"""
from pathlib import Path
import argparse
import html
import re
from io import BytesIO

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, Flowable, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[1]
INK = colors.HexColor('#183544')
GREEN = colors.HexColor('#246e70')
GRAY = colors.HexColor('#536773')
PALE = colors.HexColor('#eef5f5')
WIDTH = A4[0] - 104


def rich(text):
    text = html.escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Link labels remain readable in print; URLs stay in the editable source.
    text = re.sub(r'https://[^\s<]+', lambda m:
        '<link href="' + m[0] + '" color="#246e70">' +
        ('GitHub Actions 验证记录' if '/actions/runs/' in m[0] else 'GitHub 项目仓库') + '</link>', text)
    return text


class Flow(Flowable):
    def __init__(self, labels, styles):
        super().__init__()
        self.labels, self.styles = labels, styles
        self.width, self.height = WIDTH, 63

    def draw(self):
        c = self.canv
        gap = 12
        w = (self.width - gap * (len(self.labels) - 1)) / len(self.labels)
        for i, label in enumerate(self.labels):
            x = i * (w + gap)
            c.setFillColor(PALE)
            c.roundRect(x, 11, w, 43, 7, fill=1, stroke=0)
            p = Paragraph(rich(label), self.styles['flow'])
            _, h = p.wrap(w - 12, 40)
            p.drawOn(c, x + 6, 11 + (43 - h) / 2)
            if i:
                c.setStrokeColor(GREEN)
                c.setLineWidth(.8)
                c.line(x - gap + 2, 32, x - 2, 32)
                c.line(x - 5, 35, x - 2, 32)
                c.line(x - 5, 29, x - 2, 32)


class Note(Flowable):
    def __init__(self, title, text, styles):
        super().__init__()
        self.width = WIDTH
        self.paragraph = Paragraph('<b>' + rich(title) + '</b>　' + rich(text), styles['note'])
        _, self.inner_h = self.paragraph.wrap(WIDTH - 24, 1000)
        self.height = self.inner_h + 26

    def draw(self):
        c = self.canv
        c.setFillColor(PALE)
        c.roundRect(0, 5, self.width, self.height - 10, 7, fill=1, stroke=0)
        self.paragraph.drawOn(c, 12, 13)


class Architecture(Flowable):
    def __init__(self, styles):
        super().__init__()
        self.width, self.height = WIDTH, 104
        self.styles = styles

    def draw(self):
        c = self.canv
        for x, y, w, title in [
            (0, 59, 145, 'H5／微信小程序'),
            (173, 59, 145, '统一服务与权限校验'),
            (346, 59, 145, 'Fastify 开发API'),
            (173, 5, 145, '模型适配器'),
            (346, 5, 145, 'Prisma／SQLite开发库'),
        ]:
            c.setFillColor(PALE)
            c.roundRect(x, y, w, 35, 6, fill=1, stroke=0)
            p = Paragraph(title, self.styles['flow'])
            _, h = p.wrap(w - 8, 32)
            p.drawOn(c, x + 4, y + (35 - h) / 2)
        c.setStrokeColor(GREEN)
        c.setLineWidth(.8)
        for a, b in [(145, 173), (318, 346)]:
            c.line(a + 3, 77, b - 3, 77)
            c.line(b - 6, 80, b - 3, 77)
            c.line(b - 6, 74, b - 3, 77)
        for x in [245, 418]:
            c.line(x, 59, x, 40)
            c.line(x - 3, 43, x, 40)
            c.line(x + 3, 43, x, 40)


def build(font, bold_font, output):
    pdfmetrics.registerFont(TTFont('CJK', str(font), subfontIndex=0))
    pdfmetrics.registerFont(TTFont('CJK-Bold', str(bold_font), subfontIndex=0))
    pdfmetrics.registerFontFamily('CJK', normal='CJK', bold='CJK-Bold', italic='CJK', boldItalic='CJK-Bold')
    styles = {
        'body': ParagraphStyle('body', fontName='CJK', fontSize=10.5, leading=17.3, spaceAfter=9, textColor=INK, wordWrap='CJK'),
        'title': ParagraphStyle('title', fontName='CJK-Bold', fontSize=30, leading=39, textColor=colors.black, spaceAfter=7),
        'subtitle': ParagraphStyle('subtitle', fontName='CJK', fontSize=15, leading=23, textColor=colors.black, spaceAfter=10),
        'meta': ParagraphStyle('meta', fontName='CJK', fontSize=9.7, leading=16, textColor=GRAY, spaceAfter=9),
        'h1': ParagraphStyle('h1', fontName='CJK-Bold', fontSize=18.5, leading=26, spaceBefore=5, spaceAfter=12, textColor=colors.black, keepWithNext=True),
        'h2': ParagraphStyle('h2', fontName='CJK-Bold', fontSize=12.2, leading=20, spaceBefore=8, spaceAfter=6, textColor=colors.black, keepWithNext=True),
        'cell': ParagraphStyle('cell', fontName='CJK', fontSize=9.6, leading=15.5, textColor=INK, wordWrap='CJK'),
        'th': ParagraphStyle('th', fontName='CJK-Bold', fontSize=9.7, leading=15.5, textColor=colors.white, wordWrap='CJK'),
        'caption': ParagraphStyle('caption', fontName='CJK', fontSize=8.7, leading=14, textColor=GRAY, spaceBefore=4, spaceAfter=10),
        'note': ParagraphStyle('note', fontName='CJK', fontSize=9.2, leading=15.2, textColor=INK, wordWrap='CJK'),
        'flow': ParagraphStyle('flow', fontName='CJK-Bold', fontSize=9.6, leading=15, textColor=INK, alignment=TA_CENTER, wordWrap='CJK'),
    }
    lines = (ROOT / '02_作品介绍文档.md').read_text(encoding='utf-8').splitlines()
    story = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if not line:
            continue
        if line == '<!-- PAGE -->':
            story.append(PageBreak())
        elif line.startswith('<!-- FLOW: '):
            story.append(Flow(line[len('<!-- FLOW: '):-len(' -->')].split('|'), styles))
        elif line == '<!-- ARCH -->':
            story.append(Architecture(styles))
        elif line.startswith('<!-- NOTE: '):
            title, text = line[len('<!-- NOTE: '):-len(' -->')].split('|', 1)
            story.append(Note(title, text, styles))
        elif line.startswith('!['):
            caption, path = re.match(r'!\[(.*?)\]\((.*?)\)', line).groups()
            path = ROOT / path
            image_source = str(path)
            with PILImage.open(path) as img:
                if 'assistant' in path.stem:
                    # Focus the actual dialogue panel; retain the original screenshot.
                    img = img.crop((60, 120, 970, 712))
                    image_source = BytesIO()
                    img.save(image_source, format='PNG')
                    image_source.seek(0)
                w, h = img.size
            cap_h = 208 if 'home' in path.stem else 265
            ratio = min(WIDTH / w, cap_h / h)
            picture = Image(image_source, w * ratio, h * ratio)
            picture.hAlign = 'CENTER'
            story.append(KeepTogether([picture, Paragraph(rich(caption), styles['caption'])]))
        elif line.startswith('|'):
            rows = [line]
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip())
                i += 1
            values = [[c.strip() for c in r.strip('|').split('|')] for r in rows]
            values = [r for r in values if not all(re.fullmatch(r':?-+:?', c) for c in r)]
            cells = [[Paragraph(rich(c), styles['th' if ri == 0 else 'cell']) for c in r] for ri, r in enumerate(values)]
            widths = [WIDTH * .29, WIDTH * .71] if len(cells[0]) == 2 else [WIDTH * .29, WIDTH * .29, WIDTH * .42]
            table = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), GREEN),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 9),
                ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f1f6f6'), colors.white]),
                ('LINEBELOW', (0, -1), (-1, -1), .5, colors.HexColor('#d6e3e5')),
            ]))
            story.extend([table, Spacer(1, 11)])
        else:
            style = 'body'
            if line.startswith('### '):
                line, style = line[4:], 'h2'
            elif line.startswith('## '):
                line, style = line[3:], 'h1'
            elif line.startswith('# '):
                line, style = line[2:], 'title'
            elif line in {'云伴学驱动的一站式个性化学习服务平台','AI赋能的校园家教智能匹配与个性化学习服务平台'}:
                style = 'subtitle'
            elif line.startswith('作品介绍文档'):
                style = 'meta'
            story.append(Paragraph(rich(line), styles[style]))

    def page_chrome(canvas, doc):
        canvas.saveState()
        canvas.setFont('CJK', 8.5)
        canvas.setFillColor(GRAY)
        if doc.page > 1:
            canvas.drawString(52, A4[1] - 30, '领航云学堂  作品介绍')
        canvas.drawString(52, 27, 'AI伴学 · 智能师生匹配 · 学情分析 · 个性化训练 · 学情档案')
        canvas.drawRightString(A4[0] - 52, 27, str(doc.page))
        canvas.restoreState()

    pdf = SimpleDocTemplate(str(output), pagesize=A4,
        leftMargin=52, rightMargin=52, topMargin=49, bottomMargin=47,
        title='领航云学堂作品介绍', author='领航云学堂项目组',
        subject='AI赋能的校园家教智能匹配与个性化学习服务平台')
    pdf.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    print('Created', output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--font', type=Path, default=Path('C:/Windows/Fonts/msyh.ttc'))
    parser.add_argument('--bold-font', type=Path, default=Path('C:/Windows/Fonts/msyhbd.ttc'))
    parser.add_argument('--output', type=Path, default=ROOT / '02_作品介绍文档.pdf')
    args = parser.parse_args()
    build(args.font, args.bold_font, args.output)
