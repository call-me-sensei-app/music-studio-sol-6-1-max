import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';
import {GuitarPresentation,heldGuitarPose} from '../src/guitar-presentation.js';
test('held guitar faces the camera, with its neck angled like a held instrument',()=>{
  const camera=new THREE.PerspectiveCamera(45,1,.01,100);camera.position.set(.4,1.3,1.1);camera.lookAt(-.1,1.2,-1);
  const pose=heldGuitarPose(camera),front=new THREE.Vector3(0,0,1).applyQuaternion(pose.orientation),toCamera=camera.position.clone().sub(pose.position).normalize();
  assert.ok(front.dot(toCamera)>.90);const neck=new THREE.Vector3(0,1,0).applyQuaternion(pose.orientation).applyQuaternion(camera.quaternion.clone().invert());
  assert.ok(neck.x<-.8);assert.ok(neck.y>.4&&neck.y<.65);
});
test('only one guitar leaves its mount; exit restores its exact authored transform',()=>{
  const parent=new THREE.Group();parent.scale.setScalar(.75);const guitars=[0,1,2].map(i=>{const root=new THREE.Group();root.position.set(-2+i,1.9,-3);root.rotation.z=.05;root.scale.setScalar(.70);parent.add(root);return{root};});parent.updateWorldMatrix(true,true);
  const camera=new THREE.PerspectiveCamera();camera.position.set(0,1.4,1);camera.lookAt(0,1.3,-1);const p=new GuitarPresentation(guitars,camera),home=guitars.map(g=>g.root.position.clone());
  p.select(0);for(let i=0;i<100;i++)p.update(1/60);assert.equal(p.state.poses[0],'held');assert.ok(guitars[0].root.position.distanceTo(home[0])>1);assert.equal(guitars[0].root.scale.x,.70);
  p.select(2);for(let i=0;i<100;i++)p.update(1/60);assert.equal(p.state.poses[0],'mounted');assert.equal(p.state.poses[2],'held');p.release();for(let i=0;i<100;i++)p.update(1/60);
  guitars.forEach((g,i)=>assert.ok(g.root.position.distanceTo(home[i])<1e-10));assert.ok(p.state.poses.every(s=>s==='mounted'));
});

