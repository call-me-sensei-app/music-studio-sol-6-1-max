import {THREE,box,cyl,rod,curve} from './geometry.js';
import {mat,canvasTexture} from './materials.js';
import {texture,positionLocal,color,float} from 'three/tsl';
export const STREET_GROUND=-7.24;
function parkBench(parent,x,z,rotation){const root=new THREE.Group();root.name='CourtyardBench';root.position.set(x,STREET_GROUND,z);root.rotation.y=rotation;parent.add(root);const wood=mat('#a8855b',.88,0,'wood'),frame=mat('#48555a',.66,.42);for(let i=0;i<5;i++)box(root,[2.02,.057,.114],[0,.57,-.25+i*.123],wood,.008);for(let i=0;i<4;i++)box(root,[2.02,.11,.054],[0,.76+i*.13,-.337],wood,.008);for(const x of[-.76,.76]){for(const z of[-.28,.25])rod(root,[x,.01,z],[x,.55,z],.024,frame);rod(root,[x,.02,-.27],[x,1.24,-.34],.022,frame);curve(root,[[x,.51,.23],[x,.80,.25],[x,.81,-.26],[x,.74,-.32]],.019,frame);}}
/** A continuous ground plane and a modeled neighborhood, below the elevated study window. */
export function urbanStreet(parent,daylight){const root=new THREE.Group();root.name='GroundedStreetAndCourtyard';root.userData.nonPhysical=true;parent.add(root);let seed=5537;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 box(root,[71,.20,137],[-39.7,STREET_GROUND-.10,0],mat('#a5aa99',.97,0,'plaster'),0).name='ContinuousNeighborhoodGround';
 const asphalt=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#5b6064';c.fillRect(0,0,w,h);for(let i=0;i<19500;i++){c.fillStyle=i%3?'rgba(201,198,185,.12)':'rgba(20,31,38,.18)';c.fillRect(rnd()*w,rnd()*h,.6+rnd()*1.4,.6+rnd()*1.4);}}),road=new THREE.MeshStandardNodeMaterial({roughness:.96});asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;road.colorNode=texture(asphalt,positionLocal.xz.mul(.88)).rgb;
 box(root,[5.8,.05,122],[-9.1,STREET_GROUND+.010,0],road,0).name='AsphaltStreet';
 const concrete=mat('#c4c0ad',.98,0,'plaster'),curb=mat('#bbb9a9',.99,0,'plaster'),paint=mat('#dbd7bd',.97),yellow=mat('#bda866',.95);
 for(const x of[-12.56,-5.65]){box(root,[1.02,.11,122],[x,STREET_GROUND+.055,0],concrete,.008).name='RaisedSidewalk';box(root,[.15,.14,122],[x+(x<-9?.54:-.54),STREET_GROUND+.06,0],curb,.002);for(let i=0;i<110;i++)box(root,[1.005,.004,.99],[x,STREET_GROUND+.114,-54.4+i],mat(i%3?'#ccc5b3':'#bdbbaa',.96,0,'plaster'),.001);}
 for(let z=-55;z<56;z+=4.5)box(root,[.09,.0025,2.15],[-9.1,STREET_GROUND+.037,z],yellow,.001);
 for(let i=0;i<7;i++)box(root,[5.16,.003,.40],[-9.1,STREET_GROUND+.039,7.0+i*.70],paint,.001);
 // Street-level drains, iron covers and worn edge cracks are geometry, not a painted backdrop.
 const iron=mat('#434e53',.81,.25);for(const z of[-20,3,27]){cyl(root,.38,.38,.012,[-9.78,STREET_GROUND+.040,z],iron,40);for(let i=0;i<6;i++)box(root,[.040,.003,.49],[-9.96+i*.07,STREET_GROUND+.048,z],mat('#647071',.85,.2),0);}
 for(let i=0;i<20;i++){const z=-38+i*4.1,x=i%2?-11.80:-6.39;curve(root,[[x,STREET_GROUND+.038,z],[x+.03,STREET_GROUND+.038,z+.23],[x-.04,STREET_GROUND+.038,z+.53]],.003,mat('#3d494c',1));}
 // A small neighborhood park occupies the gap beyond the neighboring building.
 const grass=mat('#6f8865',1),soil=mat('#7d7a63',1);box(root,[9.2,.09,21.3],[-21.2,STREET_GROUND+.045,14.2],soil,.045).name='ParkSoil';box(root,[8.9,.025,21],[-21.2,STREET_GROUND+.101,14.2],grass,.05).name='ParkLawn';
 box(root,[1.35,.09,21.4],[-18.92,STREET_GROUND+.12,14.2],concrete,.004).name='ParkWalkway';box(root,[7.5,.09,1.20],[-20.4,STREET_GROUND+.12,8.5],concrete,.004);
 for(const x of[-25.7,-16.7])box(root,[.14,.18,21.5],[x,STREET_GROUND+.09,14.2],curb,.025);for(const z of[3.5,24.9])box(root,[9.1,.18,.14],[-21.2,STREET_GROUND+.09,z],curb,.025);
 parkBench(root,-20.15,12.9,-Math.PI/2);parkBench(root,-23.8,20.5,Math.PI/2);
 // Instanced low grass blades: real silhouettes at the lawn edges without thousands of draw calls.
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.018,0,0,.018,0,0,.009,.095,.014,-.010,.095,.014,0,.17,.025,0,0,-.018,0,0,.018,.014,.095,.009,.014,.095,-.010,.025,.17,0],3));blade.setIndex([0,1,2,0,2,3,3,2,4,5,6,7,5,7,8,8,7,9]);blade.computeVertexNormals();const bladeMat=new THREE.MeshStandardNodeMaterial({color:'#8f9f72',roughness:1,side:THREE.DoubleSide}),blades=new THREE.InstancedMesh(blade,bladeMat,1600),dummy=new THREE.Object3D();let count=0;for(let i=0;i<1900&&count<1600;i++){const x=-25.5+rnd()*8.5,z=3.9+rnd()*20.5;if(Math.abs(x+18.92)<.8||Math.abs(z-8.5)<.8)continue;dummy.position.set(x,STREET_GROUND+.116,z);dummy.rotation.y=rnd()*Math.PI;dummy.scale.setScalar(.6+rnd()*.65);dummy.updateMatrix();blades.setMatrixAt(count,dummy.matrix);blades.setColorAt(count++,new THREE.Color().setHSL(.22+rnd()*.07,.20+rnd()*.15,.24+rnd()*.12));}blades.count=count;blades.name='InstancedParkGrass';blades.castShadow=true;blades.receiveShadow=true;root.add(blades);
 const poles=mat('#536062',.68,.55),lit=new THREE.MeshStandardNodeMaterial({color:'#eee0bb',roughness:.6});lit.emissiveNode=color('#efcf9b').mul(float(1).sub(daylight)).mul(1.9);const lamps=[];
 for(const z of[-14,14,35]){const x=-5.85;rod(root,[x,STREET_GROUND+.12,z],[x,STREET_GROUND+4.25,z],.044,poles);curve(root,[[x,STREET_GROUND+3.9,z],[x-.18,STREET_GROUND+4.32,z],[x-.65,STREET_GROUND+4.37,z]],.037,poles);box(root,[.53,.09,.30],[x-.66,STREET_GROUND+4.30,z],poles,.025);box(root,[.44,.024,.25],[x-.66,STREET_GROUND+4.241,z],lit,.015);if(z<20){const light=new THREE.PointLight('#efd0a0',0,8,2);light.position.set(x-.66,STREET_GROUND+4.15,z);root.add(light);lamps.push(light);}}
 return{root,lamps,update(){for(const light of lamps)light.intensity=(1-daylight.value)*30;}};
}
