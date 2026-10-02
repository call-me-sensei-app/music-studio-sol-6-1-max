import * as THREE from 'three/webgpu';
const ease=t=>t*t*(3-2*t);
// World-space shots, inside the room. Musical staging is coordinated separately by tour-music.js.
export const TOUR_SHOTS=[
  {name:'The first groove',detail:'Blue hour · an original Afterlight arrangement',p:[1.29,1.35,1.25],t:[1.027,.87,.495],fov:43,seconds:0},
  {name:'Needle down',detail:'Direct drive · a real cue descent · the song begins',p:[1.39,1.38,1.20],t:[1.027,.87,.495],fov:40,seconds:7},
  {name:'Let the evening in',detail:'Open window · moving linen · a city winding down',p:[-2.25,1.45,.35],t:[-3.10,1.43,-.55],fov:46,seconds:9},
  {name:'Six strings join in',detail:'A held guitar · chord shapes · warm strums',p:[-1.03,1.73,-.95],t:[-1.55,1.74,-2.27],fov:48,seconds:10},
  {name:'A melody takes shape',detail:'88 moving keys · a shared musical pulse',p:[-.48,1.40,-.70],t:[-1.27,.88,-1.49],fov:44,seconds:9},
  {name:'A shelf of little worlds',detail:'Original record sleeves · a sewn spirit keepsake',p:[1.52,1.45,-.98],t:[2.22,1.12,-2.14],fov:44,seconds:7},
  {name:'Stay a little longer',detail:'Slouched fabric · soft seams · a cozy seat',p:[1.58,1.29,1.44],t:[2.34,.34,1.65],fov:47,seconds:6},
  {name:'Now it’s your turn',detail:'Every part is a little piece of the same song',p:[-1.18,1.18,1.58],t:[-.35,1.08,-1.76],fov:64,seconds:7}
];
export class RoomTour{
  constructor(camera,collision){this.camera=camera;this.collision=collision;this.time=0;this.active=false;this.paused=false;
    this.positions=new THREE.CatmullRomCurve3(TOUR_SHOTS.map(s=>new THREE.Vector3(...s.p)),false,'centripetal');
    this.targets=new THREE.CatmullRomCurve3(TOUR_SHOTS.map(s=>new THREE.Vector3(...s.t)),false,'centripetal');
    this.duration=TOUR_SHOTS.reduce((sum,s)=>sum+s.seconds,0);this.target=new THREE.Vector3();
  }
  start(){this.time=0;this.active=true;this.paused=false;this.apply(this.sample(0));}
  stop(){this.active=false;this.paused=false;}
  togglePause(){if(this.active)this.paused=!this.paused;return this.paused;}
  sample(time){
    time=Math.max(0,Math.min(this.duration,time));let at=0,index=1;
    while(index<TOUR_SHOTS.length-1&&time>at+TOUR_SHOTS[index].seconds){at+=TOUR_SHOTS[index].seconds;index++;}
    const a=TOUR_SHOTS[index-1],b=TOUR_SHOTS[index],k=ease(Math.min(1,(time-at)/b.seconds)),u=(index-1+k)/(TOUR_SHOTS.length-1);
    const position=this.positions.getPoint(u),target=this.targets.getPoint(u);
    return{position,target,fov:a.fov+(b.fov-a.fov)*k,chapter:index-1,name:b.name,detail:b.detail,progress:time/this.duration};
  }
  apply(shot){
    const p=shot.position;if(this.collision){const q=this.collision.resolve(p.x,p.y,p.z,.08);p.set(...q);}
    this.camera.position.copy(p);this.target.copy(shot.target);this.camera.lookAt(this.target);this.camera.fov=shot.fov;this.camera.updateProjectionMatrix();
  }
  update(dt){if(!this.active)return false;if(!this.paused)this.time=Math.min(this.duration,this.time+Math.max(0,dt));this.apply(this.sample(this.time));if(this.time===this.duration){this.active=false;return true;}return false;}
  get state(){return{active:this.active,paused:this.paused,time:this.time,duration:this.duration,...this.sample(this.time),position:undefined,target:undefined};}
}
