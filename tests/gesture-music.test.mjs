import {test} from 'node:test';import assert from 'node:assert/strict';import {GestureMusic} from '../src/gesture-music.js';
// Synthetic landmark coordinates exercise interpretation only; not sensor evidence.
function hand(x=.4,y=.4){const h=Array.from({length:21},()=>({x,y,z:0}));h[5].x=x-.08;h[17].x=x+.08;h[4].x=x-.10;h[8].x=x+.10;return h;}
test('magic strums need deliberate center crossings and respect cooldown and pinch',()=>{
 const g=new GestureMusic();g.update([hand(.6)],0);let r=g.update([hand(.4)],350);assert.equal(r.events[0].type,'strum');r=g.update([hand(.6)],450);assert.equal(r.events.length,0);const pinch=hand(.4);pinch[4].x=pinch[8].x;r=g.update([pinch],1000);assert.equal(r.events.filter(e=>e.type==='strum').length,0);assert.equal(r.events[0].type,'mute');assert.equal(r.pinched,true);
});
test('direct finger notes use hysteresis, no retrigger while held, and release on tracking loss',()=>{
 const g=new GestureMusic(),h=hand(.4,.65);assert.equal(g.update([h],0,{mode:'direct'}).events.filter(e=>e.type==='on').length,5);assert.equal(g.update([h],100,{mode:'direct'}).events.length,0);h.forEach(p=>p.y=.58);assert.equal(g.update([h],200,{mode:'direct'}).events.length,0);assert.equal(g.update([],300,{mode:'direct'}).events.filter(e=>e.type==='off').length,5);
});
test('chord changes settle before selection, avoiding hand-height jitter',()=>{
 const g=new GestureMusic();g.update([hand(.6,.1)],0);assert.equal(g.chord,0);g.update([hand(.6,.1)],250);assert.equal(g.chord,3);g.update([hand(.6,.7)],300);assert.equal(g.chord,3);g.update([hand(.6,.7)],550);assert.equal(g.chord,1);
});
