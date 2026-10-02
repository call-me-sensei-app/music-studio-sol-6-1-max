import * as THREE from 'three/webgpu';
import {box,cyl,rod,sphere,torus,label} from './geometry.js';
import {palette as P,mat} from './materials.js';

/** One shared centreline and nut datum. Whole-instrument holding tilt is separate. */
export function buildGuitarNeck(root,electric,nutY){
  const shaftTop=nutY+.009,boardTop=nutY-.0065;
  const shaft=box(root,[.081,shaftTop-.240,.050],[0,(shaftTop+.240)/2,.049],P.walnut,.005);shaft.name='NeckShaft';
  const board=box(root,[.090,boardTop-.1575,.018],[0,(boardTop+.1575)/2,.085],mat('#3c302d',.47,0,'wood'),.003);board.name='Fingerboard';
  const shape=new THREE.Shape();shape.moveTo(-.0405,0);
  shape.bezierCurveTo(-.042,.016,-.060,.033,-.060,.055);
  shape.lineTo(-.060,.207);shape.quadraticCurveTo(-.060,.230,-.037,.230);
  shape.lineTo(.037,.230);shape.quadraticCurveTo(.060,.230,.060,.207);
  shape.lineTo(.060,.055);shape.bezierCurveTo(.060,.033,.042,.016,.0405,0);shape.closePath();
  const headstock=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:3,curveSegments:20}),mat(electric?'#c2a06c':'#976c47',.43,0,'wood'));
  headstock.name='AlignedHeadstock';headstock.position.set(0,nutY+.002,.0295);headstock.castShadow=true;headstock.receiveShadow=true;root.add(headstock);
  const nut=box(root,[.085,.013,.012],[0,nutY,.099],P.cream,.001);nut.name='Nut';
  label(root,'afterlight',.078,.022,[0,nutY+.146,.0777],{font:'Georgia',color:'#ead6ad'});
  const posts=[],headStrings=[];
  for(let string=0;string<6;string++){
    const side=electric?-1:string<3?-1:1;
    const row=electric?string:string<3?string:5-string;
    const x=side*(electric?.035:.039),y=nutY+(electric?.038:.050)+row*(electric?.033:.057);
    const post=cyl(root,.006,.006,.016,[x,y,.082],P.metal,20);post.rotation.x=Math.PI/2;post.name='TunerPost'+string;posts.push(post);
    torus(root,.0085,.001,[x,y,.077],P.metal,[0,0,0]);
    rod(root,[x,y,.043],[side*.077,y,.043],.003,P.metal);
    const button=sphere(root,[.012,.008,.007],[side*.077,y,.043],P.metal);button.name='TunerButton'+string;
    const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3((string-2.5)*.0135,nutY+.003,.101),new THREE.Vector3(x,y,.090)]);
    const line=new THREE.Line(geometry,new THREE.LineBasicNodeMaterial({color:string<3?'#d7bd92':'#bcc2b7'}));line.name='StringBehindNut'+string;root.add(line);headStrings.push(line);
  }
  return{shaft,board,headstock,nut,posts,headStrings};
}
