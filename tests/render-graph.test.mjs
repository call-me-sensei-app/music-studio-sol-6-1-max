import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three/webgpu';
import {atmosphere} from '../src/rendering.js';

// CPU shader-graph regression only. Mocked capabilities do NOT constitute a GPU or browser-render pass.
for(const forceWebGL of[false,true])test(`guitar isolation graph builds ${forceWebGL?'GLSL':'WGSL'} without vector-width errors (CPU only)`,()=>{
  globalThis.innerWidth=800;globalThis.innerHeight=600;globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2,COMPUTE:4};
  const renderer=new THREE.WebGPURenderer({forceWebGL,canvas:{width:800,height:600,style:{},addEventListener(){},removeEventListener(){}}});renderer.hasFeature=()=>false;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),pipeline=atmosphere(renderer,scene,camera),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.NodeMaterial()),errors=[],old=console.error;
  function build(node){mesh.material.fragmentNode=node;const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.camera=camera;builder.scene=scene;builder.build();return builder;}
  console.error=(...args)=>errors.push(args.join(' '));try{
    const outer=build(pipeline.outputNode),rtt=outer.updateBeforeNodes.find(n=>n.isRTTNode);assert.ok(rtt);
    const composite=build(rtt.node);assert.ok(composite.fragmentShader.includes('smoothstep'));assert.ok(composite.fragmentShader.length>4000);
    const blur=composite.updateBeforeNodes.find(n=>n.isGaussianBlurNode);assert.ok(blur);assert.ok(build(blur._material.fragmentNode).fragmentShader.length>4000);assert.equal(errors.length,0,errors.join('\n'));
  }finally{console.error=old;}
});

test('tour foreground staging keeps the actual guitar/guide geometry separate from room occlusion and restores every layer',()=>{globalThis.innerWidth=800;globalThis.innerHeight=600;const renderer=new THREE.WebGPURenderer({forceWebGL:true,canvas:{width:800,height:600,style:{},addEventListener(){},removeEventListener(){}}}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),child=new THREE.Group(),window=new THREE.Group();child.layers.enable(4);root.add(child);scene.add(root,window);const masks=[root.layers.mask,child.layers.mask],p=atmosphere(renderer,scene,camera);p.setForeground(root);assert.equal(root.layers.mask,2);assert.equal(child.layers.mask,2);assert.equal(window.layers.mask,1);assert.equal(p.foregroundState().active,true);p.setForeground(null);assert.deepEqual([root.layers.mask,child.layers.mask],masks);assert.equal(p.foregroundState().active,false);});
