import {test} from 'node:test';import assert from 'node:assert/strict';import {parseMidi,tempoClock,guitarVoicing,originalScore} from '../src/score.js';
test('tempo map integrates changes rather than rescaling the whole score',()=>{const t=tempoClock([{tick:2,tempo:1000000}]);assert.equal(t(2),1);assert.equal(t(4),3);});
test('MIDI running status, note-off and velocity parse accurately',()=>{
  const bytes=new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,0,0,0,19,0,144,60,100,0,64,80,131,96,128,60,0,0,64,0,0,255,47,0]);
  const score=parseMidi(bytes);assert.equal(score.notes.length,2);assert.equal(score.notes[0].midi,60);assert.equal(score.notes[1].midi,64);assert.equal(score.duration,.5);assert.equal(score.notes[0].velocity,100/127);
});
test('guitar TAB string positions are retained and impossible chords are rejected',()=>{
  const s={notes:[{time:0,duration:1,midi:64,string:5,fret:0,finger:0},{time:0,duration:1,midi:48,string:1,fret:3,finger:3}]};const g=guitarVoicing(s);assert.equal(g.notes[0].string,5);assert.equal(g.notes[1].fret,3);assert.equal(g.inferred,false);
  assert.throws(()=>guitarVoicing({notes:[{time:0,duration:1,midi:20}]}),/outside/);
  assert.throws(()=>guitarVoicing({notes:Array.from({length:7},(_,i)=>({time:0,duration:1,midi:40+i}))}),/six/);
});
test('original demo has genuine note durations and chord voicings',()=>{const s=originalScore();assert.equal(s.notes.length,56);assert.ok(s.duration>20);assert.ok(s.notes.some(n=>n.duration>2));});
