import {test} from 'node:test';import assert from 'node:assert/strict';
import {newComposition,validateComposition,activeInstruments,mainInstrument,snapToKey,PROGRESSIONS} from '../src/composition.js';
import {scoreLanes,extendScore,quantizeHum} from '../src/music-sheet.js';import {detectHum,HumSegmenter} from '../src/humming.js';import {cameraPlayMarkup,cameraSourceNotice} from '../src/camera-play-view.js';import QRCode from 'qrcode';import {tourComposition,TOUR_ENTRANCES} from '../src/tour-score.js';
test('four synchronized score lanes include notes and the correct instrument accompaniment',()=>{
 const p=newComposition();p.tracks[0].notes.push({id:'a',beat:0,midi:60,duration:1,velocity:.6});p.tracks[2].notes.push({id:'b',beat:3,midi:67,duration:1,velocity:.6});const lanes=scoreLanes(p);assert.equal(lanes.length,4);assert.ok(lanes.every(l=>l.startBeat===0&&l.endBeat===16));assert.equal(lanes[0].notes.length,1);assert.equal(lanes[2].notes.length,1);assert.ok(lanes[1].backing.length>0);assert.ok(lanes[1].backing.every(e=>e.midis.length>=3));assert.equal(lanes[3].backing.length,0);
});
test('extended songs page correctly, preserve notes, and remain bounded',()=>{
 const p=newComposition();p.tracks[0].notes.push({id:'later',beat:40,midi:72,duration:2,velocity:.6});extendScore(p,12);assert.equal(p.bars,16);assert.equal(scoreLanes(p,8)[0].notes[0].id,'later');for(let i=0;i<100;i++)extendScore(p);assert.equal(p.bars,128);const loaded=validateComposition(p);assert.equal(loaded.bars,128);assert.equal(loaded.tracks[0].notes[0].beat,40);
});
test('main instrument choices include only active parts, with distinct supporting instruments',()=>{
 const p=newComposition();assert.equal(mainInstrument(p),'guitar-0');p.tracks[0].notes.push({beat:0,midi:60,duration:1});p.tracks[2].notes.push({beat:0,midi:60,duration:1});p.lead='guitar-1';assert.equal(mainInstrument(p),'guitar-1');assert.deepEqual(activeInstruments(p),['keyboard','guitar-1','guitar-0']);assert.equal(validateComposition(p).lead,'guitar-1');
});
test('monophonic hum detector recognizes pitched signals and rejects silence/noise',()=>{
 const sr=48000;for(const hz of[110,220,261.626,440,660,880]){const wave=Float32Array.from({length:2048},(_,i)=>.25*Math.sin(2*Math.PI*hz*i/sr)+.08*Math.sin(4*Math.PI*hz*i/sr));const found=detectHum(wave,sr);assert.ok(found,`no pitch for ${hz}`);assert.ok(Math.abs(1200*Math.log2(found.hz/hz))<10,`${hz} -> ${found.hz}`);assert.ok(found.confidence>.8);}assert.equal(detectHum(new Float32Array(2048),sr),null);let seed=718;const noise=Float32Array.from({length:2048},()=>{seed=seed*16807%2147483647;return(seed/2147483647-.5)*.2;});assert.equal(detectHum(noise,sr),null);
});
test('hummed notes need stable pitch, close on a gap, quantize timing and snap into the key',()=>{
 const s=new HumSegmenter();s.update({midi:60.2,confidence:.95},0);s.update({midi:60.1,confidence:.95},.067);s.update({midi:60.0,confidence:.95},.134);s.update({midi:60.2,confidence:.95},.60);s.update(null,.9);s.update({midi:61,confidence:.96},1);s.update({midi:61.1,confidence:.96},1.067);s.update({midi:61.1,confidence:.96},1.134);const notes=s.stop(1.7),quantized=quantizeHum(notes,{startBeat:16,bpm:120,key:0,snap:true,snapNote:snapToKey});assert.equal(notes.length,2);assert.equal(quantized[0].beat,16);assert.equal(quantized[1].beat,18);assert.equal(quantized[1].midi,60);assert.ok(quantized.every(n=>n.duration>=.25&&n.duration*4%1===0));
});
test('hands panel starts with mutually exclusive sources and optional disabled recording',()=>{
 const html=cameraPlayMarkup();for(const source of ['computer','phone','pad'])assert.ok(html.includes(`data-source="${source}"`));assert.ok(html.includes('id="hands-phone" role="tabpanel" aria-labelledby="source-phone" hidden'));assert.ok(html.includes('id="hands-pad" role="tabpanel" aria-labelledby="source-pad" hidden'));assert.ok(html.includes('id="camera-record" disabled'));assert.ok(cameraSourceNotice('phone',false).includes('both devices'));assert.ok(!html.includes('Record room + performer + studio audio'));
});
test('a real private fragment pairing link fits a locally generated QR without a third-party service',()=>{
 const url='https://studio.example/phone.html#id='+'a'.repeat(32)+'&token='+'b'.repeat(48),qr=QRCode.create(url,{errorCorrectionLevel:'M'});assert.ok(qr.modules.size>=21);assert.ok(qr.modules.data.some(n=>n===1));assert.ok(qr.modules.data.some(n=>n===0));
});
test('musical tour uses an original shared-key progression, tempo and staged entrances',()=>{
 const p=tourComposition();assert.equal(p.bpm,86);assert.equal(p.progression,'fifties');assert.equal(p.backing,'guitar-0');assert.equal(p.loop,false);assert.ok(p.tracks[0].notes.length>60);assert.ok(TOUR_ENTRANCES['guitar-0']<TOUR_ENTRANCES.keyboard);assert.ok(PROGRESSIONS.find(x=>x.id===p.progression));
});
test('arpeggio accompaniment picks one real string per pulse instead of strumming six strings',async()=>{const {compositionEvents}=await import('../src/composition.js');const p=newComposition();p.rhythm='arpeggio';const events=compositionEvents(p);assert.ok(events.length>16);assert.ok(events.every(e=>e.string>=0&&e.string<=5&&e.fret>=0));assert.ok(new Set(events.slice(0,8).map(e=>e.string)).size>=4);const lanes=scoreLanes(p);assert.ok(lanes[1].backing.every(e=>e.midis.length===1));});
test('notes sustained across a system boundary remain visible on the following page',()=>{const p=newComposition();p.bars=8;p.tracks[0].notes.push({id:'tie',beat:15,midi:60,duration:3,velocity:.5});assert.equal(scoreLanes(p,4)[0].notes[0].id,'tie');});
