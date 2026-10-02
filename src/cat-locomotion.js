const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=t=>t*t*(3-2*t);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

export class FloorNavigation {
  constructor(free,{minX=-2.82,maxX=2.82,minZ=-2.20,maxZ=2.20,cell=.16}={}){
    Object.assign(this,{free,minX,maxX,minZ,maxZ,cell});this.nx=Math.floor((maxX-minX)/cell)+1;this.nz=Math.floor((maxZ-minZ)/cell)+1;
    this.open=new Uint8Array(this.nx*this.nz);for(let z=0;z<this.nz;z++)for(let x=0;x<this.nx;x++){const p=this.point(x+z*this.nx);this.open[x+z*this.nx]=free(p.x,p.z)?1:0;}
  }
  point(id){return{x:this.minX+(id%this.nx)*this.cell,z:this.minZ+Math.floor(id/this.nx)*this.cell};}
  nearest(p,reachable=false){let best=-1,d=Infinity;for(let i=0;i<this.open.length;i++)if(this.open[i]){const q=this.point(i),n=distance(p,q);if(n<d&&(!reachable||this.clear(p,q))){best=i;d=n;}}return best;}
  clear(a,b){const n=Math.ceil(distance(a,b)/.045);for(let i=0;i<=n;i++){const t=n?i/n:0;if(!this.free(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;}
  path(start,end){
    // A grid cell must be connected to the exact current position. Nearest by distance
    // alone can lie on the other side of a furniture edge and create an unwalkable first leg.
    const s=this.nearest(start,true),goal=this.nearest(end,true);if(s<0||goal<0)return[];
    if(distance(this.point(goal),end)>.3)return[];
    const frontier=[s],cost=new Map([[s,0]]),previous=new Map(),closed=new Set();
    while(frontier.length){frontier.sort((a,b)=>cost.get(a)+distance(this.point(a),this.point(goal))-cost.get(b)-distance(this.point(b),this.point(goal)));const id=frontier.shift();if(id===goal)break;if(closed.has(id))continue;closed.add(id);const x=id%this.nx,z=Math.floor(id/this.nx);
      for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=this.nx||zz>=this.nz)continue;const next=xx+zz*this.nx;if(!this.open[next])continue;if(dx&&dz&&(!this.open[x+dx+z*this.nx]||!this.open[x+(z+dz)*this.nx]))continue;if(!this.clear(this.point(id),this.point(next)))continue;const nextCost=cost.get(id)+Math.hypot(dx,dz)*this.cell;if(nextCost<(cost.get(next)??Infinity)){cost.set(next,nextCost);previous.set(next,id);frontier.push(next);}}
    }
    if(!previous.has(goal)&&goal!==s)return[];
    const raw=[goal];while(raw[0]!==s)raw.unshift(previous.get(raw[0]));const points=[{...start},...raw.map(id=>this.point(id))];
    const result=[points[0]];let i=0;while(i<points.length-1){let j=points.length-1;while(j>i+1&&!this.clear(points[i],points[j]))j--;result.push(points[j]);i=j;}
    if(this.free(end.x,end.z)&&this.clear(result.at(-1),end))result.push({...end});return result.slice(1);
  }
}

/** A ballistic trajectory in SI units. Arrival is on the descending branch. */
export function jumpTrajectory(start,end,{gravity=9.81,clearance=.14,upSpeed=.68}={}){
  const dy=end.y-start.y,vy=dy>0?Math.sqrt(2*gravity*(dy+clearance)):upSpeed;
  const discriminant=vy*vy-2*gravity*dy;if(discriminant<0)throw Error('Jump target is not reachable.');
  const duration=(vy+Math.sqrt(discriminant))/gravity;
  return{duration,vy,vx:(end.x-start.x)/duration,vz:(end.z-start.z)/duration,sample(t){t=clamp(t,0,duration);return{x:start.x+(end.x-start.x)*t/duration,y:start.y+vy*t-.5*gravity*t*t,z:start.z+(end.z-start.z)*t/duration,vy:vy-gravity*t};}};
}

export class CatLocomotion {
  constructor({home,free,height,path,seed=8471,homeHeading=.65}){
    this.home={...home};this.homeHeading=homeHeading;this.position={...home};this.free=free;this.height=height;this.path=path;this.seed=seed;this.time=0;this.phase='sill-idle';this.age=0;this.heading=homeHeading;this.speed=0;this.standing=0;this.jump=null;this.route=[];this.visits=0;this.next=15+this.random()*12;this.floorStops=0;this.returning=false;this.velocity={x:0,y:0,z:0};
  }
  random(){this.seed=this.seed*16807%2147483647;return this.seed/2147483647;}
  enter(phase){this.phase=phase;this.age=0;}
  explore(){if(this.phase==='sill-idle')this.next=this.time;}
  recall(){if(!['sill-idle','stand-up','jump-down','jump-up','sill-settle'].includes(this.phase)){this.returning=true;this.planReturn();}}
  floorY(x,z){return this.height(x,z)-.0035;}
  landingSpot(){for(const[dx,dz]of[[.86,0],[.90,.18],[.90,-.18],[.72,0]]){const p={x:this.home.x+dx,z:this.home.z+dz};if(this.free(p.x,p.z))return{...p,y:this.floorY(p.x,p.z)};}return null;}
  beginJump(up){const end=up?{...this.home}:this.landingSpot();if(!end){this.enter('sill-idle');this.next=this.time+10;return;}this.jump=jumpTrajectory(this.position,end,{upSpeed:1.05});this.jumpStart={...this.position};this.jumpEnd=end;this.jumpHeading=this.heading;this.endHeading=up?this.homeHeading:Math.atan2(end.x-this.position.x,end.z-this.position.z);this.enter(up?'jump-up':'jump-down');this.standing=1;}
  planReturn(){const staging=this.landingSpot();if(!staging){this.enter('floor-idle');this.next=this.time+6;return;}this.route=this.path(this.position,staging);if(!this.route.length&&distance(this.position,staging)>.12){this.enter('floor-idle');this.next=this.time+6;return;}this.returning=true;this.enter(this.route.length?'walking':'pre-jump');}
  wander(){
    if(this.returning||this.floorStops>=3){this.planReturn();return;}
    for(let i=0;i<35;i++){const p={x:-2.6+this.random()*5.2,z:-1.95+this.random()*3.90};if(distance(this.position,p)<.55||!this.free(p.x,p.z))continue;const route=this.path(this.position,p);if(route.length){this.route=route;this.walkSpeed=.20+this.random()*.16;this.enter('walking');return;}}
    this.enter('floor-idle');this.next=this.time+5;
  }
  step(dt){
    dt=clamp(dt,0,.05);this.time+=dt;this.age+=dt;this.velocity={x:0,y:0,z:0};
    if(this.phase==='sill-idle'){this.standing+=(0-this.standing)*(1-Math.exp(-dt*3));this.speed=0;if(this.time>=this.next&&this.landingSpot())this.enter('stand-up');}
    else if(this.phase==='stand-up'){this.standing=ease(clamp(this.age/1.2,0,1));if(this.age>1.45)this.beginJump(false);}
    else if(this.phase==='jump-down'||this.phase==='jump-up'){
      const p=this.jump.sample(this.age);this.position={x:p.x,y:p.y,z:p.z};this.velocity={x:this.jump.vx,y:p.vy,z:this.jump.vz};this.speed=Math.hypot(this.jump.vx,this.jump.vz);
      this.heading=this.jumpHeading+angleDelta(this.jumpHeading,this.endHeading)*ease(clamp(this.age/this.jump.duration*1.8,0,1));
      if(this.age>=this.jump.duration){const up=this.phase==='jump-up';this.position={...this.jumpEnd};this.speed=0;this.velocity={x:0,y:0,z:0};this.enter(up?'sill-settle':'landing');if(up)this.visits++;else{this.floorStops=0;this.returning=false;}}
    }
    else if(this.phase==='landing'){this.standing=.80+.20*ease(clamp(this.age/.45,0,1));if(this.age>.8){this.enter('floor-idle');this.next=this.time+2.4+this.random()*3;}}
    else if(this.phase==='floor-idle'){this.speed*=Math.exp(-dt*8);this.standing+=(.40-this.standing)*(1-Math.exp(-dt*1.3));if(this.time>=this.next)this.wander();}
    else if(this.phase==='walking'){
      this.standing+=(1-this.standing)*(1-Math.exp(-dt*5));const target=this.route[0];if(!target){this.speed=0;if(this.returning)this.enter('pre-jump');else{this.floorStops++;this.enter('floor-idle');this.next=this.time+3+this.random()*5;}return this;}
      const d=distance(this.position,target),wanted=Math.atan2(target.x-this.position.x,target.z-this.position.z);this.heading+=clamp(angleDelta(this.heading,wanted),-2.5*dt,2.5*dt);const pace=Math.abs(angleDelta(this.heading,wanted))>.55?0:(this.walkSpeed||.28);this.speed+=(pace-this.speed)*(1-Math.exp(-dt*5));
      const step=Math.min(d,this.speed*dt),x=this.position.x+(target.x-this.position.x)/Math.max(d,.001)*step,z=this.position.z+(target.z-this.position.z)/Math.max(d,.001)*step;
      if(!this.free(x,z)){this.speed=0;this.enter('floor-idle');this.next=this.time+2;return this;}
      this.velocity={x:(x-this.position.x)/Math.max(dt,.001),y:0,z:(z-this.position.z)/Math.max(dt,.001)};this.position={x,y:this.floorY(x,z),z};if(d-step<.0001)this.route.shift();
    }
    else if(this.phase==='pre-jump'){this.speed=0;this.standing=1-.23*Math.sin(clamp(this.age/.60,0,1)*Math.PI);this.heading+=clamp(angleDelta(this.heading,-Math.PI/2),-2.6*dt,2.6*dt);if(this.age>.95)this.beginJump(true);}
    else if(this.phase==='sill-settle'){this.standing=1-ease(clamp(this.age/1.6,0,1));this.heading+=clamp(angleDelta(this.heading,this.homeHeading),-1.5*dt,1.5*dt);if(this.age>1.8){this.position={...this.home};this.heading=this.homeHeading;this.enter('sill-idle');this.next=this.time+30+this.random()*40;}}
    return this;
  }
  get airborne(){return this.phase==='jump-up'||this.phase==='jump-down';}
}
