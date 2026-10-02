import {hasPerf} from './runtime-performance.js';
import {guitarNoteGuide,chordFingers} from './guitar-guide.js';
import {compositionProjection} from './composition-projection.js';
import {compositionEvents,chordAt,chordNotes,guitarVoicing} from './composition.js';
import {fitGuitarNote} from './guitar-string.js';
export {fitGuitarNote} from './guitar-string.js';
export class CompositionPlayer{
  constructor({audio,keyboard,guitars,onStart=()=>{},onStop=()=>{},scoreGroup='compose',keyOwner='composer',prepare=null}){Object.assign(this,{audio,keyboard,guitars,onStart,onStop,scoreGroup,keyOwner,prepare});this.playing=false;this.presenting=false;this.generation=0;this.visual=[];this.preview=[];this.keyVisuals=new Set();this.elapsed=0;this.projection=compositionProjection(keyboard);this.guides=new Map(guitars.filter(g=>g.root).map(g=>[g,guitarNoteGuide(g)]));}
  async play(project){this.stop();const token=this.generation;await this.audio.resume();if(token!==this.generation)return false;this.project=structuredClone(project);this.events=compositionEvents(project);this.presenting=true;this.onStart(this.project);if(this.prepare){await this.audio.prepareGuitarBuffers?.(this.events,this.guitars,{cancelled:()=>token!==this.generation});if(token!==this.generation)return false;this.projection.warm();await this.prepare();if(token!==this.generation)return false;}this.presenting=false;this.start=this.audio.ctx.currentTime+(this.prepare ? .85 : .60);this.index=0;this.cycle=0;this.elapsed=0;this.playing=true;return true;}
  stop(reason='manual'){this.lastStop=reason;const wasPlaying=this.playing||this.presenting;this.presenting=false;this.generation++;this.playing=false;this.audio.stopScore(this.scoreGroup);this.audio.stopScore('preview');this.projection.root.visible=false;this.guides.forEach(g=>g.hide());this.visual=[];this.preview=[];this.keyVisuals.clear();this.keyboard.keys.forEach(k=>this.keyboard.release(k.state.midi,this.keyOwner));if(wasPlaying)this.onStop();}
  schedule(event,when,prefix='score:'+this.scoreGroup){const seconds=60/(this.project?.bpm||96),duration=event.duration*seconds;
    if(event.instrument==='keyboard'){
      this.audio.pianoOn(event.midi,event.velocity,'piano',when,prefix+':'+this.generation+':'+this.cycle+':'+this.index+':'+event.midi,duration);this.visual.push({when,end:when+duration,midi:event.midi,group:prefix.split(':')[1]});
    }else{
      const g=this.guitars[Number(event.instrument.split('-')[1])||0];
      const voicing=event.chord?guitarVoicing(event.chord):(()=>{const f=fitGuitarNote(event.midi),out=[-1,-1,-1,-1,-1,-1];if(f)out[f.string]=f.fret;return out;})();
      const fingers=chordFingers(voicing);const order=event.direction<0?[5,4,3,2,1,0]:[0,1,2,3,4,5];
      order.forEach((string,i)=>{const fret=voicing[string];if(fret<0||(event.string!==undefined&&event.string!==string))return;const t=when+(event.chord&&event.string===undefined?i*.017:0);this.audio.pluck(string,fret,event.velocity,g.type,g.detunes[string],t,duration,prefix.split(':')[1]);this.visual.push({when:t,end:t+duration,guitar:g,string,fret,finger:fingers[string],velocity:event.velocity,group:prefix.split(':')[1]});});
    }
  }
  async previewChord(project,index,direction=1,velocity=.65){await this.audio.resume();if(!this.playing)this.project=project;const chord=chordAt(project,index),when=this.audio.ctx.currentTime+.025;
    const instrument=project.backing==='none'?'keyboard':project.backing;
    if(instrument==='keyboard')chordNotes(chord,60).forEach(midi=>this.schedule({midi,instrument,duration:1.6,velocity},when,'score:preview'));
    else this.schedule({chord,instrument,duration:1.6,velocity,direction},when,'score:preview');
  }
  mutePreview(){this.audio.stopScore('preview');this.visual=this.visual.filter(e=>e.group!=='preview');}
  async previewNote(midi,instrument='keyboard',velocity=.65){await this.audio.resume();this.schedule({midi,instrument,duration:.8,velocity},this.audio.ctx.currentTime+.01,'score:preview');}
  update(){if(!this.audio.ready)return;if(hasPerf('idle_guides')&&!this.playing&&!this.visual.length&&!this.keyVisuals.size)return;const now=this.audio.ctx.currentTime;
    if(this.playing&&this.audio.ctx.state==='running'){
      const seconds=60/this.project.bpm,span=this.project.bars*4*seconds;this.elapsed=Math.max(0,now-this.start);
      let guard=0;while(guard++<128){const e=this.events[this.index];if(!e){if(this.project.loop&&this.events.length){this.cycle++;this.index=0;continue;}if(now>this.start+span+.8)this.stop('finished');break;}
        const when=this.start+this.cycle*span+e.beat*seconds;if(when>now+.45)break;if(when>now-.06)this.schedule(e,when);this.index++;
      }
    }
    const active=new Set();for(const e of this.visual){if(e.when>now||e.end<=now)continue;if(e.midi!==undefined)active.add(e.midi);else if(!e.rang){e.rang=true;e.guitar.vibrate(e.string,e.fret,e.velocity);}}
    for(const midi of this.keyVisuals)if(!active.has(midi))this.keyboard.release(midi,this.keyOwner);
    for(const midi of active)if(!this.keyVisuals.has(midi))this.keyboard.press(midi,.65,this.keyOwner);
    this.keyVisuals=active;for(const [g,guide]of this.guides){const strings=new Map();let recent;for(const e of this.visual){if(e.guitar!==g||e.when>now||e.end<=now)continue;strings.set(e.string,e);if(!recent||e.when>recent.when)recent=e;}guide.update(strings,recent,now);}this.visual=this.visual.filter(e=>e.end>now);if(this.project)this.projection.update(this.events||[],this.start||now,now,60/this.project.bpm,this.project.bars*4*60/this.project.bpm,this.project.loop,this.playing);}
  get beat(){return this.playing?(this.elapsed*this.project.bpm/60)%(this.project.bars*4):0;}
}
