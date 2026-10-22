import {it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({hides:[] as (()=>void)[],restore:vi.fn()}))
vi.mock('@dcloudio/uni-app',()=>({onHide:(fn:()=>void)=>state.hides.push(fn),onUnload:()=>{}}))
vi.mock('../src/utils/session',async()=>{const {shallowRef}=await import('vue');const currentSession=shallowRef<any>(null);return{currentSession,restoreSession:()=>state.restore(),canAccess:(roles:string[])=>roles.includes(currentSession.value?.user.role)}})
import {currentSession} from '../src/utils/session'
import {useTeachingPage,inputTime} from '../src/pages/teaching/shared/page'
it('a hidden page cannot begin applying a response after initial session restoration',async()=>{
 let finish!:()=>void
 state.restore.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
 const page=useTeachingPage(()=>{}),fetcher=vi.fn(async()=> 'private'),apply=vi.fn()
 const loading=page.load(fetcher,apply)
 state.hides.forEach(fn=>fn())
 ;(currentSession as any).value={mode:'server',user:{id:'student',role:'parent'}}
 finish();await loading
 expect(fetcher).not.toHaveBeenCalled();expect(apply).not.toHaveBeenCalled()
})
it('local input rejects impossible dates and includes a timezone when serialized',()=>{
 expect(()=>inputTime('2026-02-30 10:00')).toThrow('日期或时间无效')
 expect(inputTime('',true)).toBe(null)
 expect(inputTime('2026-10-22 18:00')).toBe(new Date(2026,9,22,18,0).toISOString())
})

