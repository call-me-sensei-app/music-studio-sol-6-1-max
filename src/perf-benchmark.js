import * as THREE from 'three/webgpu';
import {OPTIMIZATION_CANDIDATES,setPerformanceOptions} from './runtime-performance.js';
import {compareBlocks,imageDifference} from './perf-metrics.js';
import {newComposition,compositionEvents} from './composition.js';

export const BENCHMARK_VIEWS=[
 {id:'sofa-golden',name:'Sofa / golden hour',mode:'sofa',time:'golden',p:[-1.18,1.18,1.58],t:[-.35,1.08,-1.76],fov:64},
 {id:'vinyl-golden',name:'Turntable / golden hour',mode:'turntable',time:'golden',p:[1.29,1.35,1.25],t:[1.027,.87,.495],fov:45},
 {id:'window-golden',name:'Window / city and linen',mode:'guitars',time:'golden',p:[-2.25,1.45,.35],t:[-3.10,1.43,-.55],fov:46},
 {id:'window-guitar',name:'Window / foreground guitar',mode:'guitars',time:'golden',p:[-2.25,1.45,.35],t:[-3.10,1.43,-.55],fov:46,guitar:true},
 {id:'keyboard-concert',name:'Keyboard / concert projection',mode:'concert',time:'golden',p:[-1.2675,1.6125,1.2375],t:[-1.2675,1.335,-1.5675],fov:45,concert:true},
 {id:'sofa-city',name:'Sofa / city lights only',mode:'sofa',time:'city',p:[-1.18,1.18,1.58],t:[-.35,1.08,-1.76],fov:64}
];

