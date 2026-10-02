import * as THREE from 'three/webgpu';
import {curve,torus} from './geometry.js';
import {mat} from './materials.js';

/** Sewn eight-panel pear/lounger: broad weighted base, rear slouch, seat depression.
 * A static filled-fabric shape, not a claimed bead/cloth dynamics simulation.
 */
export function beanbagSurface(v,angle){
  const h=Math.max(0,Math.min(1,v));
  const radius=(1-h)**.60*(.68+.42*Math.sin(Math.min(1,h/.45)*Math.PI/2));
  const crease=(.010*Math.sin(angle*12+h*11)+.004*Math.sin(angle*23-h*9))*Math.sin(Math.PI*h)*Math.exp(-(((h-.23)/.28)**2));
  const x=Math.cos(angle)*(radius+crease)*.94,z=Math.sin(angle)*(radius+crease)*.90-.26*h**1.2;
  const weight=Math.max(0,Math.min(1,(h-.42)/.22));
  const dent=.22*Math.exp(-((x/.55)**2+((z-.30)/.48)**2))*weight*weight*(3-2*weight);
  return new THREE.Vector3(x,.002+.90*h-dent,z);
}
function surfacePoint(v,a,offset=.0008){
  const p=beanbagSurface(v,a),dv=beanbagSurface(Math.min(.9999,v+.0001),a).sub(beanbagSurface(Math.max(.0001,v-.0001),a)),da=beanbagSurface(v,a+.0001).sub(beanbagSurface(v,a-.0001));
  const n=dv.cross(da).normalize();return p.addScaledVector(n,offset);
}
export function createBeanbag(parent){
  const root=new THREE.Group();root.name='PlainFabricBeanbag';root.position.set(3.12,.021,2.22);root.rotation.y=-.30;root.userData.action='beanbag';parent.add(root);
  const rings=64,sides=96,p=[],uv=[],index=[],colors=[];
  for(let j=0;j<rings;j++)for(let i=0;i<=sides;i++){
    const v=j/rings,a=i/sides*Math.PI*2,q=beanbagSurface(v,a);p.push(...q.toArray());uv.push(i/sides,v);
    const fade=.94+.055*Math.exp(-(((v-.65)/.25)**2));colors.push(fade,fade,fade);
    if(j<rings-1&&i<sides){const n=j*(sides+1)+i;index.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
  }
  const top=p.length/3;p.push(...beanbagSurface(1,0).toArray());uv.push(.5,1);colors.push(.99,.99,.99);
  const bottom=p.length/3;p.push(0,.002,0);uv.push(.5,0);colors.push(.94,.94,.94);
  for(let i=0;i<sides;i++){const a=(rings-1)*(sides+1)+i;index.push(a,top,a+1,i+1,bottom,i);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(index);geometry.computeVertexNormals();
  const fabric=mat('#bd9fa7',.97,0,'fabric');fabric.vertexColors=true;
  const shell=new THREE.Mesh(geometry,fabric);shell.name='FilledFabricShell';shell.castShadow=true;shell.receiveShadow=true;root.add(shell);
  const seamMaterial=mat('#aa8e97',.98,0,'fabric');
  for(let panel=0;panel<8;panel++){
    const points=Array.from({length:97},(_,j)=>surfacePoint(.018+j/96*.966,panel/8*Math.PI*2).toArray());
    const seam=curve(root,points,.0015,seamMaterial);seam.name='SewnPanelSeam'+panel;seam.userData.nonPhysical=true;
  }
  const zipPoints=Array.from({length:33},(_,j)=>surfacePoint(.12+j/32*.24,-Math.PI/2,.0016).toArray());
  const zip=curve(root,zipPoints,.002,mat('#89777d',.65));zip.name='ConcealedRearZipper';zip.userData.nonPhysical=true;
  const pull=torus(root,.009,.0017,surfacePoint(.36,-Math.PI/2,.006).toArray(),mat('#9c9390',.35,.65),[Math.PI/2,0,0]);pull.name='ZipperPull';pull.userData.nonPhysical=true;
  return root;
}
