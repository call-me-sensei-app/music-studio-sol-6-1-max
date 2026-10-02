import {test} from 'node:test';import assert from 'node:assert/strict';
import {RestingCat} from '../src/cat-behavior.js';
test('cat yawns intermittently and never exceeds neck or jaw limits',()=>{
  const cat=new RestingCat();let yawn=false,rest=false,look=false;
  for(let i=0;i<7200;i++){const s=cat.update(1/60,Math.sin(i)*4,-1);for(const n of Object.values(s).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(n));assert.ok(s.mouth>=0&&s.mouth<=1);assert.ok(Math.abs(s.yaw)<=.8);assert.ok(s.pitch>=-.54&&s.pitch<=.38);yawn ||= s.yawning;rest ||= !s.watching;look ||= s.watching;}
  assert.ok(yawn&&rest&&look);
});
test('camera tracking is smoothed, conditional and frame-rate independent',()=>{
  const a=new RestingCat(),b=new RestingCat();a.wake();b.wake();
  for(let i=0;i<120;i++)a.update(1/60,.6,.1);
  for(let i=0;i<60;i++)b.update(1/30,.6,.1);
  assert.ok(Math.abs(a.yaw-b.yaw)<.005);assert.ok(a.yaw>.5);
  a.yawn();for(let i=0;i<90;i++)a.update(1/60,.6,.1);assert.ok(a.state.eyes<.05);assert.ok(a.state.mouth>.95);
});
