import type {Course} from '../../../services/teaching-loop'
/** Non-course writes must never replace a teacher's unrelated unsaved edits. */
export function reconcileCourse(local:Course|null,dirty:boolean,incoming:Course|null,replace:boolean):{course:Course|null;dirty:boolean}{
 const keep=dirty&&!replace&&JSON.stringify(local)!==JSON.stringify(incoming)
 return keep?{course:local,dirty:true}:{course:incoming?JSON.parse(JSON.stringify(incoming)):null,dirty:false}
}
