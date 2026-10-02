import * as THREE from 'three/webgpu';
import {curve} from './geometry.js';
import {canvasTexture} from './materials.js';
import {RestingCat} from './cat-behavior.js';
import {createCatRig} from './cat-rig.js';
import {FloorNavigation,CatLocomotion} from './cat-locomotion.js';
import {sculpt,ellipsoidDistance,smoothUnion,frontSurface} from './implicit-sculpt.js';
import {applyToonShader,applyToonSettingsToMaterial} from '@call-me-sensei/toonlab/toon';
import {labelStyleTarget,createStyleTargetLabel,createStyleMaterialContract} from '@call-me-sensei/toonlab/styles';

// The user's chibi reference has a skull width/height ≈1.32, a low eyeline and a short muzzle.
// Standing depth/underside are an inferred interpretation, not measurements of the illustration.
const skullVolumes=[[0,.035,-.007,.174,.130,.125],[-.112,-.030,.036,.072,.073,.094],[.112,-.030,.036,.072,.073,.094],[0,-.066,.047,.124,.049,.086],[0,-.051,.097,.060,.030,.032]];
export function catHeadField(x,y,z){let d=Infinity;for(const e of skullVolumes)d=smoothUnion(d,ellipsoidDistance(x,y,z,e),.015);return Math.max(d,-ellipsoidDistance(x,y,z,[0,-.108,.105,.040,.029,.050]));}
const headField=catHeadField;
export const CAT_EAR_SOCKETS=[[-.090,.070,-.028],[.090,.070,-.028]];
const furColor=new THREE.Color('#fcf5eb'),whiteColor=new THREE.Color('#fff9ef'),patchColor=new THREE.Color('#bd9687'),blushColor=new THREE.Color('#eed9cc');
function namedMaterial(id,color,role='default',options={}){const m=new THREE.MeshStandardNodeMaterial({color,roughness:.87,...options});m.name=id;m.userData.toonRole=role;m.userData.toonlabMaterialId=id;return m;}
function mesh(parent,name,geometry,material){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function catEarGeometry(){
  const p=[],uv=[],idx=[],rows=18,cols=10;
  for(let side=0;side<2;side++)for(let j=0;j<=rows;j++){
    const v=j/rows,width=.056*(1-v)**.72+.0006;
    for(let i=0;i<=cols;i++){const u=i/cols*2-1,x=u*width-.006*v,y=v*.145,z=(side===0?.013:-.014)+.019*Math.sin(v*Math.PI)+.007*u*u*(1-v);p.push(x,y,z);uv.push(i/cols,v);
      if(i<cols&&j<rows){const a=side*(rows+1)*(cols+1)+j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(...(side===0?[a,b,c,b,d,c]:[a,c,b,b,c,d]));}
    }
  }
  const n=(rows+1)*(cols+1);for(let j=0;j<rows;j++)for(const i of[0,cols]){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,b,a+n,b,b+n,a+n);}
  for(let i=0;i<cols;i++){idx.push(i,i+n,i+1,i+1,i+n,i+n+1);const a=rows*(cols+1)+i;idx.push(a,a+1,a+n,a+1,a+n+1,a+n);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function tailGeometry(){
  const path=new THREE.CatmullRomCurve3([[0,0,0],[.030,.052,-.095],[.065,.139,-.148],[.094,.224,-.137],[.100,.257,-.049],[.093,.203,.016]].map(p=>new THREE.Vector3(...p))),rings=80,sides=24,frames=path.computeFrenetFrames(rings,false),p=[],uv=[],idx=[];
  const colors=[];for(let j=0;j<=rings;j++){const t=j/rings,end=Math.min(1,Math.max(0,(t-.74)/.26)),r=(.040+.029*Math.sin(Math.PI*t*.95))*Math.sqrt(1-end*end)+.0004,center=path.getPoint(t),c=patchColor.clone().lerp(furColor,Math.min(1,Math.max(0,(t-.23)/.29)));for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,q=center.clone().addScaledVector(frames.normals[j],r*Math.cos(a)).addScaledVector(frames.binormals[j],r*Math.sin(a));p.push(...q.toArray());colors.push(...c.toArray());uv.push(i/sides,t);if(j<rings&&i<sides){const k=j*(sides+1)+i;idx.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}}
  for(const [ring,end] of [[0,false],[rings,true]]){const center=path.getPoint(ring/rings),id=p.length/3,c=ring?furColor:patchColor;p.push(...center.toArray());colors.push(...c.toArray());uv.push(.5,ring/rings);for(let i=0;i<sides;i++){const a=ring*(sides+1)+i;idx.push(...(end?[id,a,a+1]:[id,a+1,a]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function eyePatch(field,cx){
  const p=[],uv=[],idx=[],n=18,w=.068,h=.052;
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=cx+(i/n-.5)*w,y=-.021+(j/n-.5)*h,z=frontSurface(field,x,y)+.0014;p.push(x,y,z);uv.push(i/n,j/n);if(i<n&&j<n){const a=j*(n+1)+i;idx.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function paintSleepyEye(ctx,squint=0,gazeX=0,gazeY=0){
  // The reference cat never opens round eyes. Attention is carried by its head,
  // ears and a minute lid-curve change; no iris/sclera graphics exist in this texture.
  const t=Math.max(0,Math.min(1,squint)),width=69-8*t;ctx.clearRect(0,0,256,256);ctx.save();ctx.translate(128,128);ctx.rotate(Math.max(-.06,Math.min(.06,gazeX*.035)));ctx.strokeStyle='#935644';ctx.lineWidth=9-3*t;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-width,-2+gazeY*2);ctx.quadraticCurveTo(0,-16-10*t,width,-7+gazeY*2);ctx.stroke();ctx.restore();
}
const paintEye=paintSleepyEye;

/** Code-only chibi feline based on the user's illustration; unseen anatomy remains inferred. */
export function windowCat(room){
  const root=new THREE.Group();root.name='WindowCat';root.position.set(-4.015,.910,-.70);root.userData.action='cat';root.userData.dynamicSolid=true;room.root.add(root);
  const fur=namedMaterial('CatCoat','#ffffff','default',{vertexColors:true}),cream=namedMaterial('CatMuzzle','#fcf5eb'),pink=namedMaterial('CatNoseAndEars','#cf9690'),dark=namedMaterial('CatMouth','#754b4e'),line=namedMaterial('CatWhiskers','#935644','pupil');
  const rig=createCatRig(root,fur);
  const tailSocket=new THREE.Group();tailSocket.name='CatTailSocket';tailSocket.position.set(-.026,-.017,-.211);rig.spine.add(tailSocket);const tail=mesh(tailSocket,'ThickCurledTail',tailGeometry(),fur);
  const head=new THREE.Group();head.name='CatHead';head.rotation.y=.10;rig.headAnchor.add(head);
  const headColor=(x,y,z)=>{const h=Math.min(1,Math.max(0,(y-.036)/.110)),width=.005+.020*h,center=-.035+.055*h,mark=Math.max(0,Math.min(1,(width-Math.abs(x-center))/.003))*Math.min(1,Math.max(0,(z-.020)/.055))*h,blush=Math.exp(-(((Math.abs(x)-.122)/.027)**2+((y+.045)/.020)**2))*Math.min(1,Math.max(0,(z-.04)/.04));return furColor.clone().lerp(patchColor,mark*.72).lerp(blushColor,blush*.65).toArray();};
  const skull=mesh(head,'ContinuousFelineSkull',sculpt(headField,{min:[-.205,-.138,-.150],max:[.205,.185,.160],cells:[68,54,56],colorAt:headColor}),fur);
  const ears=[];for(const s of[-1,1]){const earTexture=canvasTexture(256,256,(c,w,h)=>{c.fillStyle=s<0?'#dbb398':'#fcf5eb';c.fillRect(0,0,w,h);c.fillStyle='#cf9690';c.beginPath();c.moveTo(w*.20,h*.92);c.quadraticCurveTo(w*.40,h*.26,w*.43,h*.12);c.quadraticCurveTo(w*.56,h*.22,w*.82,h*.92);c.closePath();c.fill();c.fillStyle='#b9867a66';c.beginPath();c.moveTo(w*.28,h*.85);c.quadraticCurveTo(w*.50,h*.62,w*.65,h*.79);c.lineTo(w*.75,h*.90);c.fill();});const earMaterial=namedMaterial(s<0?'CatLeftEarSurface':'CatRightEarSurface','#ffffff','default',{map:earTexture});const e=new THREE.Group();e.name=s<0?'LeftEar':'RightEar';e.position.fromArray(CAT_EAR_SOCKETS[s<0?0:1]);e.rotation.z=s*-.18;head.add(e);mesh(e,s<0?'OrganicLeftEar':'OrganicRightEar',catEarGeometry(),earMaterial);ears.push(e);}
  // Eyes are conformal, alpha-masked surface graphics: no floating sclera, eyeball scales or detached pupils.
  const earSocketChecks=[];for(const e of ears){for(const delta of[-.10,0,.10]){const rotation=e.rotation.clone();rotation.z+=delta;for(const x of[-.056,0,.056])for(const z of[-.014,.020]){const q=new THREE.Vector3(x,0,z).applyEuler(rotation).add(e.position);const depth=headField(q.x,q.y,q.z);earSocketChecks.push(depth);if(depth>-.001)throw Error('Cat ear socket is not embedded in the skull across its animation range.');}}}
  const eyes=[];for(const s of[-1,1]){const texture=canvasTexture(256,256,c=>paintEye(c,.08,0,0));const material=namedMaterial(s<0?'CatLeftEye':'CatRightEye','#ffffff','eye',{map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});material.userData.outlineParameters={visible:false};const eye=mesh(head,s<0?'LeftEye':'RightEye',eyePatch(headField,s*.077),material);eye.userData.nonPhysical=true;eye.castShadow=false;eyes.push({texture,eye});}
  const noseShape=new THREE.Shape();noseShape.moveTo(-.006,0);noseShape.quadraticCurveTo(0,-.008,.006,0);noseShape.quadraticCurveTo(0,.003,-.006,0);const nose=mesh(head,'SmallTriangularNose',new THREE.ExtrudeGeometry(noseShape,{depth:.001,bevelEnabled:true,bevelSize:.0006,bevelThickness:.0006,bevelSegments:2}),pink);nose.position.set(0,-.058,frontSurface(headField,0,-.058)+.0009);
  const cavity=mesh(head,'RecessedMouthInterior',new THREE.SphereGeometry(1,32,24),dark);cavity.scale.set(.036,.024,.008);cavity.position.set(0,-.101,.081);cavity.visible=false;
  const jaw=new THREE.Group();jaw.name='HingedLowerJaw';jaw.position.set(0,-.073,.043);head.add(jaw);
  const jawField=(x,y,z)=>ellipsoidDistance(x,y,z,[0,-.019,.040,.040,.023,.040]);
  const lowerJaw=mesh(jaw,'LowerJawSkin',sculpt(jawField,{min:[-.048,-.048,-.006],max:[.048,.011,.086],cells:[28,20,28]}),cream);lowerJaw.material.userData.outlineParameters={visible:false};
  const tongue=mesh(jaw,'TongueInsideJaw',new THREE.SphereGeometry(1,28,16),pink);tongue.position.set(0,-.003,.042);tongue.scale.set(.015,.004,.024);tongue.visible=false;
  const teeth=[];for(const s of[-1,1]){const t=mesh(head,s<0?'UpperCanineLeft':'UpperCanineRight',new THREE.ConeGeometry(.0025,.009,12),cream);t.rotation.z=Math.PI;t.position.set(s*.024,-.087,.118);t.visible=false;teeth.push(t);}
  const facialCurve=points=>points.map(([x,y])=>[x,y,frontSurface(headField,x,y)+.0015]);
  const smile=curve(head,facialCurve([[-.022,-.079],[-.011,-.084],[0,-.079],[.011,-.084],[.022,-.079]]),.00075,line);smile.name='ClosedMouthLine';smile.userData.nonPhysical=true;
  const whiskers=new THREE.Group();whiskers.name='Whiskers';whiskers.userData.nonPhysical=true;head.add(whiskers);
  for(const s of[-1,1])for(let i=0;i<3;i++){const w=curve(whiskers,facialCurve([[s*.114,-.059-i*.004],[s*.147,-.059+(i-1)*.010],[s*.186,-.056+(i-1)*.021]]),.00035,line);w.name=(s<0?'Left':'Right')+'Whisker'+i;w.userData.explodeWithParent=true;}
  // Toe creases move with the four terminal paw bones rather than floating in the resting pose.
  for(const leg of rig.legs)for(const x of[-.012,.012]){const z=leg.front?.081:.048,y=leg.front?-.013:-.035;const crease=curve(leg.paw,[[x,y,z-.018],[x,y-.008,z],[x,y-.023,z-.003]],.00045,line);crease.name=leg.name+'ToeCrease'+(x<0?'Inner':'Outer');crease.userData.nonPhysical=true;crease.userData.explodeWithParent=true;}
  const assignments={};root.traverse(o=>{if(!o.isMesh)return;const m=o.material;assignments[m.userData.toonlabMaterialId]={roles:[m.userData.toonRole]};});
  labelStyleTarget(root,createStyleTargetLabel('character',{targetId:'room/window-cat',materials:createStyleMaterialContract('character',{assignments})}));
  const toonReport=applyToonShader(root,{preset:'call_me_sensei',shaderMode:'anime',autoRoles:{mode:'off'},face:{enabled:false,map:{auto:false}},shading:{softness:.04,lightingMap:{auto:false}},ramp:{tone:{cloth:[.81,.70,.64]},band:{width:.03}},outline:{width:{cloth:.00085,skin:.00085,hair:.00085,face:.0006,eye:0,metal:.00085},maxWidth:.0020,referenceDistance:1.35,referenceFov:45,ink:{cloth:[.43,.26,.21]}},rim:{mode:'view',intensity:{cloth:.07}},light:{skyFloor:.035,maxTint:.24},shadows:{character:{enabled:false}}});
  // Render meshes never masquerade as unposed skin colliders. Moving collision volumes follow the actual bones.
  root.traverse(o=>{if(o.isMesh)o.userData.nonPhysical=true;});
  const solidGeometry=new THREE.SphereGeometry(1,12,8),solidMaterial=new THREE.MeshBasicNodeMaterial();
  function solid(parent,name,scale,position,orientation){const m=new THREE.Mesh(solidGeometry,solidMaterial);m.name=name;m.visible=false;m.scale.set(...scale);m.position.set(...position);if(orientation)m.quaternion.copy(orientation);parent.add(m);return m;}
  solid(rig.spine,'CatTorsoSolid',[.143,.108,.197],[0,-.009,-.028]);solid(head,'CatHeadSolid',[.181,.139,.140],[0,.018,.012]);
  ears.forEach(e=>solid(e,e.name+'Solid',[.056,.077,.030],[0,.071,0]));
  for(const [i,p] of [[0,[.018,.020,-.044]],[1,[.056,.111,-.126]],[2,[.088,.207,-.129]],[3,[.099,.248,-.050]],[4,[.094,.213,.002]]])solid(tailSocket,'CatTailSolid'+i,[.060,.067,.067],p);
  for(const leg of rig.legs){
    solid(leg.upper,leg.name+'UpperSolid',[leg.front?.041:.052,leg.l1*.5+.018,leg.front?.041:.052],leg.restUpper.clone().multiplyScalar(leg.l1*.5).toArray(),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leg.restUpper));
    solid(leg.lower,leg.name+'LowerSolid',[.023,leg.l2*.5+.011,.023],leg.restLower.clone().multiplyScalar(leg.l2*.5).toArray(),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leg.restLower));
    solid(leg.paw,leg.name+'PawSolid',[.036,.029,leg.front?.065:.055],[0,leg.front?-.025:-.047,leg.front?.043:.011]);
  }
  const parts=new Map([['body',rig.body],['head',head],['tail',tailSocket],['ear-left',ears[0]],['ear-right',ears[1]],['jaw',jaw]]),colliders=new Map();
  root.traverse(o=>{if(o.name.endsWith('Solid')||/Solid\d$/.test(o.name))colliders.set(o.name,o);if(o.isMesh&&o.visible&&o.name!=='ContinuousRiggedFeline')o.userData.explodeWithParent??=true;});
  root.userData.sculptRuntime={version:1,source:'user-cat-reference.png; hidden standing anatomy inferred',nodes:Object.fromEntries(parts),sockets:{head:rig.headAnchor,tail:tailSocket,leftEar:ears[0],rightEar:ears[1],jaw},colliders:Object.fromEntries(colliders),skeleton:rig.skeleton,partDefinition:[...parts.keys()],destructionGroups:{body:['body'],head:['head','ear-left','ear-right','jaw'],tail:['tail']},breakable:false};
  let exploded=null;
  function explode(enabled){
    if(!enabled){if(exploded){exploded.parent?.remove(exploded);exploded.traverse(o=>{o.geometry?.dispose()});exploded=null}root.visible=true;return;}
    if(exploded)return;root.updateWorldMatrix(true,true);rig.skeleton.update();exploded=new THREE.Group();exploded.name='CatAssemblyInspection';exploded.userData.nonPhysical=true;root.parent.add(exploded);const center=root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.24,0)),seen=new Set();
    // Bake the current skin pose for inspection only. Never detach an animated body
    // mesh from the skeleton and silently invalidate its bind transform.
    const primary=[['body',rig.body],['head',skull],['tail',tail],['ear-left',ears[0].children.find(o=>o.isMesh)],['ear-right',ears[1].children.find(o=>o.isMesh)],['jaw',lowerJaw]];
    for(const[id,source]of primary){if(!source||seen.has(source))continue;seen.add(source);const geometry=source.geometry.clone(),p=geometry.attributes.position,q=new THREE.Vector3();for(let i=0;i<p.count;i++){q.fromBufferAttribute(p,i);if(source.isSkinnedMesh)source.applyBoneTransform(i,q);q.applyMatrix4(source.matrixWorld);exploded.worldToLocal(q);p.setXYZ(i,q.x,q.y,q.z)}geometry.computeVertexNormals();geometry.computeBoundingBox();const midpoint=geometry.boundingBox.getCenter(new THREE.Vector3()),worldMid=exploded.localToWorld(midpoint.clone()),offset=worldMid.sub(center).multiplyScalar(.85);if(offset.length()<.03)offset.y+=.035;const clone=new THREE.Mesh(geometry,source.material);clone.name=id;clone.userData.partId=id;clone.userData.nonPhysical=true;clone.position.copy(offset).divideScalar(root.parent.getWorldScale(new THREE.Vector3()).x);exploded.add(clone)}
    root.visible=false;
  }
  const behaviour=new RestingCat(),local=new THREE.Vector3(),worldPosition=new THREE.Vector3(),headPosition=new THREE.Vector3();let eyeClock=0,motion=null,navigation=null,world=null,lookBase=.10;
  const api={root,rig,behaviour,toonReport,earSocketChecks,setExploded:explode,
    setWorld(collision,{camera,isLive=()=>false}={}){
      world=collision;const staticFree=(x,z)=>world.floorFree(x,z,.32,.48,root);
      navigation=new FloorNavigation(staticFree);
      const free=(x,z)=>staticFree(x,z)&&(!camera||!isLive()||Math.hypot(x-camera.position.x,z-camera.position.z)>.46);
      navigation.free=free;
      const floor=(x,z)=>world.supportHeight(x,z,.11,root),home=root.getWorldPosition(new THREE.Vector3());
      motion=new CatLocomotion({home,free,height:floor,path:(a,b)=>navigation.path(a,b)});
      rig.setHeight((x,z)=>['sill-idle','stand-up','sill-settle'].includes(motion.phase)?home.y:floor(x,z));
    },
    get locomotion(){return motion;},get state(){return{phase:motion?.phase||'sill-idle',position:motion?{...motion.position}:null,heading:motion?.heading??.65,visits:motion?.visits||0,navCells:navigation?.open.reduce((a,b)=>a+b,0)||0,maxReachError:rig.maxReachError,navRadius:.32,navHeight:.48,eyesClosed:true};},
    setInk(enabled){return applyToonSettingsToMaterial(root,{...toonReport.settings,outline:{...toonReport.settings.outline,enabled}});},
    wake(){behaviour.wake();},yawn(){behaviour.yawn();},explore(){motion?.explore();},recall(){motion?.recall();behaviour.wake();},
    update(dt,camera){
      if(motion){motion.step(dt);worldPosition.set(motion.position.x,motion.position.y,motion.position.z);root.parent.worldToLocal(worldPosition);root.position.copy(worldPosition);root.rotation.set(motion.airborne?Math.max(-.10,Math.min(.12,-motion.velocity.y*.045)):0,motion.heading,0);}
      const m=motion||{phase:'sill-idle',standing:0,speed:0,age:0,airborne:false};
      rig.animate(dt,m,behaviour.state.breath||0);
      const resting=['sill-idle','stand-up','sill-settle'].includes(m.phase),base=resting?.10:0;lookBase+=(base-lookBase)*(1-Math.exp(-dt*3.8));
      rig.headAnchor.getWorldPosition(headPosition);root.updateWorldMatrix(true,false);local.copy(camera.position);root.worldToLocal(local);root.worldToLocal(headPosition);local.sub(headPosition);
      const raw=Math.atan2(local.x,local.z)-lookBase,yaw=Math.atan2(Math.sin(raw),Math.cos(raw)),pitch=-Math.atan2(local.y,Math.hypot(local.x,local.z)),b=behaviour.update(dt,yaw,pitch),active=m.phase==='walking'||m.airborne,mouth=active?0:b.mouth;
      head.rotation.set(b.pitch*(m.airborne?.22:1),lookBase+b.yaw*(m.airborne?.22:1),mouth*.012);jaw.rotation.x=mouth*.75;cavity.visible=mouth>.06;smile.visible=mouth<.06;tongue.visible=mouth>.2;teeth.forEach(t=>t.visible=mouth>.2);
      ears[0].rotation.z=.18+b.ear*.09;ears[1].rotation.z=-.18-b.ear*.08;tailSocket.rotation.x=-.10+.10*m.standing;tailSocket.rotation.y=b.tail*.025+(active?Math.sin(b.time*2.1)*.055:0);
      eyeClock+=dt;if(eyeClock>.06){eyeClock=0;const gx=Math.max(-1,Math.min(1,(yaw-b.yaw)*2*b.attention)),gy=Math.max(-1,Math.min(1,(-pitch+b.pitch)*2*b.attention)),squint=Math.max(b.blink,mouth*.65);for(const e of eyes){paintEye(e.texture.image.getContext('2d'),squint,gx,gy);e.texture.needsUpdate=true;}}
      b.renderedMouth=mouth;
    }
  };return api;
}