/** App-owned, explicit dev-only benchmark. Never driven by hidden browser evaluation. */
export function mountPerformanceBenchmark({canvas,renderer,camera,room,rig,env,breeze,city,keyboard,guitars,guitarPresentation,pipeline,audio,composer,hardware,software}){
 const ui=document.createElement('aside');ui.id='performance-benchmark';ui.setAttribute('aria-label','Performance laboratory');
 ui.innerHTML='<small>AFTERLIGHT / PERFORMANCE LAB</small><h2>Keep every detail.</h2><p>Six room views · ABBA paired frames · lossless image gate. No resolution, lighting, shadow or material cuts. Camera/microphone stay off.</p><div><button id="benchmark-start">Run optimization experiment</button><button id="benchmark-final">Validate published build</button><button id="benchmark-stop" disabled>Stop</button></div><output id="benchmark-status" role="status">Ready · no measurements yet</output><pre id="benchmark-summary"></pre>';
 document.querySelector('#app').append(ui);
 const style=document.createElement('style');style.textContent='#performance-benchmark{position:fixed;z-index:100;top:100px;right:24px;width:360px;padding:22px;border:1px solid #fff3;border-radius:18px;background:#17262cef;color:#f6e9dd;box-shadow:0 12px 60px #0005;font:12px/1.5 sans-serif}#performance-benchmark small{letter-spacing:.18em;color:#b6cfcb}#performance-benchmark h2{font:28px Georgia;margin:10px 0}#performance-benchmark button{margin:2px;padding:8px 10px;border:0;border-radius:7px;background:#dfb3c3;color:#222;cursor:pointer}#performance-benchmark button:disabled{opacity:.4}#benchmark-status{display:block;margin-top:12px}#benchmark-summary{white-space:pre-wrap;font:11px/1.5 monospace;max-height:200px;overflow:auto}';document.head.append(style);
 let active=false,frozen=false,cancelled=false,view=null,clock=0,waiting=null,queryPending=false,serial=0,run=null,accepted=[];
 const params=new URLSearchParams(location.search),warm=Math.max(24,Number(params.get('warm'))||36),samples=Math.max(48,Number(params.get('samples'))||80);
 const project=newComposition();project.backing='none';project.bars=8;project.tracks[0].notes=Array.from({length:48},(_,i)=>({beat:i*.5,midi:[48,55,60,64,67,72,69,64][i%8],duration:.8,velocity:.6}));const events=compositionEvents(project),keyNotes=new Set();
 const status=s=>{ui.querySelector('#benchmark-status').textContent=s;};
 const summary=()=>{ui.querySelector('#benchmark-summary').textContent=run?JSON.stringify({run:run.id,state:run.state,iterations:run.iterations.map(x=>({id:x.candidate.id,frame_gain_pct:+x.metrics.aggregate.improvement_pct.toFixed(2),cpu_gain_pct:+x.metrics.aggregate.cpu_improvement_pct.toFixed(2),accepted:x.accepted,visual_pass:x.visual_pass})),consecutive_sub5:run.consecutive_sub5,accepted},null,2):'';};
 function frames(n,collect=false){if(waiting)throw Error('Benchmark frame waiter overlap');return new Promise((resolve,reject)=>{waiting={remaining:n,collect,rows:[],resolve,reject,serial:++serial};});}
 async function save(file,data,png=false){file=file.replaceAll('_','-');const r=await fetch('/__dev/perf/save?file='+encodeURIComponent(run.id+'/'+file),{method:'POST',headers:{'Content-Type':png?'image/png':'application/json'},body:png?data:JSON.stringify(data)});if(!r.ok)throw Error('Performance evidence save failed: '+r.status+' '+await r.text());return run.id+'/'+file;}
 function environment(){const size=renderer.getDrawingBufferSize(new THREE.Vector2());return{backend:renderer.backend.isWebGPUBackend?'webgpu':'webgl2',hardware,software,viewport:[innerWidth,innerHeight],drawing_buffer:[size.x,size.y],device_pixel_ratio:devicePixelRatio,render_pixel_ratio:renderer.getPixelRatio(),user_agent:navigator.userAgent,gpu_timestamp_supported:!!renderer.backend.hasTimestamp,gpu_timestamp_enabled:!!renderer.backend.trackTimestamp,shadow_size:[2048,2048],ao:{resolution_scale:.5,samples:8},antialias:'FXAA',audio:'Muted initialized worklet; visual score workload, not a DSP/audio-latency benchmark',camera_and_microphone:'off'};}
 function setView(next){
  view=next;clock=0;guitarPresentation.release();guitarPresentation.update(2);rig.choose(next.mode,true);rig.orbit.enabled=false;
  camera.position.set(...next.p);rig.orbit.target.set(...next.t);camera.fov=next.fov;camera.lookAt(rig.orbit.target);camera.updateProjectionMatrix();camera.updateWorldMatrix(true,false);
  env.setMode(next.time);for(const k of Object.keys(env.settings))env.settings[k]=next.time!=='city';env.setConcert(!!next.concert);env.update(20);city.updateMode(next.time);breeze.setClosed(!!next.concert);
  for(const midi of keyNotes)keyboard.release(midi,'benchmark');keyNotes.clear();keyboard.update(2);
  composer.player.projection.root.visible=!!next.concert;
  if(next.guitar){guitarPresentation.select(0);guitarPresentation.update(2);}
  pipeline.setForeground(next.guitar?guitars[0].root:null);pipeline.focusAt(next.guitar?guitarPresentation.focusDistance:camera.position.distanceTo(rig.orbit.target),next.guitar?1.1:0,next.guitar?1:0,20);
 }
 function animate(dt){clock+=dt;
  if(view?.concert){const phase=clock%16,nowNotes=new Set(events.filter(e=>e.beat*.625<=phase&&e.beat*.625+e.duration*.625>phase).map(e=>e.midi));for(const n of keyNotes)if(!nowNotes.has(n))keyboard.release(n,'benchmark');for(const n of nowNotes)if(!keyNotes.has(n))keyboard.press(n,.65,'benchmark');keyNotes.clear();for(const n of nowNotes)keyNotes.add(n);}
  if(view?.guitar&&Math.floor(clock*3)!==Math.floor((clock-dt)*3))guitars[0].vibrate(Math.floor(clock*3)%6,3,.65);
 }
 async function png(){const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('Native scene PNG export failed');const bitmap=await createImageBitmap(blob),c=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();return{blob,pixels:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};}
 async function visualGate(previous,next,label){const checks=[];
  for(const scene of BENCHMARK_VIEWS){
   status(label+' · lossless images · '+scene.name);setPerformanceOptions(previous);setView(scene);await frames(warm);frozen=true;breeze.setFrozen(true);await frames(3);const a=await png();
   setPerformanceOptions(next);await frames(5);const b=await png();setPerformanceOptions([]);await frames(5);const original=await png();
   const prefix=label+'-'+scene.id,images={previous:await save(prefix+'-A.png',a.blob,true),candidate:await save(prefix+'-B.png',b.blob,true),original:await save(prefix+'-original.png',original.blob,true)};
   const check={view:scene.id,width:a.width,height:a.height,incremental:imageDifference(a.pixels,b.pixels),cumulative:imageDifference(original.pixels,b.pixels),images};checks.push(check);
   setPerformanceOptions(previous);frozen=false;breeze.setFrozen(false);if(cancelled)throw Error('Benchmark stopped by user');
  }
  return checks;
 }
 async function measure(previous,next,label){const blocks=[];
  for(const scene of BENCHMARK_VIEWS)for(let order=0;order<4;order++){
   const variant=order===0||order===3?'A':'B';setPerformanceOptions(variant==='A'?previous:next);setView(scene);status(label+' · '+scene.name+' · '+['A1','B1','B2','A2'][order]+' · warmup');await frames(warm);
   status(label+' · '+scene.name+' · '+['A1','B1','B2','A2'][order]+' · measuring');const rows=await frames(samples,true);blocks.push({view:scene.id,variant,order,frames:rows});if(cancelled)throw Error('Benchmark stopped by user');
  }
  return{blocks,...compareBlocks(blocks)};
 }
 async function initialize(kind){
  active=true;cancelled=false;accepted=[];ui.querySelector('#benchmark-start').disabled=true;ui.querySelector('#benchmark-final').disabled=true;ui.querySelector('#benchmark-stop').disabled=false;
  run={id:new Date().toISOString().replace(/[:.]/g,'-')+'-'+kind,state:'warming',started_at:new Date().toISOString(),environment:environment(),method:{warmup_frames:warm,sample_frames_per_block:samples,order:'ABBA per view; equal-weighted six-view mean rAF interval',visual_gate:'Normalized RGB MAE <1%, global luminance SSIM loss <1%, pixels differing by >2/255 <1%; incremental and original-baseline comparison',motion:'Continuously simulated cloth worker and scene animation during timing. Frozen identical geometry/uniform/lighting state for lossless PNG comparison.',cpu:'performance.now() animation-callback work excluding asynchronous query resolution and PNG readback',gpu:'Native backend timestamp query, one resolved frame per eight frames when supported. No CPU-minus-frame proxy.',stop:'Five consecutive distinct candidate iterations with retained overall mean-frame improvement <5%. Rejected changes retain 0% improvement.',acceptance:'Image gate required. Keep clear overall-frame improvements, or >5% CPU/GPU work reduction with a positive 95% interval and no measured overall-frame regression >1%. Frame gains still drive the stopping condition, not CPU/GPU proxies.',limitations:['No actual camera, microphone, phone or OS GPU power/thermal telemetry enabled.','Visual-only keyboard/guitar score workload; audio DSP throughput and full animated fly-through are not benchmarked.','rAF is display/presentation limited; CPU and GPU work overlap, and must not be summed.','Single local browser/device run; block-bootstrap intervals do not establish portable hardware performance.']},iterations:[],consecutive_sub5:0};
  status('Preparing generated record and shader caches…');audio.setMute(true);await audio.resume();await Promise.all([...audio.pending.values()]);await frames(80);run.environment=environment();run.state='running';await save('run.json',run);summary();
 }
 async function experiment(){try{
   await initialize('optimization');
   for(const candidate of OPTIMIZATION_CANDIDATES){const next=[...accepted,candidate.id],number=run.iterations.length+1,label=String(number).padStart(2,'0')+'-'+candidate.id;
    const images=await visualGate(accepted,next,label),visual_pass=images.every(x=>x.incremental.pass&&x.cumulative.pass),metrics=await measure(accepted,next,label);
    const g=metrics.aggregate,workWin=(g.cpu_improvement_pct>5&&g.cpu_improvement_ci95?.[0]>0)||(g.gpu_improvement_pct>5&&g.gpu_improvement_ci95?.[0]>0),keep=visual_pass&&(g.improvement_ci95[0]>0||(workWin&&g.improvement_pct>=-1));
    const iteration={number,candidate,before:[...accepted],after:next,images,visual_pass,metrics,accepted:keep,retained_improvement_pct:keep?Math.max(0,g.improvement_pct):0,completed_at:new Date().toISOString()};if(keep)accepted=next;
    run.consecutive_sub5=iteration.retained_improvement_pct<5?run.consecutive_sub5+1:0;run.iterations.push(iteration);run.accepted=[...accepted];await save(label+'.json',iteration);await save('run.json',run);summary();
    if(run.consecutive_sub5>=5)break;
   }
   if(run.consecutive_sub5<5)throw Error('Candidate list exhausted before the five-iteration stopping condition. More distinct optimizations are required.');
   run.state='final-verification';summary();run.final_images=await visualGate([],accepted,'final');run.final_metrics=await measure([],accepted,'final');run.state='complete';run.completed_at=new Date().toISOString();await save('run.json',run);status('Complete · five consecutive sub-5% iterations · evidence saved');summary();
  }catch(e){if(run){run.state=cancelled?'cancelled':'failed';run.error=e.message;await save('run.json',run).catch(()=>{});}status('Stopped · '+e.message);summary();}finally{finish();}}
 async function validate(){try{await initialize('verification');const {ACTIVE_OPTIMIZATIONS}=await import('./perf-defaults.js');accepted=[...ACTIVE_OPTIMIZATIONS];run.accepted=accepted;run.final_images=await visualGate([],accepted,'final');run.final_metrics=await measure([],accepted,'final');run.state='complete';run.completed_at=new Date().toISOString();await save('run.json',run);status('Published build verified · evidence saved');summary();}catch(e){if(run){run.state='failed';run.error=e.message;await save('run.json',run).catch(()=>{});}status(e.message);}finally{finish();}}
 function finish(){active=false;frozen=false;breeze.setFrozen(false);for(const n of keyNotes)keyboard.release(n,'benchmark');keyNotes.clear();composer.player.projection.root.visible=false;guitarPresentation.release();pipeline.setForeground(null);env.setConcert(false);breeze.setClosed(false);env.setMode('golden');rig.choose('sofa',true);setPerformanceOptions(accepted);ui.querySelector('#benchmark-start').disabled=false;ui.querySelector('#benchmark-final').disabled=false;ui.querySelector('#benchmark-stop').disabled=true;}
 ui.querySelector('#benchmark-start').onclick=experiment;ui.querySelector('#benchmark-final').onclick=validate;ui.querySelector('#benchmark-stop').onclick=()=>{cancelled=true;if(waiting){waiting.reject(Error('Benchmark stopped by user'));waiting=null;}};
 return{get active(){return active;},get frozen(){return frozen;},beforeFrame(dt){if(active&&!frozen)animate(dt);},beforeRender(){if(!active||!view)return;if(view.concert&&!frozen)composer.player.projection.update(events,0,clock%16,.625,16,true,true);pipeline.setForeground(view.guitar?guitars[0].root:null);pipeline.focusAt(view.guitar?guitarPresentation.focusDistance:camera.position.distanceTo(rig.orbit.target),view.guitar?1.1:0,view.guitar?1:0,1/60);},onFrame(row){
  if(!active||!waiting){if(renderer.backend.trackTimestamp&&!queryPending){queryPending=true;renderer.resolveTimestampsAsync('render').catch(()=>{}).finally(()=>queryPending=false);}return;}const w=waiting;if(w.collect)w.rows.push(row);
  if(renderer.backend.trackTimestamp&&!queryPending&&w.remaining%8===0){queryPending=true;const target=w.collect?w.rows.at(-1):null;renderer.resolveTimestampsAsync('render').then(value=>{if(target&&value>0)target.gpu_ms=value;}).catch(()=>{}).finally(()=>queryPending=false);}
  if(--w.remaining<=0){waiting=null;w.resolve(w.rows);}
 },dispose(){if(waiting)waiting.reject(Error('Benchmark page closed'));ui.remove();style.remove();}};
}
