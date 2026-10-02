import * as THREE from 'three/webgpu';
import {box,plane,sphere} from './geometry.js';
import {glow,canvasTexture} from './materials.js';
import {importScore,originalScore,guitarVoicing} from './score.js';

/** Audio-clock transport and diegetic score projection. No timers drive note-on timing. */
export function scorePerformance({audio,keyboard,guitars,rig,guitarPresentation,breeze,env,toast,model,prepare}){
  let source=originalScore(),score=source,part='all',instrument='keyboard',guitarIndex=0,playing=false,start=0,index=0,speed=1,elapsed=0,underruns=0,generation=0;
  const projection=new THREE.Group();projection.userData.nonPhysical=true;projection.userData.dynamic=true;projection.visible=false;keyboard.root.add(projection);
  const bars=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),glow('#ffffff',1.45),384);bars.frustumCulled=false;bars.count=0;bars.setColorAt(0,new THREE.Color('#89caff'));projection.add(bars);
  const hits=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),glow('#a5dbff',2.8),88);hits.frustumCulled=false;hits.count=0;projection.add(hits);
  const keyLookup=new Map(keyboard.keys.map(k=>[k.state.midi,k]));const dummy=new THREE.Object3D(),c=new THREE.Color(),keySurface=new THREE.Vector3();
  const line=box(projection,[1.65,.003,.019],[0,.083,.239],glow('#97cfff',1.6),.001);
  const guides=guitars.map(g=>{
    const root=new THREE.Group();root.userData.nonPhysical=true;root.userData.dynamic=true;root.visible=false;g.root.add(root);
    const fingers=Array.from({length:6},(_,s)=>{
      const group=new THREE.Group();group.visible=false;root.add(group);sphere(group,[.020,.020,.009],[0,0,0],glow('#edb2ca',1.2));
      const labels=[];for(let finger=0;finger<5;finger++){
        const tex=canvasTexture(128,128,(ctx,w,h)=>{ctx.fillStyle='#4d344d';ctx.font='bold 76px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(finger),w/2,h/2);});
        const label=plane(group,.021,.021,[0,0,.010],tex);label.visible=false;labels.push(label);
      }return{group,labels};
    });
    const shape=new THREE.Shape();shape.moveTo(-.022,.016);shape.quadraticCurveTo(0,.026,.022,.016);shape.quadraticCurveTo(.024,-.01,0,-.030);shape.quadraticCurveTo(-.024,-.01,-.022,.016);
    const pick=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.002,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2}),glow('#f5cf88',1.6));pick.position.set(0,.01,.134);root.add(pick);
    return{root,fingers,pick,last:-1};
  });
  const noteName=m=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][m%12]+(Math.floor(m/12)-1);
  const hud=document.createElement('section');hud.className='concert-hud';hud.hidden=true;hud.innerHTML='<small>LIVE / SCORE PERFORMANCE</small><strong></strong><div><span class="score-clock"></span><button aria-label="Stop performance">■</button></div><progress value="0" max="1"></progress>';document.querySelector('#app').append(hud);hud.querySelector('button').onclick=()=>{stop();rig.choose('sofa');};
  function arrange(){const selected={...source,notes:source.notes.filter(n=>part==='all'||n.part===part)};if(!selected.notes.length)throw Error('This part has no notes.');score=instrument==='guitars'?guitarVoicing(selected):selected;}
  function stop(restore=true){generation++;playing=false;audio.stopScore();keyboard.keys.forEach(k=>keyboard.release(k.state.midi,'score'));projection.visible=false;guides.forEach(g=>g.root.visible=false);hud.hidden=true;document.body.classList.remove('performance-mode');if(restore){env.setConcert(false);breeze.setClosed(false);}const b=document.querySelector('#score-play');if(b)b.textContent='▶ Perform';}
  async function play(){
    try{stop();const token=generation;arrange();await audio.resume();if(token!==generation)return;model.stop();model.setCue(true);elapsed=0;index=0;underruns=0;
      if(instrument==='keyboard'){env.setConcert(true);breeze.setClosed(true);projection.visible=true;rig.choose('concert');}
      else{guides[guitarIndex].root.visible=true;rig.choose('guitars');guitarPresentation.select(guitarIndex);}
      document.querySelector('#panel').hidden=true;hud.hidden=false;hud.querySelector('strong').textContent=source.title;document.body.classList.add('performance-mode');toast('Taking the stage · settling the curtains and lighting.');
      if(prepare){dummy.position.set(0,-20,0);dummy.scale.setScalar(.00001);dummy.updateMatrix();bars.setMatrixAt(0,dummy.matrix);hits.setMatrixAt(0,dummy.matrix);bars.count=1;hits.count=1;bars.instanceMatrix.needsUpdate=true;hits.instanceMatrix.needsUpdate=true;await prepare();if(token!==generation)return;bars.count=0;hits.count=0;}start=audio.ctx.currentTime+2.8;playing=true;
    }catch(e){toast(e.message);}
  }
  const button=document.createElement('button');button.id='musicbook-button';button.setAttribute('aria-label','Open music book');button.textContent='▤';document.querySelector('.top-tools').append(button);
  function show(){
    const panel=document.querySelector('#panel');panel.hidden=false;
    panel.innerHTML='<button class="close" aria-label="Close music book">×</button><small>SCORE / PERFORMANCE STUDIO</small><h2>Give the room a song</h2><p id="score-title"></p><input type="file" id="score-file" accept=".mid,.midi,.xml,.musicxml,.mxl" aria-label="Import MIDI or MusicXML music book"><div class="control-row"><label for="score-instrument">Perform on</label><select id="score-instrument"><option value="keyboard">88-key studio grand</option>'+guitars.map((g,i)=>'<option value="guitar-'+i+'">'+g.name+'</option>').join('')+'</select></div><div class="control-row"><label for="score-part">Score part</label><select id="score-part"></select></div><div class="control-row"><label for="score-speed">Playback speed</label><select id="score-speed"><option value="0.5">50% · practice</option><option value="0.75">75%</option><option value="1">100% · written timing</option><option value="1.25">125%</option></select></div><div class="button-row"><button id="score-play">▶ Perform</button><button id="score-stop">■ Stop</button></div><button id="score-demo" class="full-button">Load original piano study</button><p id="score-status" class="view-note"></p><p class="view-note">MIDI / MusicXML / MXL stay on your device. Tied notes, tempo changes, simple repeats, velocity and MIDI sustain are read from the score. Numbered guitar guides show string/fret placements; without TAB these are an inferred playable arrangement, not the original artist’s fingering.</p><p class="view-note">PDF or photographed books require verified transcription first. Volta / D.C. / D.S. must be exported as expanded MusicXML. Grace notes and pitch bends are reported, not silently claimed as accurate.</p>';
    panel.querySelector('.close').onclick=()=>panel.hidden=true;panel.querySelector('#score-title').textContent=source.title+' · '+source.notes.length+' notes';
    const parts=panel.querySelector('#score-part');const option=document.createElement('option');option.value='all';option.textContent='All pitched parts';parts.add(option);source.parts.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;parts.add(o);});parts.value=part;
    parts.onchange=e=>{stop();part=e.target.value;};
    const ins=panel.querySelector('#score-instrument');ins.value=instrument==='keyboard'?'keyboard':'guitar-'+guitarIndex;ins.onchange=e=>{stop();instrument=e.target.value==='keyboard'?'keyboard':'guitars';guitarIndex=Number(e.target.value.split('-')[1]||0);};
    const rate=panel.querySelector('#score-speed');rate.value=String(speed);rate.onchange=e=>{stop();speed=Number(e.target.value);};
    panel.querySelector('#score-play').onclick=play;panel.querySelector('#score-stop').onclick=()=>{stop();toast('Performance stopped · room lighting restored.');};
    panel.querySelector('#score-demo').onclick=()=>{stop();source=originalScore();part='all';show();};
    panel.querySelector('#score-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;stop();try{source=await importScore(file);part='all';show();toast(source.warnings.length?source.warnings.join(' '):'Score read locally · choose an instrument and perform.');}catch(err){toast(err.message);}};
    panel.querySelector('#score-status').textContent=source.warnings.length?source.warnings.join(' '):'Ready · concert A = 440 Hz · exact encoded note timing';
  }
  button.onclick=show;document.addEventListener('click',e=>{const b=e.target.closest('[data-score]');if(!b)return;instrument=b.dataset.score;if(instrument==='guitars'&&guitarPresentation.selected>=0)guitarIndex=guitarPresentation.selected;show();});
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&playing)stop();});
  return{show,stop,get playing(){return playing;},get state(){return{playing,title:source.title,time:elapsed,duration:score.duration,notes:score.notes.length,instrument,underruns};},update(){
    if(!playing)return;if(rig.mode!==(instrument==='keyboard'?'concert':'guitars')){stop();return;}if(audio.ctx?.state!=='running')return;elapsed=(audio.ctx.currentTime-start)*speed;hud.querySelector('.score-clock').textContent=elapsed<0?'Starting in '+Math.ceil(-elapsed/speed):Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0')+' / '+Math.ceil(score.duration)+'s';hud.querySelector('progress').value=Math.max(0,elapsed/score.duration);
    while(index<score.notes.length&&score.notes[index].time<elapsed+.18*speed){
      const n=score.notes[index],when=start+n.time/speed;if(when<audio.ctx.currentTime-.025)underruns++;
      if(instrument==='keyboard'&&keyLookup.has(n.midi))audio.pianoOn(n.midi,n.velocity,'piano',when,'score:'+index,(n.soundDuration??n.duration)/speed);
      else if(instrument==='guitars'){const g=guitars[guitarIndex];audio.pluck(n.string,n.fret,n.velocity,g.type,g.detunes[n.string],when,n.duration/speed,'score');}
      index++;
    }
    if(instrument==='keyboard'){
      const active=new Set();let count=0,hitCount=0;
      for(const n of score.notes){const key=keyLookup.get(n.midi);if(!key)continue;const lead=(n.time-elapsed)*.72,end=(n.time+n.duration-elapsed)*.72;if(lead>2.35||end<0)continue;
        if(count<384){const bottom=Math.max(0,lead),top=Math.min(2.35,end),height=top-bottom;if(height>.005){dummy.position.set(key.pivot.position.x,.083+bottom+height/2,.214);dummy.rotation.set(0,0,0);dummy.scale.set(key.isBlack?.019:.026,height,.012);dummy.updateMatrix();bars.setMatrixAt(count,dummy.matrix);c.set(n.midi<60?'#89caff':'#e4a6d7');bars.setColorAt(count++,c);}}
        if(n.time<=elapsed&&n.time+n.duration>elapsed){active.add(n.midi);if(hitCount<88){keySurface.set(0,key.isBlack?.014:.0125,key.isBlack?.133:.257).applyQuaternion(key.pivot.quaternion).add(key.pivot.position);dummy.position.copy(keySurface);dummy.quaternion.copy(key.pivot.quaternion);dummy.scale.set(key.isBlack?.016:.025,.0015,key.isBlack?.030:.052);dummy.updateMatrix();hits.setMatrixAt(hitCount++,dummy.matrix);}}
      }
      bars.count=count;hits.count=hitCount;bars.instanceMatrix.needsUpdate=true;if(bars.instanceColor)bars.instanceColor.needsUpdate=true;hits.instanceMatrix.needsUpdate=true;
      for(const k of keyboard.keys){if(active.has(k.state.midi)){keyboard.press(k.state.midi,.7,'score');}else keyboard.release(k.state.midi,'score');}
      keyboard.setDisplay([...active].map(noteName).slice(0,3).join(' ')||'CONCERT',false);
    }else{
      const g=guitars[guitarIndex],guide=guides[guitarIndex],active=new Map();let recent=null;
      for(const n of score.notes){if(n.time<=elapsed&&n.time+n.duration>elapsed)active.set(n.string,n);if(n.time<=elapsed&&elapsed-n.time<.16)recent=n;}
      guide.fingers.forEach((f,s)=>{const n=active.get(s);f.group.visible=!!n;if(!n)return;const y=n.fret===0?1.045:1.045-1.235*(1-2**(-n.fret/12))+.012;f.group.position.set((s-2.5)*.0135,y,.116);f.labels.forEach((label,i)=>label.visible=i===Math.min(4,n.finger??0));});
      guide.pick.visible=!!recent;if(recent){guide.pick.position.x=(recent.string-2.5)*.0135;guide.pick.position.y=.008+Math.sin((elapsed-recent.time)/.16*Math.PI)*.024;if(guide.last!==recent.time){g.vibrate(recent.string,recent.fret,recent.velocity);guide.last=recent.time;}}
    }
    if(elapsed>score.duration+1.4){stop();toast('The last note fades. The room is yours again.');}
  }};
}
