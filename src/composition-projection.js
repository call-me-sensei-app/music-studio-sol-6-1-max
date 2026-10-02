import * as THREE from 'three/webgpu';
import {glow} from './materials.js';
export function compositionProjection(keyboard){
  const root=new THREE.Group();root.userData.nonPhysical=true;root.userData.dynamic=true;root.visible=false;keyboard.root.add(root);
  const bars=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),glow('#ffffff',1.5),384);bars.frustumCulled=false;bars.count=0;bars.setColorAt(0,new THREE.Color('#96d5ed'));root.add(bars);
  const hits=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),glow('#a7deed',2),88);hits.frustumCulled=false;hits.count=0;root.add(hits);
  const keys=new Map(keyboard.keys.map(k=>[k.state.midi,k])),dummy=new THREE.Object3D(),point=new THREE.Vector3(),color=new THREE.Color();
  return{root,warm(){root.visible=true;dummy.position.set(0,-20,0);dummy.scale.setScalar(.00001);dummy.updateMatrix();bars.setMatrixAt(0,dummy.matrix);hits.setMatrixAt(0,dummy.matrix);bars.count=1;hits.count=1;bars.instanceMatrix.needsUpdate=true;hits.instanceMatrix.needsUpdate=true;},update(events,start,now,seconds,span,loop,playing){root.visible=playing;if(!playing)return;let count=0,hitCount=0;const cycle=Math.max(0,Math.floor((now-start)/span)),active=new Set();
    for(const offset of loop?[cycle,cycle+1]:[0])for(const n of events){if(n.instrument!=='keyboard')continue;const key=keys.get(n.midi);if(!key)continue;const on=start+offset*span+n.beat*seconds,off=on+n.duration*seconds,lead=(on-now)*.72,end=(off-now)*.72;if(lead>2.35||end<0)continue;
      point.set(0,key.isBlack?.014:.0125,key.isBlack?.133:.257).applyQuaternion(key.pivot.quaternion).add(key.pivot.position);
      if(count<384){const bottom=Math.max(0,lead),height=Math.min(2.35,end)-bottom;if(height>.003){dummy.position.set(point.x,point.y+bottom+height/2,point.z);dummy.rotation.set(0,0,0);dummy.scale.set(key.isBlack?.016:.025,height,.010);dummy.updateMatrix();bars.setMatrixAt(count,dummy.matrix);color.set(n.backing?'#96d5ed':'#eab3d5');bars.setColorAt(count++,color);}}
      if(on<=now&&off>now&&!active.has(n.midi)&&hitCount<88){active.add(n.midi);dummy.position.copy(point);dummy.quaternion.copy(key.pivot.quaternion);dummy.scale.set(key.isBlack?.016:.025,.0015,.030);dummy.updateMatrix();hits.setMatrixAt(hitCount++,dummy.matrix);}
    }
    bars.count=count;hits.count=hitCount;bars.instanceMatrix.needsUpdate=true;if(bars.instanceColor)bars.instanceColor.needsUpdate=true;hits.instanceMatrix.needsUpdate=true;
  }};
}
