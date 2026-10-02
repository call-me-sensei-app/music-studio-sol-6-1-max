import * as THREE from 'three/webgpu';
/** Purpose-built lightweight pick geometry. The rendered room is never triangle-tested on every mouse move. */
export function interactionPicking({room,deck,keyboard,guitars,breeze,props}){const proxies=[],live=[];const material=new THREE.MeshBasicNodeMaterial();
 function proxy(parent,size,position,data){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.updateMatrix();mesh.userData=data;proxies.push({mesh,parent});return mesh;}
 proxy(deck.root,[.47,.05,.365],[0,0,0],{instrument:'turntable'});live.push(deck.disc);for(const o of[deck.pitch,deck.cueLever,deck.arm,deck.lid])o.traverse(n=>{if(n.isMesh)live.push(n);});deck.root.traverse(n=>{if(n.isMesh&&n.userData.action&&n!==deck.disc&&!live.includes(n))live.push(n);});
 room.root.traverse(n=>{if(!n.isMesh)return;let o=n;while(o&&!o.userData.action)o=o.parent;if(o&&['records','sustain'].includes(o.userData.action))live.push(n);});keyboard.keys.forEach(k=>live.push(k.mesh));proxy(keyboard.root,[2.12,.13,.49],[0,0,0],{instrument:'keyboard'});
 guitars.forEach((g,i)=>{proxy(g.root,[.63,.82,.11],[0,.005,.048],{instrument:'guitars',guitar:i});proxy(g.root,[.11,.98,.09],[0,.63,.03],{instrument:'guitars',guitar:i});});
 proxy(props.bean,[1.7,1.1,1.65],[0,.5,0],{action:'beanbag'});proxy(breeze.pane,[.08,1.68,1.30],[0,0,-.637],{action:'window'});
 proxy(room.root,[.10,.24,.17],[4.046,1.44,.30],{action:'lights'});proxy(room.root,[2.3,1.52,.50],[2.86,.76,-2.89],{action:'records'});
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();ray.params.Line.threshold=.014;
 return{xray:false,hit(x,y,camera){room.root.updateWorldMatrix(true,true);for(const p of proxies)p.mesh.matrixWorld.copy(p.parent.matrixWorld).multiply(p.mesh.matrix);mouse.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects([...live,...proxies.map(p=>p.mesh)],false);if(!hits.length)return null;const h=hits[0];let o=h.object;while(o&&!o.userData.instrument&&!o.userData.action)o=o.parent;return o?{...h,owner:o,data:o.userData}:null;}};
}
