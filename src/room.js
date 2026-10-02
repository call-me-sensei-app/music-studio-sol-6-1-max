import {plant as botanicalPlant} from './botany.js';
import { THREE,box,cyl,sphere,rod,curve,torus,plane,label } from './geometry.js';
import {mat,glow,palette as P,canvasTexture} from './materials.js';
export const animated=[];
export function makeRoom(scene){
 const root=new THREE.Group();scene.add(root);
 box(root,[8.4,.2,6.6],[0,-.12,0],P.walnut,.04);
 for(let row=0;row<26;row++)for(let col=-1;col<5;col++){const offset=(row%3)*.70,a=Math.max(-4.2,-4.2+col*2.1+offset),b=Math.min(4.2,-4.2+(col+1)*2.1+offset);if(b-a>.01){const plank=box(root,[b-a-.0015,.04,.2515],[(a+b)/2,.005,-3.16+row*.253],mat(['#bc956e','#c49a74','#c8a47e','#b28b63'][(row*3+col+7)%4],.67,0,'floor'),.001);plank.userData.walkableSurface=true;}}

 box(root,[8.4,3.9,.15],[0,1.88,-3.27],mat('#63847e',.93,0,'plaster'),.01);
 // Window-bearing wall: real opening, no opaque wall behind the glass.
 box(root,[.15,3.9,.7],[-4.18,1.88,-2.99],P.cream,.01);
 box(root,[.15,3.9,2.05],[-4.18,1.88,2.31],P.cream,.01);
 box(root,[.15,.88,3.9],[-4.18,.37,-.73],P.cream,.01);
 box(root,[.15,.45,3.9],[-4.18,3.65,-.73],P.cream,.01);
 box(root,[8.28,.14,.12],[0,.15,-3.16],P.lightOak,.005);
 box(root,[.12,.14,6.3],[-4.07,.15,0],P.lightOak,.005);
 // Sunset canvas and handmade urban skyline.
 const sky=canvasTexture(64,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#a9b7c3');g.addColorStop(.48,'#f1c1ae');g.addColorStop(1,'#f5d9a6');c.fillStyle=g;c.fillRect(0,0,w,h);});
 for(const z of[-2.68,1.26])box(root,[.12,2.75,.09],[-4.08,2.2,z],P.lightOak,.01);
 for(const y of[.85,3.5])box(root,[.12,.09,3.98],[-4.08,y,-.71],P.lightOak,.01);
 for(const z of[-1.37,-.06])box(root,[.1,2.58,.055],[-4.08,2.18,z],P.cream,.005);
 box(root,[.1,.07,3.8],[-4.06,1.81,-.71],P.cream,.005);
 box(root,[.42,.08,4.05],[-4.01,.87,-.71],P.lightOak);
 // soft linen curtain folds and bronze rail
 rod(root,[-3.93,3.59,-2.78],[-3.93,3.59,1.4],.023,P.brass);
 // Desk, bevelled edges, chamfered apron and slender walnut legs.
 box(root,[3.5,.11,1.16],[-1.7,.96,-2.42],mat('#aa7c50',.54,0,'floor'),.035);
 for(const x of[-3.25,-.16])for(const z of[-2.8,-2.03])rod(root,[x,.02,z],[x,.92,z],.044,P.walnut);
 box(root,[2.9,.25,.8],[-1.7,.76,-2.5],P.oak);
 for(let x=-2.93;x<-.5;x+=1.2){box(root,[1.12,.21,.03],[x,.77,-2.084],P.oak,.01);rod(root,[x-.12,.77,-2.058],[x+.12,.77,-2.058],.009,P.brass);}
 // Studio monitors and composing screen.
 for(const x of[-3.03,-.31]){box(root,[.34,.55,.32],[x,1.29,-2.6],P.ink,.022);for(const [y,r] of[[1.2,.106],[1.4,.045]]){const s=cyl(root,r,r,.018,[x,y,-2.43],P.black,48);s.rotation.x=Math.PI/2;torus(root,r,.009,[x,y,-2.415],P.metal,[0,0,0]);}sphere(root,[.012,.012,.008],[x,1.075,-2.425],glow('#ecb969'));}
 const screen=new THREE.Group();screen.position.set(-1.69,1.43,-2.81);root.add(screen);
 box(screen,[1.27,.77,.045],[0,0,0],P.ink);
 const daw=canvasTexture(1024,600,(c,w,h)=>{c.fillStyle='#283634';c.fillRect(0,0,w,h);c.fillStyle='#c8d2b7';c.font='20px sans-serif';c.fillText('AFTERLIGHT / HOME SESSION 001',35,45);const colors=['#cf9d73','#9facb4','#9caf8e','#c28e85'];for(let j=0;j<4;j++){c.fillStyle='#384740';c.fillRect(28,85+j*100,950,84);c.fillStyle=colors[j];for(let i=0;i<32;i++){const a=7+(Math.sin(i*.9+j)*.5+.5)*25;c.fillRect(175+i*24,127+j*100-a,9,a*2);}c.font='17px sans-serif';c.fillText(['KEYS','BASS','GUITAR','VOICE'][j],44,132+j*100);}c.fillStyle='#e8c196';c.fillRect(504,75,2,430);});
 const display=plane(screen,1.2,.69,[0,.015,.028],daw);display.material=new THREE.MeshBasicNodeMaterial({map:daw});box(root,[.1,.24,.1],[-1.69,1.12,-2.81],P.metal);box(root,[.45,.025,.23],[-1.69,1.027,-2.72],P.ink);
 // Record shelving, each sleeve individually modeled.
 box(root,[2.23,1.49,.43],[2.86,.75,-2.98],P.oak);
 for(const y of[.07,.74,1.5])box(root,[2.3,.07,.51],[2.86,y,-2.89],P.walnut);
 for(const x of[1.7,2.87,4.01])box(root,[.06,1.52,.51],[x,.76,-2.89],P.walnut);
 for(let row=0;row<2;row++)for(let i=0;i<50;i++){const c=['#eee2c7','#a76650','#536b69','#9b9e8c','#cfb189','#4c5361','#c19084'][i%7];const b=box(root,[.032,.49,.35],[1.77+i*.044,.37+row*.7,-2.77],mat(c),.001);b.rotation.z=Math.sin(i*11)*.04;box(root,[.034,.013,.015],[b.position.x,b.position.y+.1,-2.583],P.brass,.002);}

 // Turntable listening credenza.
 box(root,[2.44,.9,.95],[1.69,.49,.67],P.oak,.035);box(root,[2.51,.075,1.04],[1.69,.98,.67],mat('#ae835b',.54,0,'floor'),.025);
 for(const x of[.55,2.81])for(const z of[.29,1.08])rod(root,[x,0,z],[x,.2,z],.045,P.walnut);
 for(const x of[.98,2.16]){box(root,[1.12,.69,.03],[x,.5,1.16],P.walnut);for(let i=0;i<16;i++)box(root,[.039,.62,.037],[x-.52+i*.068,.5,1.191],P.oak,.003);sphere(root,[.014,.014,.014],[x+.37,.73,1.222],P.brass);}
 const deck=new THREE.Group();deck.position.set(1.37,1.07,.66);root.add(deck);deck.userData.instrument='turntable';
 box(deck,[1.18,.13,.91],[0,0,0],P.walnut,.026);box(deck,[1.12,.027,.86],[0,.078,0],P.ink,.012);
 const platter=cyl(deck,.36,.36,.04,[-.12,.115,.025],P.metal,128);cyl(deck,.35,.35,.006,[-.12,.14,.025],mat('#11191c',.4,.3,'vinyl'),128);cyl(deck,.097,.097,.007,[-.12,.146,.025],mat('#bf8f82'),80);cyl(deck,.007,.007,.035,[-.12,.166,.025],P.metal);
 cyl(deck,.05,.06,.09,[.43,.15,-.29],P.metal);rod(deck,[.43,.2,-.29],[.29,.21,.15],.012,P.metal);box(deck,[.075,.025,.12],[.27,.21,.17],P.ink);
 cyl(deck,.027,.027,.018,[-.49,.102,.31],P.brass);label(deck,'AFTERLIGHT / DD–01',.39,.04,[.18,.096,.354],{rot:[-Math.PI/2,0,0]});
 // Lounge rug and sofa.
 const rug=box(root,[3.55,.03,2.06],[-1.26,.05,.91],mat('#9e8da4',.98,0,'fabric'),.13);rug.userData.walkableSurface=true;
 for(let i=0;i<11;i++){const stripe=box(root,[3.3,.002,.006],[-1.26,.068,.04+i*.17],mat('#e5cfb4'),0);stripe.userData.walkableSurface=true;}
 box(root,[2.6,.32,.85],[-1.69,.38,1.95],mat('#a4869a',.92,0,'fabric'),.12);
 box(root,[2.6,.65,.25],[-1.69,.66,2.36],P.fabric,.11);
 for(const x of[-2.89,-.49])box(root,[.22,.5,.9],[x,.57,1.97],P.fabric,.1);
 for(const x of[-2.34,-1.03])box(root,[1.08,.14,.65],[x,.61,1.9],mat('#bb9bb0',.92,0,'fabric'),.07);
 for(const x of[-2.5,-.91]){const p=box(root,[.48,.43,.17],[x,.89,2.17],mat(x<-2?'#c58a70':'#d9cab1',.98,0,'fabric'),.08);p.rotation.z=x<-2?.15:-.13;}
 const table=new THREE.Group();table.position.set(-1.9,0,.57);root.add(table);const top=cyl(table,.47,.47,.055,[0,.44,0],P.lightOak,80);top.scale.z=.7;for(const a of[0,2.1,4.2])rod(table,[Math.cos(a)*.32,0,Math.sin(a)*.21],[Math.cos(a)*.23,.42,Math.sin(a)*.16],.025,P.walnut);
 // a notebook, pencil, tea and small personal objects
 const notebook=box(table,[.26,.018,.18],[-.09,.48,.025],P.cream,.007);notebook.rotation.y=.13;label(table,'little things / big feelings',.24,.035,[-.09,.491,.025],{rot:[-Math.PI/2,0,.13],color:'#6d7d68'});rod(table,[.06,.492,-.065],[.23,.492,-.04],.004,P.terracotta);
 cyl(table,.055,.042,.095,[.24,.516,.12],P.cream);cyl(table,.045,.045,.004,[.24,.565,.12],mat('#725241'));torus(table,.032,.009,[.3,.52,.12],P.cream,[0,0,Math.PI/2]);
 // Plants with bent stems and individually formed leaves.
 botanicalPlant(root,[-4.01,.90,.69],.85,'pothos');botanicalPlant(root,[3.65,1.525,-2.89],.8,'pothos');botanicalPlant(root,[3.71,.02,-1.13],1.20,'rubber');
 // Warm desk lamp.
 rod(root,[-3.47,1.01,-2.45],[-3.47,1.57,-2.45],.018,P.brass);cyl(root,.11,.14,.05,[-3.47,1.03,-2.45],P.brass);cyl(root,.07,.17,.22,[-3.47,1.59,-2.45],mat('#efe0b9'));const lamp=new THREE.PointLight('#ffc17a',1.05,2.5,2);lamp.position.set(-3.47,1.48,-2.45);root.add(lamp);
 // Pinboard and lyric postcards; no oversized wall title.
 box(root,[1.22,.66,.035],[.74,2.6,-3.166],P.lightOak);for(let i=0;i<5;i++){const p=box(root,[.27,.32,.007],[.35+(i%3)*.36,2.45+Math.floor(i/3)*.32,-3.14],mat(['#ead7b5','#c2b39e','#dcaca1'][i%3]),.002);p.rotation.z=(i-2)*.08;label(root,['find your voice','17:42','a softer kind','new verse','just begin'][i],.22,.032,[p.position.x,p.position.y,-3.132],{color:'#776c59'});sphere(root,[.009,.009,.008],[p.position.x,p.position.y+.12,-3.125],P.brass);}
 return {root,deck,platter,guitars:[],sky,display};
}
