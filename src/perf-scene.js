import * as THREE from 'three/webgpu';
import {hasPerf,onPerformanceOptions} from './runtime-performance.js';
import {indexExact,splitExact} from './perf-geometry.js';
const movingActions=new Set(['window','arm','key','lid','cue','pitch','scratch']);
export function scenePerformance(room,collision){const root=room.root,batches=[],transforms=[];root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isMesh&&o.userData.staticBatch)batches.push({mesh:o,original:o.geometry,indexed:null,chunks:null});let mutable=false;for(let a=o;a&&a!==root.parent;a=a.parent)if(a.userData.dynamic||a.userData.dynamicSolid||a.userData.instrument||movingActions.has(a.userData.action)||a.isLight||a.isCamera)mutable=true;const localSafe=!o.isLight&&!o.isCamera&&!o.userData.dynamic&&!movingActions.has(o.userData.action)&&(o.isMesh||o.isLine||!mutable);transforms.push({o,localSafe,worldSafe:!mutable,local:o.matrixAutoUpdate,world:o.matrixWorldAutoUpdate});});
 function apply(){root.updateWorldMatrix(true,true);for(const t of transforms){if(hasPerf('static_local')&&t.localSafe){t.o.updateMatrix();t.o.matrixAutoUpdate=false;}else t.o.matrixAutoUpdate=t.local;t.o.matrixWorldAutoUpdate=hasPerf('static_world')&&t.worldSafe?false:t.world;}
  for(const b of batches){if(hasPerf('indexed_batches')&&!b.indexed)b.indexed=indexExact(b.original);b.mesh.geometry=hasPerf('indexed_batches')?b.indexed:b.original;
   if(hasPerf('spatial_batches')&&!b.chunks){const parts=splitExact(b.original);if(parts)b.chunks=parts.map(g=>{const m=new THREE.Mesh(g,b.mesh.material);m.name='SpatialMaterialBatch';m.castShadow=b.mesh.castShadow;m.receiveShadow=b.mesh.receiveShadow;m.matrix.copy(b.mesh.matrix);m.matrixAutoUpdate=false;m.userData.perfChunk=true;b.mesh.parent.add(m);return{mesh:m,parent:b.mesh.parent,original:g,indexed:null};});else b.chunks=[];}
   if(b.chunks?.length){b.mesh.visible=!hasPerf('spatial_batches');for(const c of b.chunks){if(hasPerf('spatial_batches')){if(c.mesh.parent!==c.parent)c.parent.add(c.mesh);c.mesh.visible=true;}else{c.mesh.removeFromParent();c.mesh.visible=false;}if(hasPerf('indexed_batches')&&!c.indexed)c.indexed=indexExact(c.original);c.mesh.geometry=hasPerf('indexed_batches')?c.indexed:c.original;}}
  }
  collision.dynamicSnapshots=null;
 }
 const dispose=onPerformanceOptions(apply);apply();return{apply,batches,dispose};
}
