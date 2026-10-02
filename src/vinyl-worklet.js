/** Audio-clock groove reader. Rendering hitches never rewind the disc; only an explicit seek/scratch can. */
class GrooveReader extends AudioWorkletProcessor{
 constructor(){super();this.data=null;this.sr=22050;this.position=0;this.rate=0;this.targetRate=0;this.active=false;this.gain=0;this.noise=.001;this.seed=9345;this.epoch=0;this.revision=null;this.samplesSinceClock=0;
  this.port.onmessage=({data:m})=>{if(m.type==='buffer'){this.data=m.data;this.sr=m.sampleRate;this.position=0;this.epoch=m.epoch??0;this.revision=null;}if(m.type==='state'&&(m.epoch??0)===this.epoch){this.targetRate=m.rate;this.active=m.active;this.noise=m.noise;if(this.revision!==(m.revision??0)||m.scratching)this.position=m.position*this.sr;this.revision=m.revision??0;}};
 }
 process(inputs,outputs){const out=outputs[0];if(!out?.length)return true;for(let i=0;i<out[0].length;i++){this.rate+=(this.targetRate-this.rate)*.003;this.gain+=((this.active?1:0)-this.gain)*.015;let v=0;if(this.data&&this.position>=0&&this.position<this.data.length-1){const p=Math.floor(this.position),f=this.position-p;v=this.data[p]*(1-f)+this.data[p+1]*f;}this.seed=(this.seed*16807)%2147483647;v=(v+(this.seed/2147483647*2-1)*this.noise)*this.gain;for(let ch=0;ch<out.length;ch++)out[ch][i]=v;if(this.active)this.position+=this.rate*this.sr/sampleRate;}
  this.samplesSinceClock+=out[0].length;if(this.samplesSinceClock>=2048){this.samplesSinceClock=0;this.port.postMessage({type:'clock',epoch:this.epoch,revision:this.revision,position:this.position/this.sr,time:currentTime+out[0].length/sampleRate,rate:this.rate,active:this.active});}return true;
 }
}
registerProcessor('groove-reader',GrooveReader);
