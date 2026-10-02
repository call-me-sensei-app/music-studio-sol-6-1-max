import * as THREE from 'three/webgpu';
import {sculpt,ellipsoidDistance,smoothUnion} from './implicit-sculpt.js';

const bindSpine=.225;
const vector=a=>new THREE.Vector3(...a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const blend=t=>t*t*(3-2*t);
const patch=new THREE.Color('#ba9385'),cream=new THREE.Color('#fcf5eb');
const depthScale=.78;

function capsuleDistance(x,y,z,a,b,ra,rb){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz),0,1);
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t,z-a[2]-dz*t)-(ra+(rb-ra)*t);
}

/** Analytic 3D two-link IK: a stable pole vector, finite reach clamp, flat terminal paw. */
export function solveLeg(shoulder,target,l1,l2,pole){
  const direction=target.clone().sub(shoulder),raw=direction.length();direction.divideScalar(raw||1);
  if(raw<1e-8)direction.set(0,-1,0);
  const distance=clamp(raw,Math.abs(l1-l2)+.0002,l1+l2-.0002),along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction));
  if(bend.lengthSq()<1e-8)bend.set(1,0,0).addScaledVector(direction,-direction.x);bend.normalize();
  const joint=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height),end=shoulder.clone().addScaledVector(direction,distance);
  return{joint,end,error:Math.abs(raw-distance)};
}

/** Exportable rest-pose payload. Row-major matrices match the Forge/UniRig-shaped validator. */
export function catRigPayload(bones,geometry){
  const index=geometry.getAttribute('skinIndex'),weight=geometry.getAttribute('skinWeight');
  return{schemaVersion:1,coordinateSystem:{up:'Y',handedness:'right',unit:'meter-before-room-scale-0.75'},joints:bones.map(b=>b.getWorldPosition(new THREE.Vector3()).toArray()),parents:bones.map(b=>bones.includes(b.parent)?bones.indexOf(b.parent):null),names:bones.map(b=>b.name),matrix_local:bones.map(b=>b.matrix.clone().transpose().toArray()),skinIndex:Array.from({length:index.count},(_,i)=>[index.getX(i),index.getY(i),index.getZ(i),index.getW(i)]),skinWeight:Array.from({length:weight.count},(_,i)=>[weight.getX(i),weight.getY(i),weight.getZ(i),weight.getW(i)]),auxiliaryJoints:['CatHeadSocket'],evidenceBoundary:'Authored structural payload; head and tail attach rigidly to sockets, no inferred likeness or GPU proof.'};
}

function validateBeforeBind(bones,geometry){
  if(new Set(bones.map(b=>b.name)).size!==bones.length)throw Error('Cat rig joint names must be unique.');
  for(let i=1;i<bones.length;i++){const p=bones.indexOf(bones[i].parent);if(p<0||p>=i)throw Error('Cat rig must have one ordered parent hierarchy.');}
  const index=geometry.getAttribute('skinIndex'),weight=geometry.getAttribute('skinWeight');if(index.count!==geometry.attributes.position.count||weight.count!==index.count)throw Error('Cat skin arrays are misaligned.');
  for(let i=0;i<index.count;i++){let sum=0;for(let j=0;j<4;j++){const id=index.array[i*4+j],w=weight.array[i*4+j];if(id<0||id>=bones.length||!Number.isFinite(w)||w<0)throw Error('Cat skin contains invalid influence.');sum+=w}if(Math.abs(sum-1)>1e-5)throw Error('Cat weights are not normalized.');}
}

