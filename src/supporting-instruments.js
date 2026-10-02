import * as THREE from 'three/webgpu';
import {activeInstruments,mainInstrument,INSTRUMENT_NAMES,PART_COLORS} from './composition.js';
/** Live secondary views reuse geometry and one renderer/context. No screenshot stand-ins. */
export function supportingInstruments({renderer,scene,keyboard,guitars,onSelect}){
  const element=document.createElement('aside');element.id='supporting-instruments';element.hidden=true;element.setAttribute('aria-label','Supporting instruments');document.querySelector('#app').append(element);
  const entries=new Map(),viewport=new THREE.Vector4(),scissor=new THREE.Vector4();let signature='',ids=[];
  function make(id){const source=id==='keyboard'?keyboard.root:guitars[Number(id.split('-')[1])].root,clone=source.clone(true),original=[],copied=[];source.traverse(o=>original.push(o));clone.traverse(o=>copied.push(o));
    const world=new THREE.Scene();world.environment=scene.environment;world.environmentIntensity=.6;world.add(new THREE.HemisphereLight('#eee7df','#67536c',2));const key=new THREE.DirectionalLight('#ffe7c2',3);key.position.set(-2,3,4);world.add(key);const rim=new THREE.DirectionalLight('#b3c9ec',1);rim.position.set(3,1,-2);world.add(rim);
    const holder=new THREE.Group();holder.add(clone);world.add(holder);const camera=new THREE.PerspectiveCamera(id==='keyboard'?36:38,190/106,.02,20);
    clone.position.set(0,0,0);clone.quaternion.identity();clone.scale.setScalar(1);if(id==='keyboard'){camera.position.set(0,1.5,1.6);camera.lookAt(0,.035,.08);}else{holder.rotation.z=.78;const centre=new THREE.Vector3(0,.46,.05).applyEuler(holder.rotation);camera.position.copy(centre).add(new THREE.Vector3(0,.02,2.55));camera.lookAt(centre);}
    // Geometry backdrop, not Scene.background: a WebGPU attachment clear would erase the full main view.
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicNodeMaterial({color:'#18272a',depthTest:false,depthWrite:false}));backdrop.renderOrder=-100;backdrop.position.set(0,0,-7);backdrop.scale.set(Math.tan(camera.fov*Math.PI/360)*7*camera.aspect,Math.tan(camera.fov*Math.PI/360)*7,1);camera.add(backdrop);world.add(camera);
    const card=document.createElement('button');card.className='support-card';card.style.setProperty('--part-color',PART_COLORS[id]);card.setAttribute('aria-label','Make '+INSTRUMENT_NAMES[id]+' the main instrument');card.innerHTML='<div class="support-label"><span>'+INSTRUMENT_NAMES[id]+'</span><small>MAKE MAIN ↗</small></div><div class="support-viewport"></div>';card.onclick=()=>onSelect(id);element.append(card);
    return{world,camera,clone,source,original,copied,card,area:card.querySelector('.support-viewport')};
  }
  function show(project){const lead=mainInstrument(project),next=activeInstruments(project).filter(id=>id!==lead),key=next.join('|');if(key===signature){element.hidden=!next.length;return;}signature=key;ids=next;for(const [id,e]of entries)e.card.hidden=!ids.includes(id);for(const id of ids){if(!entries.has(id))entries.set(id,make(id));entries.get(id).card.hidden=false;}element.hidden=!ids.length;}
  function hide(){element.hidden=true;}
  function render(visible=true){element.style.visibility=visible?'':'hidden';if(element.hidden||!visible||document.body.classList.contains('cinema'))return;const auto=renderer.autoClear,test=renderer.getScissorTest(),target=renderer.getRenderTarget();renderer.getViewport(viewport);renderer.getScissor(scissor);renderer.autoClear=false;
    try{for(const id of ids){const e=entries.get(id),rect=e.area.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)continue;for(let i=1;i<e.original.length;i++){const a=e.original[i],b=e.copied[i];b.position.copy(a.position);b.quaternion.copy(a.quaternion);b.scale.copy(a.scale);if(!a.matrixAutoUpdate){b.matrix.copy(a.matrix);b.matrixWorldNeedsUpdate=true;}b.visible=a.visible&&!a.userData.nonPhysical;if(a.isInstancedMesh){b.count=a.count;b.instanceMatrix=a.instanceMatrix;b.instanceColor=a.instanceColor;}}
      e.camera.aspect=rect.width/rect.height;e.camera.updateProjectionMatrix();renderer.setRenderTarget(null);renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.render(e.world,e.camera);}}
    finally{renderer.setRenderTarget(target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.autoClear=auto;}
  }
  return{show,hide,render,get count(){return element.hidden?0:ids.length;},dispose(){for(const e of entries.values()){const b=e.camera.children[0];b?.geometry?.dispose();b?.material?.dispose();}element.remove();}};
}
