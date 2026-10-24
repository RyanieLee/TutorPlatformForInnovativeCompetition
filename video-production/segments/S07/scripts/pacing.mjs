import {createHash} from 'node:crypto'
// Parse FFmpeg's cumulative counters into conservative time intervals. A counter
// transition happened since the preceding progress line, never after this one.
export function auditPacing(log,trimStart,duration=30){
 let previousTime=0,previousDup=0,previousDrop=0;const transitions=[]
 for(const line of log.replace(/\r/g,'\n').split('\n')){
  if(!/^frame=/.test(line))continue
  const match=line.match(/time=(\d+):(\d+):([\d.]+)/);if(!match)continue
  const time=Number(match[1])*3600+Number(match[2])*60+Number(match[3]),dup=Number(line.match(/dup=\s*(\d+)/)?.[1]??previousDup),drop=Number(line.match(/drop=\s*(\d+)/)?.[1]??previousDrop)
  if(dup>previousDup||drop>previousDrop)transitions.push({rawLowerSec:previousTime,rawUpperSec:time,duplicateDelta:dup-previousDup,dropDelta:drop-previousDrop,outsideUsedInterval:time<trimStart||previousTime>trimStart+duration})
  previousTime=time;previousDup=dup;previousDrop=drop
 }
 return{logSha256:createHash('sha256').update(log).digest('hex'),rawTrimStartSec:trimStart,usedRawEndSec:trimStart+duration,rawDuplicateFrames:previousDup,rawDroppedFrames:previousDrop,transitions,noPacingCorrectionInUsedInterval:transitions.every(t=>t.outsideUsedInterval),note:'Audit covers the actual selected segment footage; fixed crop, no animated zoom, cursor/outline emphasis only.'}
}
