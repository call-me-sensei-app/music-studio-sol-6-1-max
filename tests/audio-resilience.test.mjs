import {test} from 'node:test';import assert from 'node:assert/strict';
import {StudioAudio,RECORDS} from '../src/audio.js';import {compose,composeAsync} from '../src/music.js';
class WorkerStub{postMessage(message){this.last=message;}terminate(){this.terminated=true;}}
const pcm={data:new Float32Array([0,.2,-.2,0]),sampleRate:22050};
test('worker failure falls back to original local PCM instead of leaving an unresolved promise',async()=>{
 const w=new WorkerStub(),audio=new StudioAudio({workerFactory:()=>w,fallbackGenerator:async()=>pcm});w.onerror({message:'worker unavailable'});const b=await audio.generate(RECORDS[0]);assert.equal(b,pcm);assert.equal(audio.generationBackend,'cooperative-main');assert.equal(audio.pending.size,0);assert.equal(audio.buffers.size,1);audio.dispose();
});
test('a stuck record worker has a bounded timeout and cannot lock subsequent generations',async()=>{
 const audio=new StudioAudio({workerFactory:()=>new WorkerStub(),generationTimeout:8,fallbackGenerator:async()=>pcm});assert.equal(await audio.generate(RECORDS[0]),pcm);assert.equal(await audio.generate(RECORDS[1]),pcm);assert.equal(audio.workerJobs.size,0);assert.equal(audio.pending.size,0);audio.dispose();
});
test('fallback yields to the game while producing identical master samples',async()=>{
 const record={id:'blue',duration:15,bpm:86,root:60};let yields=0;const expected=compose(record),actual=await composeAsync(record,0,{yieldTask:async()=>{yields++;}});assert.ok(yields>=2);assert.deepEqual(actual.data,expected.data);await assert.rejects(composeAsync(record,0,{cancelled:()=>true}),/cancelled/);
});
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
const node=()=>({gain:param(),threshold:param(),ratio:param(),attack:param(),release:param(),frequency:param(),Q:param(),connect(){},disconnect(){}});
test('keyboard/audio graph starts even if the vinyl worklet has not finished loading',async()=>{
 let finishWorklet;const old=globalThis.AudioContext;
 globalThis.AudioContext=class{constructor(){this.state='suspended';this.sampleRate=8000;this.currentTime=0;this.destination=node();this.audioWorklet={addModule:()=>new Promise(resolve=>finishWorklet=resolve)};}resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}createGain(){return node();}createDynamicsCompressor(){return node();}createMediaStreamDestination(){return {...node(),stream:{}};}createAnalyser(){return node();}createConvolver(){return node();}createBuffer(ch,len){const channels=Array.from({length:ch},()=>new Float32Array(Math.floor(len)));return{getChannelData:i=>channels[i]};}};
 const audio=new StudioAudio({workerFactory:()=>new WorkerStub(),fallbackGenerator:async()=>pcm});try{await Promise.race([audio.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Audio initialization still waits for record assets')),200))]);assert.equal(audio.ready,true);assert.equal(audio.ctx.state,'running');assert.ok(audio.master);assert.equal(audio.node,null);}finally{audio.dispose();finishWorklet();globalThis.AudioContext=old;}
});

test('tour guitar impulses are warmed cooperatively and reused by the first played note',async()=>{const audio=new StudioAudio({workerFactory:()=>new WorkerStub(),fallbackGenerator:async()=>pcm});let created=0,yields=0;audio.ctx={sampleRate:8000,createBuffer:(_,n)=>{created++;const d=new Float32Array(n);return{getChannelData:()=>d};}};try{const events=Array.from({length:10},()=>({instrument:'guitar-0',midi:60})),guitars=[{type:0,detunes:[0,0,0,0,0,0]}];assert.equal(await audio.prepareGuitarBuffers(events,guitars,{yieldTask:async()=>{yields++;}}),true);assert.equal(created,1);assert.equal(yields,1);const b=audio.guitarBuffer(3,5,0,0);assert.equal(created,1);assert.ok(b.getChannelData(0).some(n=>Math.abs(n)>.01));}finally{audio.ctx=null;audio.dispose();}});

test('an already-running context cannot get stuck on a redundant pending resume acknowledgement',async()=>{const a=Object.create(StudioAudio.prototype);a.ctx={state:'suspended',resume(){this.state='running';return new Promise(()=>{});}};a.init=()=>Promise.resolve(true);await Promise.race([a.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('running audio still waits for a resume acknowledgement')),150))]);assert.equal(a.ctx.state,'running');});
