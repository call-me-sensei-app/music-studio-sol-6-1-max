import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';
import {PROGRESSIONS,INTERVALS,newComposition,chordAt,chordNotes,guitarVoicing,snapToKey,compositionEvents,validateComposition} from '../src/composition.js';
import {fitGuitarNote,CompositionPlayer} from '../src/composition-player.js';
test('every preset, key and guitar voicing contains the labeled chord tones',()=>{
 for(const p of PROGRESSIONS)for(let key=0;key<12;key++)for(let i=0;i<p.chords.length;i++){
  const chord=chordAt({key,progression:p.id},i),allowed=new Set(INTERVALS[chord.quality].map(n=>(n+chord.root)%12)),frets=guitarVoicing(chord),pcs=[];
  for(let s=0;s<6;s++){if(frets[s]<0)continue;assert.ok(frets[s]<=22);const pc=([40,45,50,55,59,64][s]+frets[s])%12;assert.ok(allowed.has(pc),`${p.id}: ${key} ${chord.quality}, string ${s}`);pcs.push(pc);}
  for(const n of allowed)assert.ok(pcs.includes(n),`voicing omits ${n}`);
 }
});
test('melody and accompaniment can perform on multiple room instruments',()=>{
 const p=newComposition();p.tracks[0].notes.push({beat:0,midi:72,duration:1,velocity:.6});p.tracks[2].notes.push({beat:2,midi:67,duration:1,velocity:.7});const e=compositionEvents(p);assert.ok(e.some(n=>n.instrument==='keyboard'));assert.ok(e.some(n=>n.instrument==='guitar-0'));assert.ok(e.some(n=>n.instrument==='guitar-1'));assert.ok(e.every(n=>n.beat<p.bars*4));
});
test('key snapping and guitar octave fitting stay in playable ranges',()=>{
 for(let key=0;key<12;key++)for(let midi=21;midi<=108;midi++){const n=snapToKey(midi,key);assert.ok([0,2,4,5,7,9,11].includes(((n-key)%12+12)%12));const f=fitGuitarNote(midi);assert.ok(f&&f.fret>=0&&f.fret<=22);assert.equal(f.midi%12,midi%12);}
});
test('untrusted composition imports are bounded and normalized',()=>{
 const p=validateComposition({...newComposition(),bpm:999,bars:999,key:999,tracks:[{instrument:'keyboard',notes:[{beat:999,midi:999,duration:999,velocity:999}]}]});assert.equal(p.bpm,180);assert.equal(p.bars,128);assert.equal(p.key,11);assert.equal(p.tracks[0].notes[0].midi,108);assert.throws(()=>validateComposition({version:2,tracks:[]}));
});
test('composer queues audio-clock notes and stops only its own score groups',async()=>{
 const calls=[],audio={ready:true,ctx:{currentTime:0,state:'running'},resume:async()=>{},stopScore:g=>calls.push(['stop',g]),pianoOn:(...a)=>calls.push(['piano',...a]),pluck:(...a)=>calls.push(['pluck',...a])};
 const keys=Array.from({length:88},(_,i)=>({state:{midi:i+21},pivot:new THREE.Group(),isBlack:false})),keyboard={root:new THREE.Group(),keys,press(){},release(){}};
 const player=new CompositionPlayer({audio,keyboard,guitars:[{type:0,detunes:[0,0,0,0,0,0],vibrate(){}}]});const p=newComposition();p.tracks[0].notes.push({beat:0,midi:72,duration:1,velocity:.6});await player.play(p);audio.ctx.currentTime=.2;player.update();assert.ok(calls.some(c=>c[0]==='piano'&&Math.abs(c[4]-.6)<1e-9));assert.ok(calls.some(c=>c[0]==='pluck'));player.stop();assert.ok(!calls.some(c=>c[0]==='stop'&&c[1]==='score'));
});
test('cancelling shader preparation cancels the pending performance and restores its staging',async()=>{let finish,restored=0;const audio={ready:true,ctx:{currentTime:0,state:'running'},resume:async()=>{},stopScore(){}};const keyboard={root:new THREE.Group(),keys:[],press(){},release(){}};const player=new CompositionPlayer({audio,keyboard,guitars:[],prepare:()=>new Promise(r=>finish=r),onStop:()=>restored++});const pending=player.play(newComposition());await new Promise(r=>setTimeout(r,0));assert.equal(player.presenting,true);player.stop();finish();assert.equal(await pending,false);assert.equal(player.playing,false);assert.equal(restored,1);assert.equal(player.projection.root.visible,false);});