/** One welded skin surface, a spine, and four genuine upper/lower/paw chains. */
export function createCatRig(root,material,{resolution=[36,46,70],bind=true}={}){
  const bones=[],legs=[],parts=[];
  const spine=new THREE.Bone();spine.name='CatSpine';spine.position.y=bindSpine;root.add(spine);bones.push(spine);
  const volume=(e,bone=0,k=.018)=>parts.push({bone,k,field:(x,y,z)=>ellipsoidDistance(x,y,z,e)});
  const segment=(a,b,ra,rb,bone,k=.012)=>parts.push({bone,k,field:(x,y,z)=>capsuleDistance(x,y,z,a,b,ra,rb)});
  volume([0,.228,-.036,.134,.101,.199]);volume([0,.224,-.190,.141,.103,.110]);volume([0,.239,.125,.122,.100,.105]);volume([0,.197,.150,.106,.073,.089]);
  for(const front of[false,true])for(const side of[-1,1]){
    const shoulder=vector(front?[side*.080,.238,.150]:[side*.083,.225,-.170]);
    const elbow=vector(front?[side*.085,.158,.123]:[side*.092,.151,-.116]);
    const ankle=vector(front?[side*.085,.058,.148]:[side*.084,.080,-.201]);
    const upper=new THREE.Bone(),lower=new THREE.Bone(),paw=new THREE.Bone(),name=(front?'Fore':'Hind')+(side<0?'Left':'Right');
    upper.name=name+'Upper';lower.name=name+'Lower';paw.name=name+'Paw';upper.position.copy(shoulder).sub(spine.position);lower.position.copy(elbow).sub(shoulder);paw.position.copy(ankle).sub(elbow);spine.add(upper);upper.add(lower);lower.add(paw);
    const indices=[bones.length,bones.length+1,bones.length+2];bones.push(upper,lower,paw);
    const a=shoulder.toArray(),b=elbow.toArray(),c=ankle.toArray();
    segment(a,b,front?.041:.054,front?.026:.035,indices[0]);segment(b,c,front?.026:.034,.018,indices[1],.009);
    const mid=shoulder.clone().lerp(elbow,.28);volume([...mid.toArray(),front?.044:.059,front?.057:.061,front?.052:.064],indices[0],.016);
    volume([ankle.x,.033,ankle.z+(front?.043:.011),front?.049:.045,.029,front?.069:.060],indices[2],.011);
    const restUpper=elbow.clone().sub(shoulder),restLower=ankle.clone().sub(elbow);
    legs.push({name,front,side,shoulder,ankle,upper,lower,paw,restUpper:restUpper.clone().normalize(),restLower:restLower.clone().normalize(),l1:restUpper.length(),l2:restLower.length(),offset:front?(side<0?.25:.75):(side<0?0:.5),plant:null,wasSwing:false});
  }
  const headAnchor=new THREE.Bone();headAnchor.name='CatHeadSocket';headAnchor.position.set(0,.120,.215);spine.add(headAnchor);bones.push(headAnchor);
  const field=(x,y,z)=>{let d=Infinity;for(const p of parts)d=smoothUnion(d,p.field(x,y,z),p.k);return d;};
  const coat=(x,y,z)=>{const side=blend(clamp((Math.abs(x)-.062)/.05,0,1)),band=blend(clamp((z+.22)/.035,0,1))*blend(clamp((.02-z)/.03,0,1)),legs=blend(clamp((y-.115)/.045,0,1));return cream.clone().lerp(patch,side*band*legs*.86).toArray();};
  const geometry=sculpt(field,{min:[-.190,-.006,-.317],max:[.190,.357,.300],cells:resolution,colorAt:coat}),positions=geometry.attributes.position,indices=[],weights=[];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),scores=new Map();
    for(const p of parts){const score=Math.exp(clamp(-p.field(x,y,z)/.014,-35,20));scores.set(p.bone,Math.max(scores.get(p.bone)||0,score));}
    const best=[...scores].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((s,p)=>s+p[1],0);
    for(let j=0;j<4;j++){indices.push(best[j]?.[0]||0);weights.push((best[j]?.[1]||0)/sum);}
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  // Compact quadruped scaffold, inferred from the chibi resting silhouette. Compress
  // both geometry and bind skeleton before skin binding; never scale a posed limb.
  for(let i=0;i<positions.count;i++){positions.setZ(i,positions.getZ(i)*depthScale);const n=geometry.attributes.normal,v=new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)/depthScale).normalize();n.setXYZ(i,v.x,v.y,v.z)}
  for(const bone of bones)bone.position.z*=depthScale;
  for(const leg of legs){leg.shoulder.z*=depthScale;leg.ankle.z*=depthScale;const a=leg.lower.position.clone(),b=leg.paw.position.clone();leg.l1=a.length();leg.l2=b.length();leg.restUpper.copy(a).normalize();leg.restLower.copy(b).normalize();}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  root.updateWorldMatrix(true,true);validateBeforeBind(bones,geometry);
  if(!bind)return{geometry,bones,legs,spine,headAnchor,payload:catRigPayload(bones,geometry)};
  const body=new THREE.SkinnedMesh(geometry,material);body.name='ContinuousRiggedFeline';body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;body.userData.nonPhysical=true;root.add(body);root.updateWorldMatrix(true,true);const skeleton=new THREE.Skeleton(bones);body.bind(skeleton);
  let gait=0,lastPhase='',height=()=>0;
  const world=new THREE.Vector3(),target=new THREE.Vector3(),yaw=new THREE.Quaternion();
  function poseLeg(leg,ankle){
    const shoulder=leg.shoulder.clone();shoulder.y+=spine.position.y-bindSpine;
    const solved=solveLeg(shoulder,ankle,leg.l1,leg.l2,new THREE.Vector3(0,0,leg.front?-1:1));
    const a=solved.joint.clone().sub(shoulder).normalize(),b=solved.end.clone().sub(solved.joint).normalize();
    leg.upper.quaternion.setFromUnitVectors(leg.restUpper,a);
    leg.lower.quaternion.setFromUnitVectors(leg.restLower,b.applyQuaternion(leg.upper.quaternion.clone().invert()));
    leg.paw.quaternion.copy(leg.upper.quaternion).multiply(leg.lower.quaternion).invert();leg.error=solved.error;
    return solved;
  }
  function grounded(leg,standing){
    const ankle=leg.ankle.clone();ankle.x=leg.side*(leg.front?.070+.014*standing:.070+.017*standing);if(leg.front)ankle.z+=.012*(1-standing);else ankle.z+=.020*(1-standing);
    root.localToWorld(world.copy(ankle));const support=height(world.x,world.z),base=root.getWorldPosition(target).y,scale=root.getWorldScale(new THREE.Vector3()).y;
    ankle.y=(support-base+.001)/scale+(leg.front?.054:.076);return ankle;
  }
  function animate(dt,motion,breath=0){
    const walking=motion.phase==='walking'&&motion.speed>.025,standing=motion.standing;
    let spineY=.112+(bindSpine-.112)*standing+breath*.0013;
    if(walking)spineY+=-.024+Math.sin(gait*Math.PI*4)*.0035;
    if(motion.phase==='landing')spineY-=.035*Math.sin(Math.min(1,motion.age/.4)*Math.PI);
    if(motion.airborne)spineY=bindSpine-.035;
    spine.position.y=spineY;
    const frequency=clamp(motion.speed/.12,1.1,3.4);if(walking)gait+=dt*frequency;
    root.updateWorldMatrix(true,true);
    for(const leg of legs){
      if(motion.airborne){
        leg.plant=null;leg.wasSwing=false;const t=motion.age/motion.jump.duration,reach=blend(clamp((t-.50)/.40,0,1));
        const ankle=leg.ankle.clone();ankle.y+=.070*(1-reach);ankle.z+=(leg.front?.048:-.040)*(1-reach);poseLeg(leg,ankle);continue;
      }
      const ideal=grounded(leg,standing);
      if(!walking){leg.plant=null;leg.wasSwing=false;poseLeg(leg,ideal);continue;}
      const phase=(gait+leg.offset)%1,swing=phase>=.66;
      if(!leg.plant||lastPhase!=='walking'){
        leg.plant=root.localToWorld(ideal.clone());leg.wasSwing=false;
        // Enter a coherent four-beat stance, not four feet all planted at the
        // same fore/aft point for an entire first stride (which overextends the first hind leg).
        if(!swing){root.getWorldQuaternion(yaw);leg.plant.add(new THREE.Vector3(0,0,motion.speed/frequency*(.33-phase)).applyQuaternion(yaw));leg.plant.y=height(leg.plant.x,leg.plant.z)+(leg.front?.054:.076)*root.getWorldScale(target).y+.001;}
      }
      if(swing){
        if(!leg.wasSwing){leg.from=leg.plant.clone();leg.to=root.localToWorld(ideal.clone());root.getWorldQuaternion(yaw);leg.to.add(new THREE.Vector3(0,0,motion.speed/frequency*(.34+.66*.35)).applyQuaternion(yaw));leg.to.y=height(leg.to.x,leg.to.z)+(leg.front?.054:.076)*root.getWorldScale(target).y+.001;}
        const t=(phase-.66)/.34;world.lerpVectors(leg.from,leg.to,blend(t));world.y+=Math.sin(t*Math.PI)*.030;poseLeg(leg,root.worldToLocal(world));
      }else{if(leg.wasSwing)leg.plant.copy(leg.to);poseLeg(leg,root.worldToLocal(world.copy(leg.plant)));}
      leg.wasSwing=swing;
    }
    lastPhase=walking?'walking':motion.phase;root.updateWorldMatrix(true,true);skeleton.update();
  }
  return{body,spine,headAnchor,skeleton,legs,poseLeg,animate,setHeight(fn){height=fn;},get maxReachError(){return Math.max(...legs.map(l=>l.error||0));}};
}
