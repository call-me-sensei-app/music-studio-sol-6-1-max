/** Monophonic YIN-style difference detector. It is signal processing, not GenAI or voice transcription. */
export function detectHum(samples,sampleRate,{minHz=65,maxHz=1100,threshold=.16,minRms=.002}={}){
  let energy=0,mean=0;for(const v of samples){mean+=v;energy+=v*v;}mean/=samples.length;const rms=Math.sqrt(Math.max(0,energy/samples.length-mean*mean));if(rms<minRms)return null;
  const factor=Math.max(1,Math.floor(sampleRate/16000));if(factor>1){const reduced=new Float32Array(Math.floor(samples.length/factor));for(let i=0;i<reduced.length;i++){let sum=0;for(let j=0;j<factor;j++)sum+=samples[i*factor+j];reduced[i]=sum/factor;}samples=reduced;sampleRate/=factor;}
  const max=Math.min(Math.floor(sampleRate/minHz),Math.floor(samples.length/2)),min=Math.floor(sampleRate/maxHz),count=samples.length-max,diff=new Float32Array(max+1);let sum=0;
  for(let tau=1;tau<=max;tau++){let d=0;for(let i=0;i<count;i++){const delta=samples[i]-samples[i+tau];d+=delta*delta;}sum+=d;diff[tau]=sum?d*tau/sum:1;}
  let tau=-1;for(let i=min;i<max;i++)if(diff[i]<threshold){while(i+1<max&&diff[i+1]<diff[i])i++;tau=i;break;}if(tau<0)return null;
  const l=diff[tau-1],c=diff[tau],r=diff[tau+1],den=2*(2*c-r-l),period=tau+(den?(r-l)/den:0),hz=sampleRate/period,midi=69+12*Math.log2(hz/440);return{hz,midi,rms,confidence:1-c};
}
export class HumSegmenter{
  constructor(){this.notes=[];this.active=null;this.pending=null;}
  update(pitch,time){const midi=pitch&&pitch.confidence>.80?Math.round(pitch.midi):null;
    if(midi===null){if(this.active&&time-this.active.last>.16)this.finish();this.pending=null;return;}
    if(this.active?.midi===midi){this.active.last=time;this.pending=null;return;}
    if(this.pending?.midi!==midi)this.pending={midi,time,count:1};else this.pending.count++;
    if(this.pending.count>=3){const began=this.pending.time;if(this.active)this.finish(began);this.active={midi,start:began,last:time};this.pending=null;}
  }
  finish(end=this.active?.last+.08){if(!this.active)return;const duration=Math.max(0,end-this.active.start);if(duration>=.10)this.notes.push({midi:this.active.midi,start:this.active.start,duration});this.active=null;}
  stop(time){this.finish(time);return this.notes;}
}
const MIC_ERRORS={NotAllowedError:'Microphone access was blocked. Allow microphone access for this page in your browser/site settings, then retry.',NotFoundError:'No microphone was found. Connect one or choose a different input.',NotReadableError:'Your microphone is busy or unavailable. Close other recording apps, then retry.',OverconstrainedError:'That microphone is not available. Choose Default microphone and retry.'};
export function mountHumming({element,audio,getSettings,getTarget=()=> 'Selected lane',onCapture,onBeforeStart,toast,onState=()=>{},platform={},permissionTimeout=30000,audioTimeout=6000}){
  const $=id=>element.querySelector('#'+id),devices=platform.mediaDevices??globalThis.navigator?.mediaDevices,requestFrame=platform.requestFrame??(fn=>requestAnimationFrame(fn)),cancelFrame=platform.cancelFrame??(id=>cancelAnimationFrame(id)),pageDocument=platform.document??globalThis.document,listen=platform.listen??((type,fn,options)=>addEventListener(type,fn,options));
  let stream,source,analyser,sink,frame=0,generation=0,recording=false,started=0,last=0,segmenter,settings,deviceId='',inputDevices=[];
  const state={phase:'off',message:'Microphone off · nothing is uploaded',level:0,pitch:'—',count:0,elapsed:0,target:''},abort=new AbortController();
  const busy=()=>['requesting','count-in','listening'].includes(state.phase);
  function refresh(){const status=$('hum-status');if(status)status.textContent=state.message;const box=$('hum-controls');if(box)box.dataset.phase=state.phase;const start=$('hum-start');if(start){start.textContent=state.phase==='requesting'?'Cancel microphone request':recording?'■ Finish & add notes':'● Start humming';start.disabled=false;}if($('hum-target'))$('hum-target').textContent=state.target||getTarget();if($('hum-level'))$('hum-level').value=state.level;if($('hum-pitch'))$('hum-pitch').textContent=state.pitch;if($('hum-notes'))$('hum-notes').textContent=state.count+' notes';if($('hum-device'))$('hum-device').disabled=busy();onState({...state,busy:busy()});}
  function set(phase,message){state.phase=phase;state.message=message;refresh();}
  function release(){cancelFrame(frame);source?.disconnect();analyser?.disconnect();sink?.disconnect();stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream=null;source=analyser=sink=null;}
  function stop(save=true){generation++;const notes=recording&&save?segmenter.stop(Math.max(0,audio.ctx.currentTime-started)):null;recording=false;release();state.phase='off';state.level=0;state.pitch='—';if(notes?.length){const message=onCapture(notes)||notes.length+' notes added to '+state.target;state.count=notes.length;set('done',message);toast(message);}else if(notes){set('error','No clear melody was detected. Check the input meter, then hum one note at a time in a quieter room.');}else set('off','Microphone off · nothing is uploaded');}
  async function deadline(promise,ms,message){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]);}finally{clearTimeout(timer);}}
  async function start(){if(busy()){stop();return;}const token=++generation;state.target=getTarget();state.count=0;state.elapsed=0;state.pitch='—';state.level=0;settings={...getSettings()};set('requesting','Waiting for microphone permission. Allow it in the browser prompt, or cancel.');
    try{onBeforeStart();if(!devices?.getUserMedia)throw Error('Microphone access is unavailable here. Use HTTPS or localhost in a browser that supports microphone capture.');
      // Both requests begin in the original click. Never wait for studio audio before showing a mic prompt.
      const capture=Promise.resolve(devices.getUserMedia({video:false,audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(deviceId?{deviceId:{exact:deviceId}}:{})}})).then(next=>{if(token!==generation){next.getTracks().forEach(t=>t.stop());return null;}stream=next;return next;});
      const [next]=await Promise.all([deadline(capture,permissionTimeout,'Still waiting for microphone permission. Allow it in the browser/site settings, then retry.'),deadline(audio.resume(),audioTimeout,'Studio audio did not start. Click the Sound button and try again.')]);if(token!==generation||!next)return;
      source=audio.ctx.createMediaStreamSource(stream);analyser=audio.ctx.createAnalyser();analyser.fftSize=4096;sink=audio.ctx.createGain();sink.gain.value=0;source.connect(analyser);analyser.connect(sink);sink.connect(audio.ctx.destination);const data=new Float32Array(analyser.fftSize);segmenter=new HumSegmenter();started=audio.ctx.currentTime+120/settings.bpm;recording=true;set('count-in','Microphone connected · two-beat count-in');
      for(const t of stream.getAudioTracks?.()||[])t.onended=()=>{if(token===generation){stop();if(state.phase==='off')set('error','The microphone disconnected. Reconnect it and try again.');}};
      devices.enumerateDevices?.().then(list=>{if(token!==generation)return;inputDevices=list.filter(d=>d.kind==='audioinput');bindDevice();}).catch(()=>{});
      function tick(now){if(token!==generation)return;frame=requestFrame(tick);if(now-last<50)return;last=now;analyser.getFloatTimeDomainData(data);let power=0;for(const v of data)power+=v*v;state.level=Math.min(1,Math.sqrt(power/data.length)*8);const time=audio.ctx.currentTime-started;state.elapsed=Math.max(0,time);
        if(time<0){set('count-in','Get ready · '+Math.ceil(-time*settings.bpm/60)+' beats');return;}
        const pitch=detectHum(data,audio.ctx.sampleRate);segmenter.update(pitch,time);state.count=segmenter.notes.length+(segmenter.active?1:0);
        if(pitch){const target=Math.round(pitch.midi),cents=Math.round((pitch.midi-target)*100),name=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((target%12)+12)%12]+(Math.floor(target/12)-1);state.pitch=name+' · '+(cents>0?'+':'')+cents+'¢';set('listening','Listening into '+state.target+' · '+Math.floor(time)+'s · finish to add your notes');}
        else{state.pitch='—';set('listening',state.level<.02?'Microphone connected, but very quiet. Hum closer or check the selected input.':'Listening · hum one clear note at a time');}
        if(time>60){stop();toast('Saved at the one-minute humming limit.');}}
      frame=requestFrame(tick);
    }catch(e){if(token===generation){generation++;recording=false;release();set('error',MIC_ERRORS[e.name]||e.message);}}
  }
  function bindDevice(){const picker=$('hum-device');if(!picker)return;const old=deviceId;picker.replaceChildren();const option=pageDocument.createElement('option');option.value='';option.textContent='Default microphone';picker.append(option);for(const d of inputDevices){const o=pageDocument.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Microphone';picker.append(o);}picker.value=old;picker.onchange=e=>{deviceId=e.target.value;};picker.disabled=busy();}
  function bind(){if($('hum-start'))$('hum-start').onclick=start;if($('hum-cancel'))$('hum-cancel').onclick=()=>stop(false);bindDevice();refresh();}
  listen('pagehide',()=>stop(),{signal:abort.signal});pageDocument?.addEventListener('visibilitychange',()=>{if(pageDocument.hidden&&busy())stop();},{signal:abort.signal});bind();
  return{start,stop,bind,refresh,dispose(){stop(false);abort.abort();},get active(){return recording;},get busy(){return busy();},get state(){return{...state,busy:busy()};}};
}
