import {surfaceTextures} from "./surface-textures.js";
import * as THREE from 'three/webgpu';
import {color,float,mix,positionLocal,positionView,normalLocal,normalViewGeometry,vec2,vec3,sin,smoothstep,max,texture,fwidth,Fn,dFdx,dFdy} from 'three/tsl';
const cache = new Map();
export function mat(hex,roughness=.72,metalness=0,kind='plain'){
 const key=[hex,roughness,metalness,kind].join('/');if(cache.has(key))return cache.get(key);
 const coated=['wood','floor'].includes(kind)&&roughness<.75;
 const m=coated?new THREE.MeshPhysicalNodeMaterial({color:hex,roughness,metalness,clearcoat:.13,clearcoatRoughness:.38}):new THREE.MeshStandardNodeMaterial({color:hex,roughness,metalness});
 // The environment responds to the actual changing lights; no baked, fixed-direction fake shading bands.
 let c=color(hex);
 if(['wood','floor','fabric','plaster'].includes(kind)){
  const t=surfaceTextures(kind),p=positionLocal,n=normalLocal.abs(),density=kind==='fabric'?18:kind==='plaster'?3:kind==='floor'?2:2.4;
  const coordinates=n.y.greaterThan(.6).select(p.xz,n.x.greaterThan(.6).select(p.zy,p.xy)).mul(density);
  c=c.mul(texture(t.grain,coordinates).r.div(kind==='fabric'?.85:kind==='plaster'?.93:.9));
  m.roughnessNode=texture(t.roughness,coordinates).r.sub(.5).mul(.14).add(roughness).clamp(.18,1);
  // Derivative cotangent frame uses the SAME metric UVs as colour/height, including after static batching.
  m.normalNode=Fn(()=>{
   const N=normalViewGeometry.normalize(),dp1=dFdx(positionView),dp2=dFdy(positionView),du1=dFdx(coordinates),du2=dFdy(coordinates),a=dp2.cross(N),b=N.cross(dp1);
   const T=a.mul(du1.x).add(b.mul(du2.x)),B=a.mul(du1.y).add(b.mul(du2.y)),inv=max(T.dot(T),B.dot(B)).max(.000001).sqrt().reciprocal(),sample=texture(t.normal,coordinates).rgb.mul(2).sub(1),strength=kind==='fabric'?.24:kind==='plaster'?.13:.24;
   return T.mul(inv).mul(sample.x.mul(strength)).add(B.mul(inv).mul(sample.y.mul(strength))).add(N.mul(sample.z)).normalize();
  })();
 }else if(kind==='vinyl'){
  const p=positionLocal;const r=p.x.mul(p.x).add(p.z.mul(p.z)).sqrt();
  const resolved=float(1).sub(smoothstep(.00005,.00020,fwidth(r)));const groove=sin(r.mul(62832)).mul(resolved);c=c.mul(groove.mul(.055).add(.97));m.roughnessNode=groove.mul(.035).add(.31);
 }
 m.colorNode=c;cache.set(key,m);return m;
}
export function glow(hex,intensity=1){const m=new THREE.MeshBasicNodeMaterial({color:hex});m.colorNode=color(hex).mul(intensity);return m;}
export function canvasTexture(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
export function decal(texture){return new THREE.MeshStandardNodeMaterial({map:texture,transparent:true,side:THREE.DoubleSide,roughness:.86,depthWrite:false});}
export const palette={ink:mat('#303b38'),oak:mat('#aa7752',.68,0,'wood'),lightOak:mat('#c59b72',.8,0,'wood'),walnut:mat('#6a4433',.7,0,'wood'),cream:mat('#f3e4cb'),sage:mat('#8c9d88'),white:mat('#f9f1dd',.5),black:mat('#232a2b',.5),metal:mat('#b9bec0',.25,.8),brass:mat('#d7b174',.3,.67),terracotta:mat('#bd6e52'),fabric:mat('#bca3b3',.93,0,'fabric')};
