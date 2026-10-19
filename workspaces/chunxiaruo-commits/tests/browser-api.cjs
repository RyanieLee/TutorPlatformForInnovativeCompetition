const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.B_H5_URL || 'http://127.0.0.1:5174',api=process.env.B_API_URL || 'http://127.0.0.1:3107',shots='workspaces/chunxiaruo-commits/docs/screenshots';
function password(role){const value=process.env['SEED_'+role.toUpperCase()+'_PASSWORD'];if(!value)throw new Error('请设置虚构演示账户的 SEED_*_PASSWORD 环境变量');return value;}
async function request(path,method='GET',token,body){const r=await fetch(api+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
const errors=[];const contexts=[];
async function account(role){const context=await browser.newContext({viewport:{width:1440,height:1100}});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',p.url(),e.stack)});await p.goto(base+'/#/pages/auth/login');await p.locator('input').nth(0).fill('demo.'+role);await p.locator('input').nth(1).fill(password(role));await p.getByText('登录开发账户',{exact:true}).click();await p.waitForURL(u=>!u.hash.includes('auth/login'));return p;}
const parent=await account('parent'),tutor=await account('tutor'),admin=await account('admin');
const tokens={};for(const role of ['parent','tutor','admin']){const r=await request('/api/auth/login','POST',null,{loginId:'demo.'+role,password:password(role)});assert.equal(r.status,200);tokens[role]=r.body.data.token;}
let fixture=(await request('/api/tutor-applications/mine','GET',tokens.tutor)).body.data;
if(fixture && fixture.status!=='approved'){
 if(fixture.status!=='pending'){
  const input={};for(const key of ['displayName','university','major','subjects','teachingMode','area','pricePerHour','introduction','availability'])input[key]=fixture[key];
  fixture=(await request('/api/tutor-applications','POST',tokens.tutor,input)).body.data;
 }
 assert.equal((await request('/api/admin/tutor-applications/'+fixture.id+'/review','POST',tokens.admin,{decision:'approved'})).status,200);
}
const go=async(p,path)=>{await p.goto(base+'/#/'+path);};
const text=(p,t)=>p.getByText(t,{exact:true});
const modal=(p,t)=>p.locator('.uni-modal__btn').filter({hasText:new RegExp('^'+t+'$')});
const field=(p,label)=>p.locator('.b-field').filter({hasText:label}).locator('input,textarea').first();
const teachers=await request('/api/tutors');const tutorId=teachers.body.data[0].id;
await go(parent,'pages/tutors/detail?id='+tutorId);await text(parent,'发起开发预约').click();
await parent.locator('.field').filter({hasText:'称呼'}).locator('input').fill('中文测试同学');
await parent.locator('.field').filter({hasText:'期望时间'}).locator('input').fill('周六下午两点');
await text(parent,'提交开发预约').click();await parent.waitForURL(/orders\/index/);
const list=await request('/api/bookings/mine','GET',tokens.parent);const booking=list.body.data[0];assert.equal(booking.status,'pending');
await go(tutor,'pages/tutor/booking-detail?id='+booking.id);await text(tutor,'接受预约').waitFor();let accepts=0;tutor.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/accept'))accepts++});
await text(tutor,'接受预约').click();await modal(tutor,'取消').click();assert.equal(accepts,0);
await tutor.locator('uni-button').filter({hasText:/^接受预约$/}).evaluate(el=>{el.click();el.click()});await modal(tutor,'确认').click();await text(tutor,'标记已完成').waitFor();assert.equal(accepts,1);
await go(parent,'pages/orders/index');await text(parent,'家教已接受').first().waitFor();
await text(tutor,'标记已完成').click();await modal(tutor,'确认').click();await text(tutor,'该预约已结束，仅可查看记录，不能继续处理。').waitFor();
await parent.reload();await text(parent,'预约已完成').first().waitFor();
assert.equal((await request('/api/bookings/'+booking.id+'/accept','POST',tokens.parent,{})).status,403);
await go(parent,'pages/admin/index');await text(parent,'当前身份不能访问此工作台').waitFor();
await go(tutor,'pages/tutor/application');await text(tutor,'修改并重新送审').waitFor();await field(tutor,'个人介绍').fill('这是通过开发接口验证重新审核的虚构教学介绍。');
const writes=[];tutor.on('request',r=>{if(['POST','PUT'].includes(r.method())&&r.url().includes('/tutor-applications'))writes.push(r.method()+' '+new URL(r.url()).pathname)});
await text(tutor,'修改并重新送审').click();await modal(tutor,'确认').click();await tutor.locator('.b-section').filter({hasText:/^申请已提交$/}).waitFor();assert.deepEqual(writes.slice(0,2),['PUT /api/tutor-applications/draft','POST /api/tutor-applications']);
await go(admin,'pages/admin/index');await text(admin,'查看并审核').click();await text(admin,'拒绝申请').click();await text(admin,'请填写拒绝原因，不能只填写空格。').waitFor();await field(admin,'拒绝原因').fill('请完善演示资料说明');await text(admin,'拒绝申请').click();await modal(admin,'确认').click();await text(admin,'申请已拒绝，家教可查看原因后重新提交。').waitFor();
await text(tutor,'刷新审核状态').click();await tutor.locator('.b-reason').filter({hasText:'请完善演示资料说明'}).waitFor();await text(tutor,'提交审核').click();await modal(tutor,'确认').click();await tutor.locator('.b-section').filter({hasText:/^申请已提交$/}).waitFor();
await go(admin,'pages/admin/index');await text(admin,'查看并审核').click();await text(admin,'批准申请').click();await modal(admin,'确认').click();await text(admin,'申请已通过审核。').waitFor();
const report=await request('/api/reports','POST',tokens.parent,{tutorId,reason:'资料不实',description:'这是虚构的中文演示举报。'});assert.equal(report.status,200);
await go(admin,'pages/admin/index');await text(admin,'标记已处理').first().click();await modal(admin,'确认').click();await text(admin,'举报已标记为已处理。').waitFor();await text(admin,'已处理').click();await text(admin,'这是虚构的中文演示举报。').first().waitFor();
await admin.screenshot({path:shots+'/api-admin-desktop.png',fullPage:true});
for(const width of [390,320]){await admin.setViewportSize({width,height:1000});assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await admin.screenshot({path:shots+'/api-admin-'+width+'.png',fullPage:true});}
await go(tutor,'pages/tutor/workbench');await text(tutor,'查看 / 编辑资料').waitFor();await tutor.screenshot({path:shots+'/api-tutor-desktop.png',fullPage:true});await tutor.setViewportSize({width:390,height:1000});await tutor.screenshot({path:shots+'/api-tutor-mobile.png',fullPage:true});
await go(tutor,'pages/tutor/application');await text(tutor,'修改并重新送审').waitFor();
// 故意模拟：保存草稿响应丢失，同时状态查询断网。页面不得继续猜测状态。
await tutor.route('**/api/tutor-applications/draft',async route=>{await route.fetch();await route.abort('failed')});await tutor.route('**/api/tutor-applications/mine',route=>route.abort('failed'));
await text(tutor,'保存草稿').click();await modal(tutor,'确认').click();await text(tutor,'状态待确认').waitFor({timeout:5000});
assert(await text(tutor,'保存草稿').evaluate(el=>el.hasAttribute('disabled')),'未知状态必须禁止继续提交');
await tutor.unroute('**/api/tutor-applications/draft');await tutor.unroute('**/api/tutor-applications/mine');await text(tutor,'刷新审核状态').click();await text(tutor,'审核状态：草稿').waitFor();
assert.deepEqual(errors,[]);fs.writeFileSync('workspaces/chunxiaruo-commits/.local/api/check.json',JSON.stringify({bookingId:booking.id,reportId:report.body.data.id,expectedStatus:'completed'},null,2));
console.log(JSON.stringify({mode:'api',result:'通过',checks:['家长界面创建预约','取消确认零请求','重复点击一次接受','家长刷新看到接受/完成','错误角色403与页面引导','已通过资料先草稿后送审','拒绝重提再批准','举报处理','桌面/390/320布局','丢失响应且查询失败时锁定状态','恢复查询'],pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
