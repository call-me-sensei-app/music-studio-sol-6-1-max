import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';
import {createBeanbag,beanbagSurface} from '../src/beanbag.js';
import {buildGuitarNeck} from '../src/guitar-neck.js';
import {createSpiritPlush} from '../src/plush.js';
import {RoomTour,TOUR_SHOTS} from '../src/room-tour.js';
const gradient={addColorStop(){}};globalThis.document={createElement(){const canvas={width:1,height:1};const ctx=new Proxy({canvas,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});canvas.getContext=()=>ctx;return canvas;}};
test('headstock shares the neck centreline; the shaft no longer protrudes above its front face',()=>{
  for(const electric of[false,true]){const root=new THREE.Group(),n=buildGuitarNeck(root,electric,1.045);assert.equal(n.headstock.position.x,0);assert.equal(n.headstock.rotation.z,0);assert.equal(n.headstock.rotation.x,0);
    n.shaft.geometry.computeBoundingBox();n.board.geometry.computeBoundingBox();n.headstock.geometry.computeBoundingBox();
    assert.ok(n.shaft.position.y+n.shaft.geometry.boundingBox.max.y<1.055);
    assert.ok(n.board.position.y+n.board.geometry.boundingBox.max.y<=1.03851);
    assert.ok(n.headstock.position.z+n.headstock.geometry.boundingBox.max.z>n.shaft.position.z+n.shaft.geometry.boundingBox.max.z);
    assert.ok(n.headstock.position.y+n.headstock.geometry.boundingBox.min.y<1.0515);assert.equal(n.posts.length,6);assert.equal(n.headStrings.length,6);
  }
});
test('plain beanbag is a closed low fabric shell, with no character appendages',()=>{
  const bean=createBeanbag(new THREE.Group()),shell=bean.getObjectByName('FilledFabricShell');assert.ok(shell);assert.equal(bean.children.length,11);assert.ok(bean.children.every(c=>!/^(face|eye|ear|tail|toma|paw)/i.test(c.name)));
  shell.geometry.computeBoundingBox();const b=shell.geometry.boundingBox;assert.ok(b.max.x-b.min.x>1.45);assert.ok(b.max.y<.95);assert.ok(Math.abs(b.min.y-.002)<1e-6);
  for(const value of shell.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
  assert.ok(beanbagSurface(.65,Math.PI/2).y<beanbagSurface(.65,-Math.PI/2).y-.10,'seat has no filled-fabric depression');
});
test('room tour has continuous finite poses, stable aiming, pause and an exact end',()=>{
  const camera=new THREE.PerspectiveCamera(),tour=new RoomTour(camera);let previous=tour.sample(0),maxStep=0;
  for(let t=1/60;t<=tour.duration;t+=1/60){const s=tour.sample(t);maxStep=Math.max(maxStep,s.position.distanceTo(previous.position));assert.ok(s.position.distanceTo(s.target)>.35);assert.ok(s.fov>=39&&s.fov<=64);assert.ok(Math.abs(s.position.x)<2.8&&Math.abs(s.position.z)<2.2);for(const n of[...s.position.toArray(),...s.target.toArray()])assert.ok(Number.isFinite(n));previous=s;}
  assert.ok(maxStep<.025);tour.start();tour.update(2);tour.togglePause();tour.update(10);assert.equal(tour.time,2);tour.togglePause();assert.equal(tour.update(tour.duration),true);assert.equal(tour.active,false);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(...TOUR_SHOTS.at(-1).p))<1e-9);
});

test('shelf plush has authored nap/normal textures and sewn detail, not an untextured placeholder',()=>{const plush=createSpiritPlush(new THREE.Group()),body=plush.getObjectByName('StitchedBody');assert.ok(body.material.map);assert.ok(body.material.normalMap);assert.ok(body.material.sheen>.5);assert.ok(plush.getObjectByName('EmbeddedUprightEar'));assert.ok(plush.getObjectByName('SoftFloppedEar'));assert.equal(plush.getObjectsByProperty('name','EmbroideredClosedEye').length,2);assert.ok(body.geometry.attributes.position.count>10000);plush.traverse(o=>{if(o.geometry)for(const p of o.geometry.attributes.position.array)assert.ok(Number.isFinite(p));});});
