import {test} from 'node:test';import assert from 'node:assert/strict';
import {developmentIntervals,aggregateDevelopmentTime,displayedDevelopmentSeconds} from '../src/development-time.js';
const at=s=>new Date(s*1000).toISOString(),row=(type,t,id='a')=>({type:'event_msg',timestamp:at(t),payload:{type,turn_id:id}});
test('active task clock excludes gaps and unions overlapping agents',()=>{
 const main=developmentIntervals([row('task_started',10),row('task_complete',30),row('task_started',90,'b')],'main',at(100));
 const child=developmentIntervals([row('task_started',15),row('turn_aborted',25)],'child',at(100));
 const t=aggregateDevelopmentTime([main,child],at(0),at(100));assert.equal(t.active_seconds,30);assert.equal(t.idle_seconds,70);assert.equal(t.in_progress,true);assert.equal(t.intervals.length,2);
 assert.equal(displayedDevelopmentSeconds(t,105000),35);assert.equal(displayedDevelopmentSeconds(t,200000),60);
});
test('completed task clock stays stopped even when browser remains open',()=>{
 const s=developmentIntervals([row('task_started',0),row('task_complete',20)],'main',at(100));const t=aggregateDevelopmentTime([s],at(0),at(100));assert.equal(displayedDevelopmentSeconds(t,999000),20);assert.equal(t.elapsed_seconds,100);
});
test('unidentified abort closes only its single open task and duplicate end never adds time',()=>{
 const rows=[row('task_started',10,'x'),row('turn_aborted',20,undefined),row('task_complete',30,'x')];delete rows[1].payload.turn_id;
 const s=developmentIntervals(rows,'main',at(40));assert.equal(s.intervals[0].end,20000);assert.equal(s.unmatched_ends,1);assert.equal(s.active,false);
});
