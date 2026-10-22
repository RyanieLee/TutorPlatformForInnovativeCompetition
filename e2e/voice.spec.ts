import {test,expect} from '@playwright/test'
test('语音问答：识别后自动匹配、使用说明、朗读和权限失败',async({page},info)=>{
 await page.addInitScript(()=>{
  (window as any).SpeechRecognition=class{
   lang='';continuous=false;interimResults=false;onresult:any;onerror:any;onend:any
   start(){const text=(window as any).__speechText;if(text==='DENIED')this.onerror?.({error:'not-allowed'});else this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:text}}]});this.onend?.()}
   abort(){}
  }
  ;(window as any).__speechText='请帮我匹配初中数学，预算100元，线上，周六下午'
  ;(window as any).__spoken=[]
  Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(s:any){(window as any).__spoken.push(s.text)}}})
  ;(window as any).SpeechSynthesisUtterance=class{constructor(public text:string){}lang=''}
 })
 await page.route('**/api/assistant/status',r=>r.fulfill({json:{data:{enabled:false}}}))
 await page.route('https://server.arcgisonline.com/**',r=>r.abort())
 await page.goto('/#/pages/index/index');await page.locator('.companion-launcher').click()
 await expect(page).toHaveURL(/pages\/assistant\/index/)
 await expect(page.locator('.companion-source')).toContainText('本机演示')
 const button=(text:string)=>page.locator('uni-button').filter({hasText:text})
 await button('开启语音朗读').click();await button('语音提问').click()
 await expect(page).toHaveURL(/pages\/match\/index/)
 await expect(page.locator('.match-card').first()).toBeVisible()
 await expect(page.locator('.results')).toContainText('初中（演示）')
 await expect(page.locator('.results')).toContainText('空闲时间')
 await page.locator('.companion-launcher').click()
 await expect(page.locator('.companion-source')).toContainText('本机演示')
 await button('开启语音朗读').click()
 await page.evaluate(()=>{(window as any).__speechText='怎么查看订单地图'})
 await button('语音提问').click();await expect(page.locator('.companion-message.assistant').last()).toContainText('每10秒刷新')
 expect(await page.evaluate(()=>(window as any).__spoken.some((t:string)=>t.includes('每10秒刷新')))).toBe(true)
 await page.evaluate(()=>{(window as any).__speechText='DENIED'})
 await button('语音提问').click();await expect(page.getByText('麦克风权限未开启',{exact:false})).toBeVisible()
 await page.screenshot({path:`docs/screenshots/voice-${info.project.name}.png`,fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
