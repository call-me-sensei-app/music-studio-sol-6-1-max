import * as THREE from 'three/webgpu';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Bake static authored geometry into material batches, keeping all moving/interactive assemblies separate. */
export function batchStatic(container,exclude=[]){container.updateWorldMatrix(true,true);const blocked=new Set(exclude),groups=new Map(),inverse=container.matrixWorld.clone().invert();
 function visit(o){if(o!==container&&(!o.visible||blocked.has(o)||o.userData.dynamic||o.userData.action||o.userData.instrument))return;if(o.isMesh&&o.material&&!Array.isArray(o.material)&&!o.material.transparent&&!o.isInstancedMesh){const list=groups.get(o.material)||[];list.push(o);groups.set(o.material,list);}for(const c of[...o.children])visit(c);}
 visit(container);let removed=0;
 for(const [material,meshes]of groups){if(meshes.length<3)continue;const geos=meshes.map(m=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(inverse.clone().multiply(m.matrixWorld));return g;});const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!merged)continue;const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;m.userData.staticBatch=true;container.add(m);for(const o of meshes){o.removeFromParent();removed++;}}
 return removed;
}
