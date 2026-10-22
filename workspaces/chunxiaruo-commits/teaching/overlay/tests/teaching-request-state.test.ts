import {it,expect,vi} from 'vitest'
import {createTeachingScope} from '../src/pages/teaching/shared/request-state'
it('logout-aborts-upload-clears-object-url and stale-response-ignored',()=>{
 let identity:string|null='parent-a';const release=vi.fn(),abort=vi.fn()
 const scope=createTeachingScope(()=>identity,release),operation=scope.begin()
 scope.trackAbort(abort);scope.trackUrl('blob:private');expect(operation.isCurrent()).toBe(true)
 identity='parent-b';expect(operation.isCurrent()).toBe(false)
 scope.invalidate();expect(abort).toHaveBeenCalledTimes(1);expect(release).toHaveBeenCalledWith('blob:private')
 scope.invalidate();expect(abort).toHaveBeenCalledTimes(1)
})
it('new read invalidates only previous response while explicit disposal releases uploads',()=>{
 const scope=createTeachingScope(()=> 'same'),old=scope.begin(),latest=scope.begin()
 expect(old.isCurrent()).toBe(false);expect(latest.isCurrent()).toBe(true)
 const abort=vi.fn(),untrack=scope.trackAbort(abort);untrack();scope.invalidate();expect(abort).not.toHaveBeenCalled()
})

