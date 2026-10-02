import {hasPerf} from './runtime-performance.js';
import {buildGuitarNeck} from './guitar-neck.js';
import {applyKeyAction} from './key-action.js';
import {THREE,box,cyl,rod,curve,torus,sphere,plane,label,outline} from './geometry.js';
import {mat,glow,palette as P,decal,canvasTexture} from './materials.js';
import {DECK,TAU,stylusPosition,KeyMechanics,guitarFrequency} from './mechanics.js';
import {RECORDS} from './audio.js';import {recordLabel,albumArt} from './artwork.js';
export function buildTurntable(parent){const root=new THREE.Group();root.position.set(1.37,1.09,.66);root.scale.setScalar(4/3);parent.add(root);root.userData.instrument='turntable';
 const base=box(root,[.47,.05,.365],[0,0,0],P.walnut,.009);outline(base,.018);box(root,[.455,.007,.35],[0,.029,0],mat('#344244',.35,.65),.005);
 for(const x of[-.185,.185])for(const z of[-.135,.135]){cyl(root,.023,.026,.015,[x,-.031,z],P.black);torus(root,.021,.002,[x,-.033,z],P.metal);}
 const centre=new THREE.Vector2(-.06,.018),pivotTheta=-.69,pivot={x:centre.x+DECK.pivotDistance*Math.cos(pivotTheta),z:centre.y+DECK.pivotDistance*Math.sin(pivotTheta)};
 const platter=new THREE.Group();platter.position.set(centre.x,.052,centre.y);root.add(platter);
 cyl(platter,.151,.151,.027,[0,0,0],mat('#9aa6a5',.2,.86),128);torus(platter,.151,.0019,[0,.011,0],P.metal);
 const dotGeom=new THREE.SphereGeometry(.00085,6,4),dots=new THREE.InstancedMesh(dotGeom,glow('#e0dbbf'),360),matrix=new THREE.Matrix4();for(let i=0;i<360;i++){const row=Math.floor(i/120),a=i%120/120*TAU;matrix.makeTranslation(Math.cos(a)*.1515,-.008+row*.006,Math.sin(a)*.1515);dots.setMatrixAt(i,matrix);}platter.add(dots);
 cyl(platter,.148,.148,.0018,[0,.015,0],P.black,128);
 const vinyl=new THREE.Group();platter.add(vinyl);const disc=cyl(vinyl,.1524,.1524,.0017,[0,.017,0],mat('#151d25',.32,.47,'vinyl'),160);disc.userData.action='scratch';
 for(const r of[.150,.146,.061,.054])torus(vinyl,r,.0002,[0,.0181,0],mat('#383944',.45,.2));
 const labelDisc=cyl(vinyl,.049,.049,.0004,[0,.0182,0],new THREE.MeshStandardNodeMaterial({map:recordLabel(RECORDS[0]),roughness:.88}),96);cyl(root,.0036,.0036,.021,[centre.x,.081,centre.y],P.metal);
 // Real effective-length arm geometry, pivot and counterweight (model is uniformly enlarged for scene staging).
 cyl(root,.024,.03,.03,[pivot.x,.044,pivot.z],P.black);cyl(root,.019,.019,.025,[pivot.x,.06,pivot.z],P.metal);torus(root,.025,.0023,[pivot.x,.069,pivot.z],P.brass,[Math.PI/2,0,0]);
 const arm=new THREE.Group();arm.position.set(pivot.x,.088,pivot.z);root.add(arm);arm.userData.action='arm';
 curve(arm,[[0,0,-.052],[0,0,.05],[.012,0,.124],[.013,0,.168],[0,0,.205]],.0033,P.metal);
 const cw=cyl(arm,.013,.013,.028,[0,0,-.052],mat('#788687',.24,.8));cw.rotation.x=Math.PI/2;for(let i=0;i<13;i++)torus(arm,.0133,.00035,[0,0,-.066+i*.002],P.black,[0,0,0]);
 box(arm,[.014,.005,.037],[0,-.002,.215],P.ink,.002);rod(arm,[.007,.003,.21],[.018,.014,.224],.0014,P.metal);box(arm,[.009,.012,.015],[0,-.009,.227],mat('#a5584c',.4),.002);rod(arm,[0,-.015,.229],[0,-.018,.23],.00045,P.brass);const screw=cyl(arm,.0014,.0014,.001,[0,.001,.216],P.metal);
 const rest=cyl(root,.003,.003,.036,[.184,.055,.112],P.metal);box(root,[.018,.009,.018],[.184,.076,.112],P.black,.002);rest.userData.action='arm';
 const cueLever=new THREE.Group();cueLever.position.set(pivot.x+.037,.058,pivot.z+.01);root.add(cueLever);rod(cueLever,[0,0,0],[0,.025,.004],.0015,P.metal);cyl(cueLever,.004,.004,.012,[0,.025,.004],P.black);cueLever.userData.action='cue';
 cyl(root,.009,.009,.013,[pivot.x+.035,.037,pivot.z-.028],P.black);label(root,'ANTI-SKATE',.04,.008,[pivot.x+.035,.032,pivot.z-.049],{rot:[-Math.PI/2,0,0],color:'#c5cbbb'});
 const power=cyl(root,.012,.012,.009,[-.207,.037,.14],P.metal);power.userData.action='power';cyl(root,.004,.004,.012,[-.208,.041,.14],P.ink);const led=cyl(root,.0022,.0022,.001,[-.19,.034,.143],glow('#e69868'));
 const start=box(root,[.024,.009,.021],[-.172,.037,.142],P.metal,.0015);start.userData.action='motor';label(root,'START / STOP',.055,.006,[-.174,.034,.16],{rot:[-Math.PI/2,0,0],color:'#bdc8b9'});
 for(let i=0;i<2;i++){const b=box(root,[.02,.004,.011],[-.2+i*.025,.034,.106],P.ink,.001);b.userData.action=i?'rpm45':'rpm33';label(root,i?'45':'33',.015,.006,[-.2+i*.025,.038,.105],{rot:[-Math.PI/2,0,0],color:'#e6dcc7'});}
 box(root,[.005,.001,.078],[.208,.034,.107],P.black,.001);const pitch=box(root,[.015,.008,.009],[.208,.04,.107],P.metal,.001);pitch.userData.action='pitch';for(let i=0;i<9;i++)box(root,[.006,.0008,.0006],[.198,.034,.071+i*.009],P.cream,0);label(root,'PITCH',.029,.007,[.208,.034,.052],{rot:[-Math.PI/2,0,0],color:'#c5cbbb'});
 label(root,'AFTERLIGHT',.091,.013,[.112,.034,.153],{rot:[-Math.PI/2,0,0],color:'#e2d4bb',weight:650});label(root,'DD–01 / QUARTZ DIRECT DRIVE',.096,.006,[.112,.034,.165],{rot:[-Math.PI/2,0,0],color:'#91a59c'});
 // Clear hinged acrylic lid: no invisible solid wall over the stylus.
 const lid=new THREE.Group();lid.position.set(0,.03,-.179);root.add(lid);const acrylic=new THREE.MeshPhysicalNodeMaterial({color:'#b9cbc6',roughness:.21,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,metalness:.05});
 box(lid,[.475,.0018,.36],[0,.088,.18],acrylic,.001);for(const x of[-.236,.236])box(lid,[.0018,.088,.36],[x,.044,.18],acrylic,.001);box(lid,[.475,.088,.0018],[0,.044,.359],acrylic,.001);lid.rotation.x=-1.1;lid.userData.action='lid';
 for(const x of[-.165,.165])box(root,[.025,.014,.009],[x,.028,-.185],P.metal,.002);
 // Hairline scratches in acrylic; brushed knob arcs and cabinet rub marks.
 for(let i=0;i<12;i++){const x=-.15+Math.sin(i*16)*.08,z=.06+(i/12)*.24;rod(lid,[x,.089,z],[x+.018+i*.001,.089,z+.007],.000075,mat('#d9ddcc',.3));}
 for(let i=0;i<8;i++)rod(root,[.2-i*.005,.023,.182],[.204-i*.005,.024,.182],.0005,mat('#b39163'));
 let lidTarget=-1.1;return{root,platter,disc,arm,centre,pivotTheta,pivot,lid,pitch,led,cueLever,labelDisc,
 setArtwork(record,side){labelDisc.material.map=recordLabel(record,side);labelDisc.material.needsUpdate=true;},
 toggleLid(){lidTarget=lidTarget?0:-1.1;},
 update(m,dt){platter.rotation.y=-m.angle;vinyl.rotation.y=-(m.recordAngle-m.angle);pitch.position.z=.107-m.pitch/8*.035;cueLever.rotation.x=m.cue*.55;lid.rotation.x+=(lidTarget-lid.rotation.x)*(1-Math.exp(-dt*5));
  if(m.arm==='groove'){const p=stylusPosition(m.grooveRadius),c=Math.cos(pivotTheta),s=Math.sin(pivotTheta),x=centre.x+p.x*c-p.z*s,z=centre.y+p.x*s+p.z*c;const target=Math.atan2(x-pivot.x,z-pivot.z);arm.rotation.y+=(target-arm.rotation.y)*(1-Math.exp(-dt*7));}else if(m.arm==='rest')arm.rotation.y+=(.26-arm.rotation.y)*(1-Math.exp(-dt*4));arm.rotation.x=-m.cue*.043;cw.position.z=-.052+(m.trackingForce-1.8)*.0023;
 }};
}
export function buildKeyboard(parent){const root=new THREE.Group();root.position.set(-1.69,1.09,-2.105);parent.add(root);root.userData.instrument='keyboard';const body=box(root,[2.12,.13,.49],[0,-.018,0],mat('#273432',.42,.25),.028);body.name='RecessedKeyboardKeybed';outline(body,.018);
 const keys=[],white=[],black=[],start=-.7956,w=.0312;let wi=0;
 for(let midi=21;midi<=108;midi++){const isBlack=[1,3,6,8,10].includes(midi%12);let x;if(!isBlack){x=start+wi*w;wi++;}else x=start+(wi-.52)*w;const g=new THREE.Group();g.position.set(x,isBlack?.09:.063,-.086);root.add(g);const key=box(g,[isBlack?w*.59:w*.97,isBlack?.026:.023,isBlack?.175:.30],[0,0,isBlack?.077:.143],isBlack?mat('#1c2425',.35):mat('#f3ead5',.38),.003);key.userData.instrument='keyboard';key.userData.midi=midi;key.userData.action='key';const state=new KeyMechanics(midi);keys.push({mesh:key,pivot:g,state,isBlack,restY:g.position.y,sources:new Map()});(isBlack?black:white).push(key);
  if(!isBlack&&midi%12===0)label(g,'C'+(Math.floor(midi/12)-1),.022,.011,[0,.012,.277],{rot:[-Math.PI/2,0,0],color:'#ada58b'});
  if(!isBlack&&midi>=60&&midi<=74){const tex=canvasTexture(128,128,(c)=>{c.clearRect(0,0,128,128);c.fillStyle='#ded3b344';c.fillRect(7,7,112,112);c.strokeStyle='#968b7066';c.strokeRect(7,7,112,112);});plane(g,.019,.022,[0,.012,.234],tex,[-Math.PI/2,0,0]);}
 }
 box(root,[1.65,.017,.092],[0,.076,-.193],P.ink,.006);
 for(let i=0;i<8;i++){const k=cyl(root,.013,.011,.016,[-.76+i*.07,.091,-.193],P.black,20);rod(root,[k.position.x,.100,-.193],[k.position.x,.100,-.186],.001,P.cream);}
 for(let i=0;i<8;i++)box(root,[.03,.004,.024],[.36+i*.04,.09,-.193],mat(i%2?'#c09676':'#86947f'),.003);
 const screenTex=canvasTexture(512,160,(c,w,h)=>{c.fillStyle='#839684';c.fillRect(0,0,w,h);c.fillStyle='#182b22';c.font='28px monospace';c.fillText('AFTERLIGHT / GRAND',20,50);c.font='22px monospace';c.fillText('C4    A = 440 Hz    SUSTAIN OFF',20,105);});const screen=plane(root,.32,.062,[-.03,.09,-.192],screenTex,[-Math.PI/2,0,0]);label(root,'STUDIO / 88',.16,.022,[.88,.075,-.19],{rot:[-Math.PI/2,0,0],color:'#b7c1a7'});
 // Mod/pitch wheels, side cheeks with chipped finish, damper pedal and its cable.
 for(const x of[-.96,-.90]){const wheel=cyl(root,.027,.027,.022,[x,.07,.087],P.black);wheel.rotation.z=Math.PI/2;for(let i=0;i<8;i++)box(root,[.025,.002,.003],[x,.091,.067+i*.005],P.metal,0);}
 for(const x of[-1.03,1.03])box(root,[.04,.11,.47],[x,0,0],P.walnut,.01);
 const pedal=box(parent,[.1,.037,.2],[-1.19,.071,-1.84],P.black,.009);pedal.userData.action='sustain';pedal.userData.instrument='keyboard';box(parent,[.055,.02,.12],[-1.19,.09,-1.84],P.metal,.004);curve(parent,[[-1.19,.052,-1.94],[-1.1,.03,-2.28],[-.27,.03,-2.67],[-.4,1.1,-2.26]],.007,P.black);
 return{root,body,keys,screen,setDisplay(text,sustain){const c=screenTex.image.getContext('2d');c.fillStyle='#839684';c.fillRect(0,0,512,160);c.fillStyle='#182b22';c.font='28px monospace';c.fillText('AFTERLIGHT / GRAND',20,50);c.font='22px monospace';c.fillText(text+'    A=440   '+(sustain?'SUS ON':'SUS OFF'),20,105);screenTex.needsUpdate=true;},press(midi,v=.75,owner='manual'){const k=keys.find(k=>k.state.midi===midi);if(k){k.sources.set(owner,Number.isFinite(v)?v:.75);k.state.press(Math.max(...k.sources.values()));}},release(midi,owner='manual'){const k=keys.find(k=>k.state.midi===midi);if(k){k.sources.delete(owner);if(k.sources.size)k.state.press(Math.max(...k.sources.values()));else k.state.release();}},update(dt){for(const k of keys){const previous=k.state.travel;k.state.step(dt);if(!hasPerf('idle_keys')||k.state.travel!==previous||k.lastAppliedTravel!==k.state.travel){applyKeyAction(k);k.lastAppliedTravel=k.state.travel;}}}};
}
function guitarShape(type){const s=new THREE.Shape();s.moveTo(0,-.37);s.bezierCurveTo(-.33,-.39,-.33,-.02,-.205,.10);s.bezierCurveTo(-.14,.2,-.25,.24,-.19,.37);s.bezierCurveTo(-.14,.47,-.06,.42,0,.40);if(type===1){s.bezierCurveTo(.08,.35,.13,.51,.18,.43);s.bezierCurveTo(.24,.3,.08,.23,.18,.12);}else{s.bezierCurveTo(.08,.42,.23,.46,.215,.3);s.bezierCurveTo(.2,.21,.11,.20,.205,.1);}s.bezierCurveTo(.34,-.02,.32,-.4,0,-.37);return s;}
export function buildGuitars(parent){const types=['Cedar / steel string','Sage / single coil','Ivory / hollow body'];return types.map((name,i)=>{const root=new THREE.Group();root.position.set(-2.94+i*.88,1.95,-3.07);root.rotation.z=[-.07,.075,-.05][i];root.scale.setScalar(.70);parent.add(root);root.userData.instrument='guitars';root.userData.guitar=i;
 const g=new THREE.ExtrudeGeometry(guitarShape(i),{depth:.068,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.014,bevelThickness:.01,curveSegments:24});const body=new THREE.Mesh(g,mat(['#ac663e','#6d9287','#d8bd8f'][i],.36,0,i===1?'plain':'wood'));root.add(body);body.castShadow=true;body.receiveShadow=true;outline(body,.015);
 const binding=new THREE.EdgesGeometry(g,28),lines=new THREE.LineSegments(binding,new THREE.LineBasicNodeMaterial({color:i===1?'#344b42':'#ead3a3'}));root.add(lines);
 const nutY=1.045,bridgeY=-.19,scale=nutY-bridgeY,neck=buildGuitarNeck(root,i===1,nutY);
 for(let f=1;f<=22;f++){const y=nutY-scale*(1-2**(-f/12));rod(root,[-.046,y,.097],[.046,y,.097],.0018,P.metal);if([3,5,7,9,12,15,17,19,21].includes(f)){const dy=scale*(2**(-(f-1)/12)-2**(-f/12))*.45;sphere(root,[.0038,.0038,.0015],[0,y+dy,.096],P.cream);}}
 if(i===0){const hole=cyl(root,.089,.089,.003,[0,.16,.081],P.black,80);hole.rotation.x=Math.PI/2;for(const r of[.093,.10,.106])torus(root,r,.0015,[0,.16,.084],P.brass,[0,0,0]);}
 else if(i===1){const guard=guitarShape(0);const guardMesh=new THREE.Mesh(new THREE.ShapeGeometry(guard),mat('#d5dcc6',.5));guardMesh.scale.set(.7,.67,1);guardMesh.position.set(.01,.02,.086);root.add(guardMesh);for(const y of[-.075,.075,.205])box(root,[.14,.035,.016],[0,y,.094],P.cream,.005);for(const x of[.16,.195,.20])cyl(root,.018,.018,.015,[x,-.14,.1],P.cream).rotation.x=Math.PI/2;
 }else{for(const x of[-.145,.145])curve(root,[[x,.24,.083],[x*.7,.18,.087],[x,.10,.085],[x*1.1,.02,.083]],.009,P.black);for(const y of[-.09,.12])box(root,[.16,.04,.013],[0,y,.095],P.metal,.004);}
 box(root,[.18,.047,.022],[0,bridgeY,.087],i===0?P.walnut:P.metal,.003);box(root,[.13,.008,.012],[0,bridgeY+.023,.104],P.cream,.001);
 const strings=[];for(let s=0;s<6;s++){const x=(s-2.5)*.0135,positions=new Float32Array(65*3);for(let p=0;p<=64;p++){positions[p*3]=x;positions[p*3+1]=bridgeY+scale*p/64;positions[p*3+2]=.111-(p/64)*.010;}const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(positions,3));const line=new THREE.Line(geom,new THREE.LineBasicNodeMaterial({color:s<3?'#d7bd92':'#bcc2b7'}));line.userData={instrument:'guitars',guitar:i,string:s,action:'pluck'};root.add(line);strings.push({line,x,amplitude:0,time:0,fret:0});}
 // Pickguard rubbed by the picking hand, bridge-pin grime, finish chips along the lower bout.
 const wear=canvasTexture(512,512,(c,w,h)=>{c.clearRect(0,0,w,h);c.strokeStyle='#d1b48933';c.lineWidth=.7;let seed=311;for(let j=0;j<100;j++){seed=seed*16807%2147483647;const x=250+seed/2147483647*110,y=180+(j%27)*5;c.beginPath();c.moveTo(x,y);c.lineTo(x-9-j%12,y+8);c.stroke();}c.fillStyle='#291f1433';for(let j=0;j<17;j++){c.beginPath();c.ellipse(245+(j%6)*8,430-j%3*8,2,6,0,0,TAU);c.fill();}});plane(root,.5,.72,[0,0,.122],wear);
 for(let j=0;j<14;j++){const a=3.5+j*.06;sphere(root,[.004,.003,.001],[Math.sin(a)*.274,-.15+Math.cos(a)*.22,.076],mat('#c5a072'));}
 // The wall hanger is a separate fixed assembly, never carried with the guitar.
 const mount=new THREE.Group();mount.position.copy(root.position);mount.quaternion.copy(root.quaternion);mount.scale.copy(root.scale);parent.add(mount);
 rod(mount,[0,1.015,-.04],[0,1.17,-.08],.016,P.ink);curve(mount,[[-.045,1.027,.01],[-.066,1.0,.0],[.066,1.0,.0],[.045,1.027,.01]],.009,P.ink);
 const visuals=new THREE.Group();visuals.userData.nonPhysical=true;for(const child of [...root.children])visuals.add(child);root.add(visuals);root.userData.dynamicSolid=true;
 const solid=box(root,[.63,1.70,.15],[0,.435,.038],P.ink,0);solid.visible=false;solid.name='GuitarCollisionProxy';
 return{root,visuals,mount,neck,name,type:i,strings,detunes:[0,0,0,0,0,0],vibrate(s,fret=0,v=.75){const str=strings[s];str.amplitude=.004*v;str.time=0;str.fret=fret;},update(dt){for(const str of strings){if(str.amplitude<.00001)continue;str.time+=dt;str.amplitude*=Math.exp(-dt*2.8);const a=str.line.geometry.attributes.position;for(let p=0;p<=64;p++){const u=p/64;a.array[p*3]=str.x+Math.sin(Math.min(1,u/(2**(-str.fret/12)))*Math.PI)*Math.sin(str.time*guitarFrequency(strings.indexOf(str),str.fret)*TAU)*str.amplitude;a.array[p*3+2]=.111-u*.010+Math.sin(Math.min(1,u/(2**(-str.fret/12)))*Math.PI*2)*Math.cos(str.time*guitarFrequency(strings.indexOf(str),str.fret)*TAU)*str.amplitude*.4;}a.needsUpdate=true;}}};});}
