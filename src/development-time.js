/** Task-boundary accounting, not time since page load or invented "editing" time. */
export function developmentIntervals(rows,sourceId,asOf){
 const end=Date.parse(asOf),open=new Map(),intervals=[];let unmatchedEnds=0;
 for(const row of rows){
  if(row.type!=='event_msg')continue;
  const p=row.payload||{},at=Date.parse(row.timestamp);if(!Number.isFinite(at)||at>end)continue;
  const id=p.turn_id||'unidentified-turn';
  if(p.type==='task_started'){
   // Some older logs omit IDs on abort. A new task supersedes any unmatched open task.
   for(const [key,start]of open){intervals.push({source_id:sourceId,start,end:at,closed_by:'next_task'});open.delete(key);}
   open.set(id,at);
  }else if(p.type==='task_complete'||p.type==='turn_aborted'){
   const key=open.has(id)?id:open.size===1?[...open.keys()][0]:null;
   if(key===null){unmatchedEnds++;continue;}
   intervals.push({source_id:sourceId,start:open.get(key),end:at,closed_by:p.type});open.delete(key);
  }
 }
 for(const start of open.values())intervals.push({source_id:sourceId,start,end,closed_by:'in_progress'});
 return{intervals,active:open.size>0,unmatched_ends:unmatchedEnds};
}

export function aggregateDevelopmentTime(sources,startedAt,asOf){
 const end=Date.parse(asOf),start=Date.parse(startedAt),intervals=sources.flatMap(s=>s.intervals).filter(i=>i.end>=i.start).sort((a,b)=>a.start-b.start),union=[];
 for(const i of intervals){const lo=Math.max(start,i.start),hi=Math.min(end,i.end);if(hi<lo)continue;const last=union.at(-1);if(last&&lo<=last.end)last.end=Math.max(last.end,hi);else union.push({start:lo,end:hi});}
 const active=union.reduce((n,i)=>n+i.end-i.start,0)/1000,elapsed=Math.max(0,(end-start)/1000);
 return{started_at:startedAt,as_of:asOf,active_seconds:active,elapsed_seconds:elapsed,idle_seconds:Math.max(0,elapsed-active),in_progress:sources.some(s=>s.active),method:'Union of logged task_started → task_complete / turn_aborted intervals. Overlapping agents count once; waiting within an active task is included.',unmatched_ends:sources.reduce((n,s)=>n+s.unmatched_ends,0),intervals:union.map(i=>({start:new Date(i.start).toISOString(),end:new Date(i.end).toISOString(),seconds:(i.end-i.start)/1000}))};
}

export function displayedDevelopmentSeconds(accounting,now=Date.now()){
 if(!accounting)return null;
 // Stop extrapolating if the ledger endpoint disappears; never resume a runaway wall clock.
 const extra=accounting.in_progress?Math.max(0,Math.min(30,(now-Date.parse(accounting.as_of))/1000)):0;
 return accounting.active_seconds+extra;
}
