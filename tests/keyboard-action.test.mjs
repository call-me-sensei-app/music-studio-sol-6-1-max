import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import {buildKeyboard} from '../src/instruments.js';

// Geometry/mechanical test only. The no-op canvas is not rendered evidence.
const gradient={addColorStop(){}};
globalThis.document={createElement(){
  const canvas={width:1,height:1};
  const ctx=new Proxy({canvas,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  canvas.getContext=()=>ctx;return canvas;
}};

test('all 88 key noses sink about 10mm; no visible rear cap pops upward',()=>{
  const room=new THREE.Group();room.scale.setScalar(.75);
  const keyboard=buildKeyboard(room);
  const top=(key,front)=>{key.mesh.geometry.computeBoundingBox();const b=key.mesh.geometry.boundingBox;return key.mesh.localToWorld(new THREE.Vector3(0,b.max.y,front?b.max.z:b.min.z)).y;};
  room.updateWorldMatrix(true,true);
  const baseline=keyboard.keys.map(k=>({front:top(k,true),rear:top(k,false)}));
  keyboard.keys.forEach(k=>keyboard.press(k.state.midi,.75));
  for(let i=0;i<60;i++)keyboard.update(1/60);
  room.updateWorldMatrix(true,true);
  const keybedTop=(keyboard.root.position.y+keyboard.body.position.y+.065)*.75;
  for(const [i,k] of keyboard.keys.entries()){
    const front=top(k,true),drop=baseline[i].front-front;
    assert.ok(drop>.009&&drop<.011,`${k.state.midi} front dip ${drop}`);
    assert.ok(top(k,false)<baseline[i].rear,`${k.state.midi} rear cap lifts`);
    assert.ok(front>keybedTop+.003,`${k.state.midi} visible cap disappears through the case`);
  }
  const down=keyboard.keys.map(k=>top(k,true));
  keyboard.keys.forEach(k=>keyboard.release(k.state.midi));keyboard.update(1/60);room.updateWorldMatrix(true,true);
  keyboard.keys.forEach((k,i)=>assert.ok(top(k,true)>down[i]&&top(k,true)<baseline[i].front));
  for(let i=0;i<90;i++)keyboard.update(1/60);room.updateWorldMatrix(true,true);
  keyboard.keys.forEach((k,i)=>assert.ok(Math.abs(top(k,true)-baseline[i].front)<1e-7));
});

test('pressing a black and white key leaves unplayed neighbours unchanged',()=>{
  const keyboard=buildKeyboard(new THREE.Group());
  keyboard.press(60,.5);keyboard.press(61,.9);
  for(let i=0;i<30;i++)keyboard.update(1/60);
  for(const k of keyboard.keys){
    if(k.state.midi===60||k.state.midi===61)assert.ok(k.pivot.position.y<k.restY);
    else{assert.equal(k.pivot.position.y,k.restY);assert.equal(k.pivot.rotation.x,0);}
  }
});

test('simultaneous manual, composer and fingertip holds release independently',()=>{
 const k=buildKeyboard(new THREE.Group()),key=k.keys.find(x=>x.state.midi===60);k.press(60,.6,'manual');k.press(60,.7,'composer');k.press(60,.8,'camera:0:8');k.release(60,'composer');assert.equal(key.state.held,true);k.release(60,'manual');assert.equal(key.state.held,true);k.release(60,'camera:0:8');assert.equal(key.state.held,false);
});
