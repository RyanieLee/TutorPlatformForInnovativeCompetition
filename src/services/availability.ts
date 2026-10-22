/** Weekly statements only; no day/period combinations across separate clauses. */
export const scheduleChoices=['一','二','三','四','五','六','日'].flatMap(day=>['上午','下午','晚上'].map(period=>'周'+day+period))
interface Slot{day:string;start:number;end:number;precise:boolean}
function slots(text:string):Slot[]{
 const found:Slot[]=[]
 const normalized=text.replace(/星期([一二三四五六日天])/g,'周$1').replace(/周天/g,'周日').replace(/周末|双休日/g,'周六周日').replace(/工作日/g,'周一周二周三周四周五').replace(/周([一二三四五六日])(?:至|到|[-—~～])周?([一二三四五六日])/g,(_,a:string,b:string)=>{
  const days='一二三四五六日',start=days.indexOf(a),end=days.indexOf(b)
  return start<=end?days.slice(start,end+1).split('').map(d=>'周'+d).join(''):''
 })
 for(const clause of normalized.split(/[，,;；\n]/)){
  if(/随时|灵活|均可|除|不|仅|或者|或/.test(clause))continue
  const pattern=/((?:周[一二三四五六日]\s*[、和与]?\s*)+)(上午|下午|晚上|全天|(\d{1,2})[:：](\d{2})\s*[-–—~～至到]\s*(\d{1,2})[:：](\d{2}))/g
  for(const match of clause.matchAll(pattern)){
   const period=match[2],precise=!!match[3]
   const ranges:Record<string,[number,number]>={上午:[6*60,12*60],下午:[12*60,18*60],晚上:[18*60,24*60],全天:[0,24*60]}
   if(precise&&(Number(match[4])>=60||Number(match[6])>=60))continue
   const [start,end]=precise?[Number(match[3])*60+Number(match[4]),Number(match[5])*60+Number(match[6])]:ranges[period]
   if(start<0||end>1440||end<=start)continue
   for(const day of match[1].matchAll(/周([一二三四五六日])/g))found.push({day:day[1],start,end,precise})
  }
 }
 return found
}
export function timeCompatibility(wanted:string,offered:string):{ratio:number;note:string}{
 const a=slots(wanted),b=slots(offered)
 if(!a.length)return {ratio:0,note:'未填写可比较的星期和时间，或含复杂限制，需双方确认'}
 const hits=a.filter(request=>b.some(offer=>request.day===offer.day&&(request.precise?offer.start<=request.start&&offer.end>=request.end:Math.max(offer.start,request.start)<Math.min(offer.end,request.end))))
 return {ratio:hits.length?1:0,note:hits.length?'空闲时间兼容：'+(hits.some(s=>s.precise)?'老师时段覆盖所选钟点':'所选时段与老师时间有交集')+'（需双方最终确认）':'老师未声明吻合的空闲时间，需双方确认'}
}
