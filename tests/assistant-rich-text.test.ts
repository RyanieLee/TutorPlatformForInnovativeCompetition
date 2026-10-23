// @vitest-environment jsdom
import {describe,it,expect} from 'vitest'
import {renderAssistantRichText} from '../src/utils/assistant-rich-text'
const dom=(source:string)=>{const node=document.createElement('div');node.innerHTML=renderAssistantRichText(source);return node}
describe('AI Markdown 与数学公式',()=>{
 it('将标题、加粗、列表、表格和代码块转换为可读结构',()=>{
  const node=dom('## 二元一次方程组\n\n**消元法**\n\n1. 先消去 x\n2. 再求 y\n\n|x|y|\n|-|-|\n|2|1|\n\n```js\nconst x = 2 < 3\n```')
  expect(node.querySelector('h2')?.textContent).toBe('二元一次方程组')
  expect(node.querySelector('strong')?.textContent).toBe('消元法')
  expect(node.querySelectorAll('ol li')).toHaveLength(2)
  expect(node.querySelector('table')).not.toBeNull();expect(node.querySelector('pre code')?.textContent).toContain('2 < 3')
 })
 it.each(['$x^2+\\frac{1}{2}$','\\(x^2+\\frac{1}{2}\\)'])('渲染行内公式 %s，并保留可访问的 MathML',source=>{
  const node=dom(source);expect(node.querySelector('.katex')).not.toBeNull();expect(node.querySelector('math')).not.toBeNull();expect(node.querySelector('.katex-error')).toBeNull()
 })
 it.each(['$$\n\\begin{cases}2x+y=5\\\\x-y=1\\end{cases}\n$$','\\[\n\\begin{cases}2x+y=5\\\\x-y=1\\end{cases}\n\\]'])('渲染多行方程组 %s',source=>{
  const node=dom(source);expect(node.querySelector('.katex-display')).not.toBeNull();expect(node.querySelector('.katex-error')).toBeNull()
 })
 it('代码里的公式保持原样，金额不误判为公式',()=>{
  const node=dom('`$x^2$`\n\n价格 $100 和 $200。');expect(node.querySelector('code')?.textContent).toBe('$x^2$');expect(node.querySelector('.katex')).toBeNull()
 })
 it('错误及未闭合公式不使消息消失',()=>{
  expect(()=>dom('结果 $\\notARealCommand{x}$，再检查。')).not.toThrow()
  expect(dom('继续看：\\[x+y=3').textContent).toContain('x+y=3')
 })
 it('安全过滤后根号 SVG 路径和数学布局属性仍保留',()=>{
  const node=dom('$$\\sqrt{x^2+y^2}$$');expect(node.querySelector('svg path')?.getAttribute('d')).toBeTruthy();expect(node.querySelector('math')?.getAttribute('display')).toBe('block')
 })
 it('模型不能执行 HTML、脚本或加载追踪图片，危险公式链接不会生效',()=>{
  const node=dom('<script>alert(1)</script>\n<img src="https://tracker.invalid/pixel" onerror="alert(1)">\n![alt](https://tracker.invalid/pixel)\n[x](javascript:alert(1))\n$\\href{javascript:alert(1)}{x}$')
  expect(node.querySelector('script,img,iframe')).toBeNull()
  expect(node.querySelector('[onerror],[onclick],[href^="javascript:"]')).toBeNull()
 })
 it('普通外链带隔离属性',()=>{
  const link=dom('[官方文档](https://example.com/docs)').querySelector('a')
  expect(link?.getAttribute('target')).toBe('_blank');expect(link?.getAttribute('rel')).toContain('noopener')
 })
})
