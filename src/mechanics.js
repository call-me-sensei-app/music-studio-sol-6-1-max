/** Mechanical core. SI units: seconds, radians, kilograms, metres. No renderer dependency. */
export const TAU=Math.PI*2;
export const DECK={recordRadius:.1524,outerGroove:.146,innerGroove:.060,groovePitch:.00010,armLength:.230,pivotDistance:.215,platterMass:1.7,platterRadius:.151,inertia:1.7*.151**2/2};
export const frequency=midi=>440*2**((midi-69)/12);
export function tonearmAngle(radius){const r=Math.min(DECK.outerGroove,Math.max(DECK.innerGroove,radius));return Math.acos((DECK.pivotDistance**2+DECK.armLength**2-r*r)/(2*DECK.pivotDistance*DECK.armLength));}
export function stylusPosition(radius){const a=tonearmAngle(radius);return{x:DECK.pivotDistance-DECK.armLength*Math.cos(a),z:DECK.armLength*Math.sin(a)};}
export function guitarFrequency(string,fret,detune=0){return frequency([40,45,50,55,59,64][string]+fret)*2**(detune/1200);}
export class TurntableMechanics{
 constructor(){this.power=false;this.motor=false;this.rpm=33+1/3;this.pitch=0;this.omega=0;this.angle=0;this.recordAngle=0;this.recordOmega=0;this.transport=0;this.transportRevision=0;this.duration=168;this.cue=1;this.cueTarget=1;this.arm='rest';this.trackingForce=1.8;this.antiskate=1.8;this.recordLoaded=true;this.flipped=false;this.scratching=false;this.wow=0;this.flutter=0;this.time=0;this.ended=false;this.manualRadius=null;this.holdOmega=0;this.brake=true;}
 get targetOmega(){return this.rpm*(1+this.pitch/100)*TAU/60;}
 get nominalOmega(){return (33+1/3)*TAU/60;}
 get playbackRate(){return this.recordOmega/this.nominalOmega;}
 get grooveRadius(){return this.manualRadius??(Math.max(DECK.innerGroove,DECK.outerGroove-this.transport*(33+1/3)/60*DECK.groovePitch));}
 get actualRPM(){return this.omega*60/TAU;}
 get tracking(){return this.recordLoaded&&this.arm==='groove'&&this.cue<.012&&this.trackingForce>=.8&&this.trackingForce<=3.5;}
 get audible(){return this.tracking&&Math.abs(this.recordOmega)>.05;}
 start(){if(!this.recordLoaded)return false;this.power=true;this.motor=true;this.ended=false;return true;}
 stop(){this.motor=false;}
 setCue(up){this.cueTarget=up?1:0;if(up)this.manualRadius=null;}
 placeArm(){if(!this.recordLoaded)return false;if(this.cue<.98){this.setCue(true);return false;}this.arm='groove';this.manualRadius=null;this.ended=false;return true;}
 returnArm(){this.setCue(true);this.arm='parking';}
 seek(p){this.transportRevision++;this.transport=Math.max(0,Math.min(this.duration,p*this.duration));this.manualRadius=null;this.ended=false;}
 load(duration=168){if(this.cue<.99||Math.abs(this.actualRPM)>.15)return false;this.duration=duration;this.transportRevision++;this.transport=0;this.recordLoaded=true;this.flipped=false;this.arm='rest';this.ended=false;return true;}
 setSpeed(rpm){if(![33+1/3,45,78].some(x=>Math.abs(x-rpm)<.001))throw Error('Unsupported speed');this.rpm=rpm;}
 beginScratch(){if(!this.recordLoaded)return;this.transportRevision++;this.scratching=true;this.holdOmega=this.recordOmega;this.recordOmega=0;}
 scratch(delta,dt){if(!this.scratching)return;const step=Math.max(-Math.PI/3,Math.min(Math.PI/3,delta));this.recordAngle+=step;this.recordOmega=step/Math.max(.008,dt);if(this.tracking)this.transport=Math.max(0,Math.min(this.duration,this.transport+step/this.nominalOmega));}
 endScratch(){this.scratching=false;this.transportRevision++;}
 step(dt){dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
  // Viscously damped cue piston: the stylus takes ~1.3 s to descend, never teleports.
  this.cue+= (this.cueTarget-this.cue)*(1-Math.exp(-dt*4.4));if(Math.abs(this.cue-this.cueTarget)<.0001)this.cue=this.cueTarget;
  if(this.arm==='parking'&&this.cue>.95)this.arm='rest';
  {
   const target=this.power&&this.motor?this.targetOmega:0;
   // Closed-loop direct-drive torque limited to 0.075 N m; J = 1/2 m r².
   const error=target-this.omega;const torque=this.power&&this.motor?Math.max(-.075,Math.min(.075,error*.06)):this.brake?Math.max(-.05,Math.min(.05,-this.omega*.028)):-this.omega*.0012;
   this.omega+=torque/DECK.inertia*dt;
   if(!target&&Math.abs(this.omega)<.0005)this.omega=0;
   this.wow=Math.sin(this.time*TAU*.55)*.00045;this.flutter=Math.sin(this.time*TAU*8.7)*.00008;
   this.angle=(this.angle+this.omega*dt)%TAU;
   if(!this.scratching){
    // The vinyl and platter are separate bodies. Felt-slipmat friction synchronizes them after release.
    const difference=this.omega-this.recordOmega;
    const recordInertia=.180*DECK.recordRadius**2/2;
    if(Math.abs(difference)<.08)this.recordOmega=this.omega;
    else this.recordOmega+=Math.max(-.014,Math.min(.014,difference*.014))/recordInertia*dt;
    const delta=this.recordOmega*dt*(1+this.wow+this.flutter);this.recordAngle=(this.recordAngle+delta)%TAU;
   if(this.tracking){this.transport+=delta/this.nominalOmega;if(this.transport>=this.duration){this.transport=this.duration;this.ended=true;this.stop();this.returnArm();}if(this.transport<0)this.transport=0;}
   }
  }
 }
}
/** Equal-tempered instrument mechanics: pivot travel and release/sustain are independent. */
export class KeyMechanics{constructor(midi){this.midi=midi;this.travel=0;this.target=0;this.velocity=0;this.held=false;}press(velocity=.75){this.held=true;this.target=1;this.velocity=Math.max(.05,Math.min(1,velocity));}release(){this.held=false;this.target=0;}step(dt){this.travel+=(this.target-this.travel)*(1-Math.exp(-dt*(this.held?38:18)));} }
export const CHORDS={C:[-1,3,2,0,1,0],Am:[-1,0,2,2,1,0],F:[1,3,3,2,1,1],G:[3,2,0,0,0,3],Dm:[-1,-1,0,2,3,1],Em:[0,2,2,0,0,0],D:[-1,-1,0,2,3,2],A:[-1,0,2,2,2,0],E:[0,2,2,1,0,0]};
