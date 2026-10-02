import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';import {surfaceTextures} from '../src/surface-textures.js';import {mat} from '../src/materials.js';
test('surface roughness is independent of the albedo/height channels',()=>{for(const kind of['wood','fabric','plaster','floor']){const t=surfaceTextures(kind);assert.notEqual(t.grain,t.normal);assert.notEqual(t.grain,t.roughness);assert.notDeepEqual(t.grain.image.data.subarray(0,400),t.roughness.image.data.subarray(0,400));}});
for(const forceWebGL of[false,true])test(`metric surface normal graphs build ${forceWebGL?'GLSL':'WGSL'} (CPU only)`,()=>{
  globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2,COMPUTE:4};const r=new THREE.WebGPURenderer({forceWebGL,canvas:{width:64,height:64,style:{},addEventListener(){},removeEventListener(){}}});r.hasFeature=()=>false;
  const camera=new THREE.PerspectiveCamera(),scene=new THREE.Scene(),errors=[],old=console.error;console.error=(...a)=>errors.push(a.join(' '));try{
    for(const kind of['wood','fabric','plaster','floor']){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat('#a78b70',.69,0,kind)),b=r.backend.createNodeBuilder(mesh,r);b.camera=camera;b.scene=scene;b.build();assert.ok(b.fragmentShader.length>2000);}
    assert.equal(errors.length,0,errors.join('\n'));
  }finally{console.error=old;}
});
