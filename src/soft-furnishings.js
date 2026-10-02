import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {curve} from './geometry.js';import {mat} from './materials.js';

/** Cloth-filled forms: soft seat depressions, imperfect pillow bulges and sewn piping. */
export function refineSoftFurnishings(room){
  const parts=[];
  room.root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.geometry.type!=='RoundedBoxGeometry')return;
    const p=mesh.position,seat=Math.abs(p.y-.61)<.001&&Math.abs(p.z-1.9)<.001,pillow=Math.abs(p.y-.89)<.001&&Math.abs(p.z-2.17)<.001,back=Math.abs(p.y-.66)<.001&&Math.abs(p.z-2.36)<.001;
    if(!seat&&!pillow&&!back)return;
    const {width:w,height:h,depth:d,radius:r}=mesh.geometry.parameters,g=new RoundedBoxGeometry(w,h,d,6,r),a=g.attributes.position;
    function deform(x,y,z){let u=x/(w*.5),v=seat?z/(d*.5):y/(h*.5);
      const edge=Math.max(0,1-u*u)*Math.max(0,1-v*v),crease=Math.sin(u*27+v*7)*.0018*Math.max(0,Math.abs(u)-.65);
      if(seat&&y>0)y-=.019*Math.exp(-((u-.13)**2)*3-((v+.03)**2)*3)+crease;
      if(pillow){z+=Math.sign(z)*(.021*edge+crease);y-=.008*(1-u*u);x+=.004*Math.sin(v*4)*edge;}
      if(back&&z<0)z-=.014*edge*(.6+.4*Math.sin(u*7+1));
      return[x,y,z];}
    for(let i=0;i<a.count;i++)a.setXYZ(i,...deform(a.getX(i),a.getY(i),a.getZ(i)));
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();mesh.geometry=g;mesh.name=seat?'SofaSoftSeat':pillow?'SofaFilledPillow':'SofaSoftBack';parts.push(mesh);
    if(back)return;
    const points=[],plane=seat?h*.12:d*.40,depthToCore=Math.max(0,Math.abs(plane)-(seat?h:d)*.5+r),crossRadius=Math.sqrt(Math.max(.00001,r*r-depthToCore*depthToCore))-.0015,radius=Math.max(.004,crossRadius),hw=w*.5-r+radius,hh=(seat?d:h)*.5-r+radius;
    for(const[cx,cy,start]of[[hw-radius,hh-radius,0],[-hw+radius,hh-radius,Math.PI/2],[-hw+radius,-hh+radius,Math.PI],[hw-radius,-hh+radius,Math.PI*1.5]])for(let j=0;j<10;j++){
      const angle=start+j/9*Math.PI/2,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
      points.push(seat?deform(x,plane,y):deform(x,y,plane));
    }
    points.push(points[0]);const piping=curve(mesh,points,.0014,mat(pillow?'#c5ad99':'#b28d9d',.96,0,'fabric'));piping.name='SewnCushionPiping';piping.userData.nonPhysical=true;
  });
  return parts;
}
