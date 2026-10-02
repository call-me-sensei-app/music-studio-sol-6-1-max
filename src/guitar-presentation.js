import * as THREE from 'three/webgpu';

const smooth=t=>t*t*(3-2*t);
const holdingTilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.10,.14,1.02,'XYZ'));
const instrumentCentre=new THREE.Vector3(0,.43,.055);

/** A camera-relative inspection pose. The instrument keeps its authored physical scale. */
export function heldGuitarPose(camera,scale=.525){
  camera.updateWorldMatrix(true,false);
  const orientation=camera.getWorldQuaternion(new THREE.Quaternion()).multiply(holdingTilt);
  const centre=new THREE.Vector3(-.13,-.035,-1.42).applyQuaternion(camera.quaternion).add(camera.position);
  const position=centre.sub(instrumentCentre.clone().multiplyScalar(scale).applyQuaternion(orientation));
  return{position,orientation};
}

export class GuitarPresentation{
  constructor(guitars,camera){
    this.guitars=guitars;this.camera=camera;this.selected=-1;this.clock=0;
    this.assemblies=guitars.map(g=>({root:g.root,home:g.root.position.clone(),homeQ:g.root.quaternion.clone(),state:'mounted',age:0}));
  }
  select(index=0){
    index=Math.max(0,Math.min(this.assemblies.length-1,index));
    this.assemblies.forEach((a,i)=>{if(i!==index&&a.state!=='mounted'&&a.state!=='returning')this.transition(a,'returning');});
    const a=this.assemblies[index];if(a.state!=='held'&&a.state!=='presenting')this.transition(a,'presenting');this.selected=index;
  }
  release(){this.selected=-1;this.assemblies.forEach(a=>{if(a.state!=='mounted'&&a.state!=='returning')this.transition(a,'returning');});}
  transition(a,state){a.state=state;a.age=0;a.from=a.root.position.clone();a.fromQ=a.root.quaternion.clone();}
  update(dt){
    this.clock+=dt;
    for(const a of this.assemblies){
      if(a.state==='mounted')continue;a.age+=dt;
      if(a.state==='returning'){
        const k=smooth(Math.min(1,a.age/1.15));a.root.position.lerpVectors(a.from,a.home,k);a.root.quaternion.slerpQuaternions(a.fromQ,a.homeQ,k);
        // Keep the body clear of the wall until the final mounting approach.
        a.root.position.z+=Math.sin(k*Math.PI)*.20;
        if(k===1){a.root.position.copy(a.home);a.root.quaternion.copy(a.homeQ);a.state='mounted';}continue;
      }
      const scale=a.root.getWorldScale(new THREE.Vector3()).x,pose=heldGuitarPose(this.camera,scale);
      const target=a.root.parent.worldToLocal(pose.position),parentQ=a.root.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),targetQ=parentQ.multiply(pose.orientation);
      if(a.state==='presenting'){
        const t=Math.min(1,a.age/1.35),k=smooth(t);
        a.root.position.lerpVectors(a.from,target,k);
        a.root.position.z+=Math.sin(t*Math.PI)*.22;
        a.root.position.y+=Math.sin(t*Math.PI)*.10;
        a.root.quaternion.slerpQuaternions(a.fromQ,targetQ,k);if(t===1)a.state='held';
      }else{
        const k=1-Math.exp(-dt*14);a.root.position.lerp(target,k);a.root.quaternion.slerp(targetQ,k);
      }
    }
  }
  get state(){return{selected:this.selected,poses:this.assemblies.map(a=>a.state)};}
  get focusDistance(){const a=this.assemblies[this.selected];if(!a)return 1.42;a.root.updateWorldMatrix(true,false);return -this.camera.worldToLocal(a.root.localToWorld(instrumentCentre.clone())).z;}
}
