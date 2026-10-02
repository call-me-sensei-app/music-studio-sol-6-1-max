import * as THREE from 'three/webgpu';
import {box,cyl,rod,label,curve} from './geometry.js';
import {mat,canvasTexture} from './materials.js';
import {uniform,color} from 'three/tsl';

/** Nearest Tokyo apartment frontage: every reveal, frame, balcony and pipe is geometry. */
export function apartment(parent,position,{stories=7,width=15,seed=515}={}){
  const root=new THREE.Group();root.position.set(...position);parent.add(root);
  const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const floor=3.62,height=stories*floor,columns=5,power=uniform(0);
  const plasterMap=canvasTexture(1024,2048,(c,w,h)=>{
    c.fillStyle='#d8c9b3';c.fillRect(0,0,w,h);
    for(let i=0;i<28000;i++){const x=rnd()*w,y=rnd()*h;c.fillStyle=i%3?'#61554707':'#fff6e80e';c.fillRect(x,y,1+rnd()*3,1+rnd()*3);}
    for(let i=0;i<70;i++){const x=rnd()*w,y=rnd()*h,g=c.createLinearGradient(0,y,0,y+180);g.addColorStop(0,'#6d615215');g.addColorStop(1,'#6d615200');c.fillStyle=g;c.fillRect(x,y,3+rnd()*8,180);}
  });
  const plaster=new THREE.MeshStandardNodeMaterial({map:plasterMap,roughness:.89});
  const trim=mat('#b7ac99',.91,0,'plaster'),metal=mat('#656f72',.43,.56),stone=mat('#a49d90',.92,0,'plaster');
  const glass=new THREE.MeshPhysicalNodeMaterial({color:'#597d8b',metalness:.25,roughness:.20,clearcoat:.45});
  const glassWarm=new THREE.MeshPhysicalNodeMaterial({color:'#b2a992',metalness:.05,roughness:.22});glassWarm.emissiveNode=color('#ebc597').mul(power).mul(.55);
  const shadow=mat('#343d41',.98),curtain=mat('#d8cdb5',.91,0,'fabric');
  // Wall piers and spandrels leave actual recesses, instead of windows painted on a box.
  box(root,[4.2,height, width],[ -2.2,height/2,0],plaster,.03);
  for(let r=0;r<stories;r++){
    const y=r*floor;
    box(root,[.45,1.02,width],[.10,y+.51,0],plaster,.01);
    box(root,[.45,.78,width],[.10,y+floor-.39,0],plaster,.01);
    box(root,[.54,.10,width+.20],[.19,y+floor-.02,0],stone,.003);
    for(let col=0;col<columns;col++){
      const z=-width/2+(col+.5)*width/columns,w=2.10,wy=y+1.97,h=1.82;
      box(root,[.43,2.0,.73],[.1,y+1.97,z-width/columns/2],plaster,.004);
      box(root,[.027,h+.12,w+.10],[-.005,wy,z],shadow,.001);
      const gm=(r*7+col)%4===0?glassWarm:glass;
      box(root,[.012,h,w], [.019,wy,z],gm,.001);
      // Faint interior curtain planes behind glazing, some partly open.
      if((r+col)%3===0){box(root,[.008,h-.12,.45],[.011,wy,z-.65],curtain,.001);box(root,[.008,h-.12,.37],[.011,wy,z+.72],curtain,.001);}
      for(const zz of[z-w/2,z,z+w/2])box(root,[.074,h+.12,.037],[.063,wy,zz],metal,.003);
      for(const yy of[wy-h/2,wy+h/2])box(root,[.074,.047,w+.10],[.063,yy,z],metal,.003);
      box(root,[.20,.085,w+.24],[.098,y+1.025,z],trim,.008);
      // Alternating balconies with a slab, guard rail, planters and a drying pole.
      if((col+r)%3!==0){
        box(root,[.95,.15,2.52],[.63,y+.91,z],stone,.012);
        for(const xx of[.35,1.03])rod(root,[xx,y+1.05,z-1.15],[xx,y+2.1,z-1.15],.017,metal);
        for(const zz of[z-1.15,z+1.15]){rod(root,[1.03,y+1.08,zz],[1.03,y+2.1,zz],.017,metal);rod(root,[.28,y+2.1,zz],[1.03,y+2.1,zz],.018,metal);}
        rod(root,[1.03,y+2.1,z-1.16],[1.03,y+2.1,z+1.16],.020,metal);
        for(let k=0;k<14;k++)rod(root,[1.03,y+1.04,z-1.10+k*.17],[1.03,y+2.06,z-1.10+k*.17],.009,metal);
        if(col%2===0){box(root,[.28,.20,.52],[.69,y+1.15,z-.67],mat('#786956',.88),.02);for(let k=0;k<6;k++)curve(root,[[.7,y+1.24,z-.82+k*.06],[.76,y+1.37,z-.87+k*.06],[.76,y+1.54,z-.85+k*.06]],.012,mat('#678451',.86));}
      }
      // Weathered split-system compressor, slatted vent and actual circular fan grille.
      if((col+2*r)%4===1){
        const ac=new THREE.Group();ac.position.set(.32,y+1.14,z+.65);root.add(ac);
        box(ac,[.40,.48,.75],[0,0,0],mat('#b9b4a5',.68,.15),.012);
        const fan=cyl(ac,.168,.168,.018,[.208,0,-.10],mat('#484f50',.63,.20),48);fan.rotation.z=Math.PI/2;
        for(let k=0;k<10;k++)rod(ac,[.224,-.145+k*.031,-.245],[.224,-.145+k*.031,.045],.0035,metal);
        for(let k=0;k<6;k++)box(ac,[.009,.018,.19],[.208,-.12+k*.042,.235],shadow,.001);
        curve(root,[[.40,y+.98,z+.93],[.40,y+.8,z+1.02],[.38,y+.65,z+1.02]],.020,mat('#ddd1b9'));
      }
      // Runoff comes from real sills and balcony edges, rather than uniform noise.
      for(let k=0;k<2;k++)box(root,[.001,.25+rnd()*.42,.013+rnd()*.013],[.328,y+.71,z+(rnd()-.5)*1.8],mat('#b9ac95',.98),0);
    }
  }
  for(const z of[-width/2+.10,width/2-.18]){
    rod(root,[.42,.3,z],[.42,height-.1,z],.044,mat('#8b8377',.65,.32));
    for(let y=1;y<height;y+=floor)box(root,[.11,.034,.14],[.42,y,z],metal,.004);
  }
  box(root,[4.55,.22,width+.28],[-1.8,height+.05,0],stone,.01);
  box(root,[.22,.57,width+.08],[.23,height+.35,0],plaster,.01);
  for(let k=0;k<3;k++)box(root,[1.08,.83,1.2],[-1.9,height+.63,-4+k*4.1],mat('#9ca8a7',.8,.15),.015);
  return{root,power};
}
