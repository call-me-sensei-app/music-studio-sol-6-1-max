import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';
import {createCatRig,solveLeg} from '../src/cat-rig.js';
import {catHeadField,CAT_EAR_SOCKETS,catEarGeometry,paintSleepyEye} from '../src/cat.js';
test('3D paw IK preserves segment lengths and never emits invalid rotations',()=>{
  const s=new THREE.Vector3(.08,.32,.17);
  for(let i=0;i<60;i++){const t=new THREE.Vector3(.05+Math.sin(i)*.06,.05+Math.cos(i)*.02,.18+Math.sin(i*.7)*.08),ik=solveLeg(s,t,.15,.145,new THREE.Vector3(0,0,-1));assert.ok(Math.abs(ik.joint.distanceTo(s)-.15)<1e-9);assert.ok(Math.abs(ik.joint.distanceTo(ik.end)-.145)<1e-9);for(const n of [...ik.joint.toArray(),...ik.end.toArray()])assert.ok(Number.isFinite(n));}
});
test('reference cat ears remain embedded across the complete ear flick range',()=>{
 let closest=-Infinity;
 for(let i=0;i<2;i++){const side=i?1:-1;for(const delta of[-.10,0,.10])for(const x of[-.056,0,.056])for(const z of[-.014,.020]){const p=new THREE.Vector3(x,0,z).applyEuler(new THREE.Euler(0,0,side*-.18+delta)).add(new THREE.Vector3(...CAT_EAR_SOCKETS[i]));const d=catHeadField(p.x,p.y,p.z);closest=Math.max(closest,d);assert.ok(d<-.001,`ear corner outside skull: ${d}`)}}
 assert.ok(closest<-.013);const g=catEarGeometry();for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));
});
test('reference cat keeps closed lid curves in every expression, never painting an iris',()=>{
 for(const expression of[0,.08,.5,.92,1]){const commands=[],ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>commands.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});paintSleepyEye(ctx,expression,.8,-.6);assert.ok(commands.some(c=>c[0]==='quadraticCurveTo'));for(const forbidden of['ellipse','arc','fill','fillRect'])assert.ok(!commands.some(c=>c[0]===forbidden),`${forbidden} used in permanently closed eye`);assert.equal(ctx.strokeStyle,'#935644')}
});
test('cat payload can be validated before any skeleton is bound',()=>{
 const rig=createCatRig(new THREE.Group(),new THREE.MeshStandardNodeMaterial(),{resolution:[14,18,26],bind:false});assert.equal(rig.skeleton,undefined);assert.equal(rig.payload.schemaVersion,1);assert.equal(rig.payload.parents[0],null);for(let i=1;i<rig.payload.parents.length;i++)assert.ok(rig.payload.parents[i]>=0&&rig.payload.parents[i]<i);for(const m of rig.payload.matrix_local)assert.deepEqual(m.slice(12),[0,0,0,1]);
});
test('world-space gait plants do not slide or float under room scale and turns',()=>{
 const scene=new THREE.Group(),room=new THREE.Group(),root=new THREE.Group();scene.add(room);room.add(root);room.scale.setScalar(.75);root.position.y=.02/.75;const rig=createCatRig(root,new THREE.MeshStandardNodeMaterial(),{resolution:[16,22,30]});rig.setHeight(()=>.02);let maxError=0,checked=0;
 for(let i=0;i<300;i++){const heading=Math.sin(i/200)*.3;root.rotation.y=heading;root.position.x+=Math.sin(heading)*.32/60/.75;root.position.z+=Math.cos(heading)*.32/60/.75;const m={phase:'walking',standing:1,speed:.32,age:i/60,airborne:false};rig.animate(1/60,m);maxError=Math.max(maxError,rig.maxReachError);for(const leg of rig.legs){if(leg.plant&&!leg.wasSwing){const actual=leg.paw.getWorldPosition(new THREE.Vector3());assert.ok(actual.distanceTo(leg.plant)<.003,`${leg.name} planted drift ${actual.distanceTo(leg.plant)}`);checked++}}}
 assert.ok(maxError<.004,`gait reach clamps ${maxError}m`);assert.ok(checked>500);
});
test('continuous cat skin has four normalized influences and four articulated legs',()=>{
  const root=new THREE.Group(),rig=createCatRig(root,new THREE.MeshStandardNodeMaterial(),{resolution:[18,24,32]});assert.equal(rig.legs.length,4);assert.equal(rig.skeleton.bones.length,14);
  const skin=rig.body.geometry.getAttribute('skinWeight'),index=rig.body.geometry.getAttribute('skinIndex');for(let i=0;i<skin.count;i++){const w=[skin.getX(i),skin.getY(i),skin.getZ(i),skin.getW(i)];assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-6);for(const n of w)assert.ok(n>=0&&Number.isFinite(n));for(const n of[index.getX(i),index.getY(i),index.getZ(i),index.getW(i)])assert.ok(n>=0&&n<14);}
  for(const standing of[0,.25,.7,1]){rig.animate(1/60,{phase:'floor-idle',standing,speed:0,airborne:false,age:0});for(const leg of rig.legs){const ankle=leg.paw.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(ankle.y-(leg.front?.054:.076)-.001)<1e-5);assert.ok(leg.error<.001);}}
});
