import {THREE,curve} from './geometry.js';
import {canvasTexture,mat} from './materials.js';
import {sculpt,ellipsoidDistance,smoothUnion,frontSurface} from './implicit-sculpt.js';

const pieces=[
 [0,.214,-.008,.170,.205,.129],[-.006,.463,.005,.203,.164,.146],
 [-.118,.409,.080,.089,.088,.068],[.118,.409,.080,.089,.088,.068],
 [0,.398,.126,.085,.062,.047],[-.140,.189,.068,.067,.106,.079],[.140,.181,.068,.067,.100,.079],
 [-.098,.057,.095,.105,.064,.098],[.098,.055,.095,.105,.062,.098]
];
/** One contiguous stuffed body/head/arms/feet, not separate low-poly balls. */
export function spiritPlushField(x,y,z){let d=Infinity;for(const e of pieces)d=smoothUnion(d,ellipsoidDistance(x,y,z,e),.027);const seam=Math.exp(-(((y-.338)/.010)**2))*Math.max(0,z/.15)*.0015;return Math.max(d+seam,.003-y);}
export function spiritBodyGeometry(){return sculpt(spiritPlushField,{min:[-.24,-.006,-.165],max:[.24,.650,.212],cells:[48,70,40],minTriangleAreaSq:1e-28});}
function surface(x,y,offset=.0017){return[x,y,frontSurface(spiritPlushField,x,y)+offset];}
function mesh(parent,geometry,material,name){const o=new THREE.Mesh(geometry,material);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function patch(parent,cx,cy,rx,ry,material,name){const pos=[],uv=[],indices=[];pos.push(...surface(cx,cy,.002));uv.push(.5,.5);for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;pos.push(...surface(cx+rx*Math.cos(a),cy+ry*Math.sin(a),.002));uv.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));if(i)indices.push(0,i,i+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,material,name);}
function fabricEar(parent,points,fur,lining,name){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments=42,sides=28,pos=[],tex=[],idx=[];
 function ring(t){const center=path.getPoint(t),v=path.getTangent(t),across=new THREE.Vector3(v.y,-v.x,0).normalize(),front=new THREE.Vector3().crossVectors(across,v).normalize(),width=(.031+.026*Math.sin(t*Math.PI))*(Math.pow(1-t,.40)+.045),depth=(.024+.007*Math.sin(t*Math.PI))*(Math.pow(1-t,.40)+.045);return{center,across,front,width,depth};}
 for(let i=0;i<=segments;i++){const t=i/segments,{center,across,front,width,depth}=ring(t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,p=center.clone().addScaledVector(across,Math.cos(a)*width).addScaledVector(front,Math.sin(a)*depth);pos.push(...p.toArray());tex.push(j/sides,t);if(i<segments&&j<sides){const n=i*(sides+1)+j;idx.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}}
 for(const [row,flip]of [[0,false],[segments,true]]){const center=pos.length/3;pos.push(...path.getPoint(row/segments).toArray());tex.push(.5,row/segments);for(let j=0;j<sides;j++){const n=row*(sides+1)+j;idx.push(center,flip?n+1:n,flip?n:n+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.setIndex(idx);g.computeVertexNormals();mesh(parent,g,fur,name);
 const innerPos=[],innerUv=[],innerIndices=[];
 for(let i=0;i<=30;i++){const u=i/30,t=.18+u*.70,{center,across,front,width,depth}=ring(t),w=width*.67*Math.sqrt(Math.sin(u*Math.PI));for(let j=0;j<=8;j++){const v=j/8*2-1,p=center.clone().addScaledVector(across,v*w).addScaledVector(front,depth*Math.sqrt(1-(v*w/width)**2)+.0007);innerPos.push(...p.toArray());innerUv.push(j/8,u);if(i<30&&j<8){const n=i*9+j;innerIndices.push(n,n+1,n+9,n+1,n+10,n+9);}}}
 const inner=new THREE.BufferGeometry();inner.setAttribute('position',new THREE.Float32BufferAttribute(innerPos,3));inner.setAttribute('uv',new THREE.Float32BufferAttribute(innerUv,2));inner.setIndex(innerIndices);inner.computeVertexNormals();const m=lining.clone();m.side=THREE.DoubleSide;mesh(parent,inner,m,name+'FeltLining');
}
function neckRadius(y,a){let lo=0,hi=.28;for(let i=0;i<17;i++){const r=(lo+hi)/2;if(spiritPlushField(Math.sin(a)*r,y,Math.cos(a)*r)>0)hi=r;else lo=r;}return(lo+hi)/2;}
function sewnScarf(parent,material,thread){const pos=[],tex=[],idx=[];
 for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;for(let j=0;j<=6;j++){const y=.338+(j/6-.5)*.047+.003*Math.sin(a*2),r=neckRadius(y,a)+.0025+.001*Math.sin(a*16);pos.push(Math.sin(a)*r,y,Math.cos(a)*r);tex.push(i/80,j/6);if(i<80&&j<6){const n=i*7+j;idx.push(n,n+7,n+1,n+1,n+7,n+8);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.setIndex(idx);g.computeVertexNormals();const m=material.clone();m.side=THREE.DoubleSide;mesh(parent,g,m,'FoldedKnittedScarf');
 for(let tail=0;tail<2;tail++){const p=[],u=[],indices=[];for(let i=0;i<=30;i++){const t=i/30,y=.345-t*(tail?.150:.207),cx=.061+tail*.033+Math.sin(t*2.4)*.012;for(let j=0;j<=8;j++){const x=cx+(j/8-.5)*.054,z=frontSurface(spiritPlushField,x,y)+.014+tail*.006+Math.sin(t*Math.PI)*.008+Math.cos(j/8*Math.PI*2)*.002;p.push(x,y,z);u.push(j/8,t);if(i<30&&j<8){const n=i*9+j;indices.push(n,n+1,n+9,n+1,n+10,n+9);}}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(parent,geo,m,'DrapedScarfEnd'+tail);for(let j=1;j<8;j++){const x=p[(30*9+j)*3],y=p[(30*9+j)*3+1],z=p[(30*9+j)*3+2];curve(parent,[[x,y,z],[x+.0009,y-.009,z+.002],[x-.001,y-.013,z]],.0012,thread);}}
}
/** An original sleepy lop-eared spirit keepsake. Sculpt, fabric, embroidery and all detail are code-authored. */
export function createSpiritPlush(parent){
 const root=new THREE.Group();root.name='SewnSpiritPlush';root.position.set(3.24,1.532,-2.69);root.rotation.y=-.13;parent.add(root);let seed=4267;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const nap=canvasTexture(768,768,(c,w,h)=>{c.fillStyle='#f4eee3';c.fillRect(0,0,w,h);for(let i=0;i<23000;i++){const x=rnd()*w,y=rnd()*h;c.strokeStyle=i%3?'rgba(255,255,250,.24)':'rgba(140,113,85,.12)';c.lineWidth=.5+rnd()*.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*2,y-1.2-rnd()*2.5);c.stroke();}for(let i=0;i<36;i++){const x=rnd()*w,y=rnd()*h,g=c.createRadialGradient(x,y,0,x,y,15+rnd()*28);g.addColorStop(0,'#a4856020');g.addColorStop(1,'#a4856000');c.fillStyle=g;c.fillRect(x-45,y-45,90,90);}});
 const normal=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#8080ff';c.fillRect(0,0,w,h);for(let i=0;i<14000;i++){const x=rnd()*w,y=rnd()*h;c.strokeStyle=i%2?'#8987fe':'#777afe';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+.6,y-2.4);c.stroke();}});normal.colorSpace=THREE.NoColorSpace;
 const fur=new THREE.MeshPhysicalNodeMaterial({color:'#e9d7b9',map:nap,normalMap:normal,normalScale:new THREE.Vector2(.24,.24),roughness:.98,sheen:1,sheenRoughness:.68,sheenColor:'#faf0d7'}),felt=fur.clone();felt.color.set('#faedcf');felt.normalScale.set(.14,.14);const lining=fur.clone();lining.color.set('#c7999c');const thread=mat('#bba789',.98),embroidery=mat('#6e574d',1),blush=mat('#c99791',1,0,'fabric');
 mesh(root,spiritBodyGeometry(),fur,'StitchedBody');
 fabricEar(root,[[-.092,.552,-.018],[-.127,.682,-.020],[-.126,.792,-.006],[-.114,.843,.009]],fur,lining,'EmbeddedUprightEar');
 fabricEar(root,[[.095,.552,-.018],[.162,.667,-.012],[.235,.679,.008],[.273,.589,.030]],fur,lining,'SoftFloppedEar');
 const detail=new THREE.Group();detail.name='SurfaceEmbroidery';detail.userData.nonPhysical=true;root.add(detail);
 patch(detail,0,.205,.108,.130,felt,'SewnBellyPanel');
 for(const sign of [-1,1]){const x=sign*.085;curve(detail,[[x-.031,.475],[x,.464],[x+.032,.477]].map(p=>surface(...p,.0030)),.0024,embroidery).name='EmbroideredClosedEye';patch(detail,sign*.135,.431,.023,.010,blush,'FeltRosyCheek');}
 const nose=new THREE.Shape();nose.moveTo(-.013,.002);nose.quadraticCurveTo(0,.012,.013,.002);nose.quadraticCurveTo(.004,-.010,0,-.010);nose.quadraticCurveTo(-.004,-.010,-.013,.002);const ng=new THREE.ShapeGeometry(nose,24);const a=ng.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i)+.435;a.setXYZ(i,x,y,frontSurface(spiritPlushField,x,y)+.0024);}ng.computeVertexNormals();mesh(detail,ng,blush,'FeltNose');
 curve(detail,[[0,.425],[0,.419],[-.012,.414],[-.025,.420]].map(p=>surface(...p,.0030)),.0015,embroidery);curve(detail,[[0,.419],[.012,.414],[.025,.420]].map(p=>surface(...p,.0030)),.0015,embroidery);
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,b=a+.035;curve(detail,[surface(Math.sin(a)*.111,.205+Math.cos(a)*.134,.0034),surface(Math.sin(b)*.111,.205+Math.cos(b)*.134,.0034)],.0009,thread);}
 // The rear construction seam follows the stuffed surface, with tiny stitch tension variations.
 for(let i=0;i<38;i++){const y=.092+i*.012;const x=.018*Math.sin(y*10);if(y>.32&&y<.37)continue;const zz=frontSurface(spiritPlushField,x,y);curve(detail,[[x,y,-zz*.78],[x+.001,y+.006,-zz*.78]],.0009,thread);}
 const scarf=mat('#ae91a8',.99,0,'fabric'),yarn=mat('#dbc4cf',1,0,'fabric');sewnScarf(detail,scarf,yarn);
 root.userData.asset='original-continuous-sleepy-lop-plush';return root;
}
