import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, decal, canvasTexture } from './materials.js';
const geometries=new Map();
export function box(parent,size,pos,material,radius=.02){const key=[...size,radius].join();let g=geometries.get(key);if(!g){g=radius?new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(x=>x*.45))):new THREE.BoxGeometry(...size);geometries.set(key,g);}const m=new THREE.Mesh(g,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function cyl(parent,r1,r2,h,pos,material,segments=48){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function sphere(parent,size,pos,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),material);m.scale.set(...size);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
export function torus(parent,r,t,pos,material,rot=[Math.PI/2,0,0]){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,96),material);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;parent.add(m);return m;}
export function rod(parent,a,b,r,material){const p1=new THREE.Vector3(...a),p2=new THREE.Vector3(...b);const m=cyl(parent,r,r,p1.distanceTo(p2),p1.clone().add(p2).multiplyScalar(.5).toArray(),material,10);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p2.sub(p1).normalize());return m;}
export function curve(parent,points,r,material){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(path,40,r,8,false),material);m.castShadow=true;parent.add(m);return m;}
export function plane(parent,w,h,pos,texture,rot=[0,0,0]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),decal(texture));m.position.set(...pos);m.rotation.set(...rot);m.receiveShadow=true;parent.add(m);return m;}
export function label(parent,text,w,h,pos,opts={}){const t=canvasTexture(1024,Math.round(1024*h/w),(c,cw,ch)=>{if(opts.bg){c.fillStyle=opts.bg;c.fillRect(0,0,cw,ch);}c.fillStyle=opts.color||'#e7dac1';c.font=`${opts.weight||500} ${ch*.54}px ${opts.font||'sans-serif'}`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,cw/2,ch/2);});return plane(parent,w,h,pos,t,opts.rot);}
export function outline(mesh,thickness=.008){const m=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicNodeMaterial({color:'#293431',side:THREE.BackSide}));m.scale.copy(mesh.scale).multiplyScalar(1+thickness);m.position.copy(mesh.position);m.rotation.copy(mesh.rotation);mesh.parent.add(m);return m;}
export {THREE};
