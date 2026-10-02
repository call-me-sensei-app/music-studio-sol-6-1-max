import * as THREE from 'three/webgpu';
import {mat,canvasTexture} from './materials.js';
import {uniform,positionLocal,uv,vec3,sin,instanceIndex,float} from 'three/tsl';

function branch(parent,points,startRadius,endRadius,material){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const n=20,radial=12,frames=path.computeFrenetFrames(n,false),positions=[],texcoords=[],indices=[];
  for(let i=0;i<=n;i++){
    const t=i/n,center=path.getPoint(t),r=startRadius*(1-t)+endRadius*t;
    for(let j=0;j<=radial;j++){
      const a=j/radial*Math.PI*2,ripple=r*(1+.035*Math.sin(j*7+i*.8));
      const q=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*ripple).addScaledVector(frames.binormals[i],Math.sin(a)*ripple);
      positions.push(...q.toArray());texcoords.push(j/radial,t*3);
      if(i<n&&j<radial){const k=i*(radial+1)+j;indices.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(texcoords,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return path;
}
function blade(){
  const p=[],tex=[],idx=[],n=9;
  for(let j=0;j<=n;j++){const v=j/n,width=Math.sin(Math.PI*v)**.8*.059;
    for(let k=0;k<3;k++){const u=k-1;p.push(u*width,v*.24,Math.sin(v*Math.PI)*.016+u*u*.012);tex.push(k/2,v);if(j<n&&k<2){const a=j*3+k;idx.push(a,a+3,a+1,a+1,a+3,a+4);}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function urbanTree(parent,position,seed=8271){
  const root=new THREE.Group();root.position.set(...position);parent.add(root);
  const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const barkMap=canvasTexture(512,1024,(c,w,h)=>{
    c.fillStyle='#70665a';c.fillRect(0,0,w,h);
    for(let i=0;i<360;i++){const x=rnd()*w,y=rnd()*h;c.strokeStyle=i%3?'#342f283b':'#c8b69935';c.lineWidth=.7+rnd()*3;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+4,y+12,x-7,y+35,x+2,y+20+rnd()*110);c.stroke();}
  });barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;
  const bark=new THREE.MeshStandardNodeMaterial({map:barkMap,roughness:.93});
  branch(root,[[0,0,0],[.03,2.2,.08],[-.12,4.2,.16],[.10,6.5,.24],[.17,9.4,.11]],.19,.030,bark);
  const anchors=[];
  for(let i=0;i<16;i++){
    const a=i*2.399,h=4.7+i*.255,length=1.8+rnd()*1.65;
    const end=new THREE.Vector3(Math.sin(a)*length,h+1.8+rnd()*.8,Math.cos(a)*length);
    const path=branch(root,[[.10,h,.20],[Math.sin(a)*.60,h+.65,Math.cos(a)*.60],[end.x*.75,end.y-.35,end.z*.75],end.toArray()],.075-i*.0026,.009,bark);
    for(let j=0;j<8;j++){
      const t=.28+j*.086,p=path.getPoint(Math.min(.95,t)),heading=a+(j%2?1:-1)*(.50+rnd()*.55);
      const tip=p.clone().add(new THREE.Vector3(Math.sin(heading)*(.55+rnd()*.72),.32+rnd()*.51,Math.cos(heading)*(.55+rnd()*.72)));
      const twig=branch(root,[p.toArray(),p.clone().lerp(tip,.5).add(new THREE.Vector3(0,.12,0)).toArray(),tip.toArray()],.015,.003,bark);
      for(let k=0;k<55;k++){const q=twig.getPoint(.25+rnd()*.75);q.add(new THREE.Vector3((rnd()-.5)*.50,(rnd()-.5)*.32,(rnd()-.5)*.50));anchors.push(q);}
    }
  }
  const leafMap=canvasTexture(256,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#aac28c');g.addColorStop(.5,'#e7eac5');g.addColorStop(1,'#a5bd86');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.strokeStyle='#687f4749';c.lineWidth=1.2;c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();
    for(let i=1;i<12;i++){c.beginPath();c.moveTo(w/2,i*h/13);c.lineTo(0,(i-.8)*h/13);c.moveTo(w/2,i*h/13);c.lineTo(w,(i-.8)*h/13);c.stroke();}
  });
  const time=uniform(0),leafMaterial=new THREE.MeshPhysicalNodeMaterial({map:leafMap,roughness:.66,side:THREE.DoubleSide,clearcoat:.03});
  const sway=sin(time.mul(.85).add(instanceIndex.toFloat().mul(.173))).mul(uv().y.pow(2)).mul(.008);
  leafMaterial.positionNode=positionLocal.add(vec3(sway,float(0),sway.mul(.35)));
  const leaves=new THREE.InstancedMesh(blade(),leafMaterial,anchors.length),dummy=new THREE.Object3D(),color=new THREE.Color();
  anchors.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set((rnd()-.5)*2.6,rnd()*Math.PI*2,(rnd()-.5)*2.2);dummy.scale.set(.7+rnd()*.60,.70+rnd()*.55,1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);color.setHSL(.18+rnd()*.065,.32+rnd()*.22,.32+rnd()*.16);leaves.setColorAt(i,color);});
  leaves.castShadow=true;leaves.receiveShadow=true;root.add(leaves);
  return{root,update(dt){time.value+=dt;}};
}
