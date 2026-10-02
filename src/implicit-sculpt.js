import * as THREE from 'three/webgpu';

export function ellipsoidDistance(x,y,z,e){
  const a=x-e[0],b=y-e[1],c=z-e[2],rx=e[3],ry=e[4],rz=e[5];
  const k0=Math.hypot(a/rx,b/ry,c/rz),k1=Math.hypot(a/(rx*rx),b/(ry*ry),c/(rz*rz));
  return k1>1e-10?k0*(k0-1)/k1:-Math.min(rx,ry,rz);
}
export function smoothUnion(a,b,k=.02){if(!Number.isFinite(a))return b;if(!Number.isFinite(b))return a;const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b*(1-h)+a*h-k*h*(1-h);}

/** Welded marching-tetrahedra surface, with continuous field-gradient normals. */
export function sculpt(field,{min,max,cells=[40,40,40],colorAt,minTriangleAreaSq=1e-16}={}){
  const [nx,ny,nz]=cells,sx=nx+1,sy=ny+1,dx=(max[0]-min[0])/nx,dy=(max[1]-min[1])/ny,dz=(max[2]-min[2])/nz;
  const values=new Float32Array(sx*sy*(nz+1)),index=(x,y,z)=>x+sx*(y+sy*z);
  for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const value=field(min[0]+x*dx,min[1]+y*dy,min[2]+z*dz);if(!Number.isFinite(value))throw Error('Sculpt field contains a non-finite value.');values[index(x,y,z)]=value;}
  const vertices=[],normals=[],colors=[],indices=[],edges=new Map(),epsilon=Math.min(dx,dy,dz)*.22;
  const point=id=>{const x=id%sx,y=Math.floor(id/sx)%sy,z=Math.floor(id/(sx*sy));return[min[0]+x*dx,min[1]+y*dy,min[2]+z*dz];};
  function edge(a,b){const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key);const pa=point(a),pb=point(b),t=values[a]/(values[a]-values[b]),p=pa.map((v,i)=>v+(pb[i]-v)*t);const id=vertices.length/3;vertices.push(...p);
    const normal=[field(p[0]+epsilon,p[1],p[2])-field(p[0]-epsilon,p[1],p[2]),field(p[0],p[1]+epsilon,p[2])-field(p[0],p[1]-epsilon,p[2]),field(p[0],p[1],p[2]+epsilon)-field(p[0],p[1],p[2]-epsilon)];const n=Math.hypot(...normal)||1;normals.push(...normal.map(v=>v/n));if(colorAt)colors.push(...colorAt(...p));edges.set(key,id);return id;
  }
  const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const ids=[index(x,y,z),index(x+1,y,z),index(x+1,y+1,z),index(x,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x+1,y+1,z+1),index(x,y+1,z+1)];
    for(const tet of tetrahedra){const corners=tet.map(i=>ids[i]),signs=corners.map(i=>values[i]<0);if(signs.every(Boolean)||signs.every(v=>!v))continue;const polygon=[];for(const[a,b]of pairs)if(signs[a]!==signs[b])polygon.push(edge(corners[a],corners[b]));
      const center=new THREE.Vector3(),normal=new THREE.Vector3();for(const id of polygon){center.add(new THREE.Vector3(...vertices.slice(id*3,id*3+3)));normal.add(new THREE.Vector3(...normals.slice(id*3,id*3+3)));}center.multiplyScalar(1/polygon.length);normal.normalize();
      const axis=new THREE.Vector3(...vertices.slice(polygon[0]*3,polygon[0]*3+3)).sub(center).normalize(),other=new THREE.Vector3().crossVectors(normal,axis).normalize();
      polygon.sort((a,b)=>{const p=new THREE.Vector3(...vertices.slice(a*3,a*3+3)).sub(center),q=new THREE.Vector3(...vertices.slice(b*3,b*3+3)).sub(center);return Math.atan2(p.dot(other),p.dot(axis))-Math.atan2(q.dot(other),q.dot(axis));});
      for(let i=1;i<polygon.length-1;i++){const a=polygon[0],b=polygon[i],c=polygon[i+1],pa=new THREE.Vector3(...vertices.slice(a*3,a*3+3)),pb=new THREE.Vector3(...vertices.slice(b*3,b*3+3)),pc=new THREE.Vector3(...vertices.slice(c*3,c*3+3));if(new THREE.Vector3().crossVectors(pb.sub(pa),pc.sub(pa)).lengthSq()>minTriangleAreaSq)indices.push(a,b,c);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[(vertices[i]-min[0])/(max[0]-min[0]),(vertices[i+1]-min[1])/(max[1]-min[1])]:[]),2));
  if(colorAt)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function frontSurface(field,x,y){
  let previous=.23,previousValue=field(x,y,previous);
  for(let z=.225;z>=-.15;z-=.005){const value=field(x,y,z);if(value<=0&&previousValue>0){let low=z,high=previous;for(let i=0;i<9;i++){const mid=(low+high)/2;if(field(x,y,mid)>0)high=mid;else low=mid;}return(low+high)/2;}previous=z;previousValue=value;}
  return .06;
}
