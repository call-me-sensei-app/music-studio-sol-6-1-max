const openStrings=[40,45,50,55,59,64];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function tempoClock(events,defaultTempo=500000){
  const sorted=[{tick:0,tempo:defaultTempo},...events].sort((a,b)=>a.tick-b.tick);
  const segments=[];let tick=0,seconds=0,tempo=defaultTempo;
  for(const e of sorted){seconds+=(e.tick-tick)*tempo/1e6;tick=e.tick;tempo=e.tempo;segments.push({tick,seconds,tempo});}
  return t=>{let s=segments[0];for(const q of segments){if(q.tick>t)break;s=q;}return s.seconds+(t-s.tick)*s.tempo/1e6;};
}
export function normalizeScore(score){
  if(!score.notes.length)throw Error('This score contains no playable pitched notes.');
  if(score.notes.length>12000)throw Error('Use a score with fewer than 12,000 notes.');
  score.notes.sort((a,b)=>a.time-b.time||a.midi-b.midi);
  for(const n of score.notes){if(![n.time,n.duration,n.midi].every(Number.isFinite)||n.time<0||n.duration<=0||!Number.isInteger(n.midi)||n.midi<0||n.midi>127)throw Error('The score has invalid timing.');n.velocity=clamp(n.velocity??.72,.03,1);}
  score.duration=Math.max(...score.notes.map(n=>n.time+Math.max(n.duration,n.soundDuration??n.duration)));
  if(score.duration>900)throw Error('Use a score of 15 minutes or less.');
  score.warnings??=[];return score;
}

/** SMF 0/1, PPQ tempo maps, running status, velocities, note-offs and CC64. */
export function parseMidi(bytes,title='Imported MIDI'){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(data.buffer,data.byteOffset,data.byteLength);let p=0;
  const need=n=>{if(p+n>data.length)throw Error('The MIDI file is truncated.');};
  const u8=()=>{need(1);return data[p++];};const u16=()=>{need(2);const x=v.getUint16(p);p+=2;return x;};const u32=()=>{need(4);const x=v.getUint32(p);p+=4;return x;};
  const text=n=>{need(n);const x=new TextDecoder().decode(data.subarray(p,p+n));p+=n;return x;};
  const vlq=()=>{let x=0;for(let i=0;i<4;i++){const b=u8();x=x*128+(b&127);if(!(b&128))return x;}throw Error('Invalid MIDI variable-length value.');};
  if(text(4)!=='MThd')throw Error('Not a Standard MIDI File.');const len=u32(),format=u16(),tracks=u16(),ppq=u16();
  if(len<6||format>1||ppq&32768||!ppq)throw Error('Use MIDI format 0 or 1 with musical PPQ timing (not SMPTE/format 2).');p+=len-6;
  const raw=[],tempos=[],pedals=[],parts=[],warnings=[];let longest=0;
  for(let track=0;track<tracks;track++){
    if(text(4)!=='MTrk')throw Error('Missing MIDI track.');const size=u32(),end=p+size;if(end>data.length)throw Error('Truncated MIDI track.');
    let tick=0,status=0,name='Track '+(track+1);const held=new Map();
    while(p<end){tick+=vlq();longest=Math.max(longest,tick);let b=u8();
      if(b<128){if(!status)throw Error('Invalid MIDI running status.');p--;b=status;}else if(b<240)status=b;
      if(b===255){const type=u8(),n=vlq();need(n);if(type===81&&n===3)tempos.push({tick:tick/ppq,tempo:data[p]*65536+data[p+1]*256+data[p+2]});if(type===3)name=new TextDecoder().decode(data.subarray(p,p+n));p+=n;status=0;continue;}
      if(b===240||b===247){const n=vlq();need(n);p+=n;status=0;continue;}
      if(b>=240)throw Error('Unsupported MIDI system event.');const type=b>>4,ch=b&15,a=u8(),z=[12,13].includes(type)?0:u8();
      const key=ch+':'+a;
      if(type===9&&z>0&&ch!==9){const list=held.get(key)||[];const n={tick,endTick:null,midi:a,velocity:z/127,part:String(track),channel:ch};list.push(n);held.set(key,list);raw.push(n);}
      if(type===8||(type===9&&z===0)){const list=held.get(key);if(list?.length)list.shift().endTick=tick;}
      if(type===11&&a===64)pedals.push({tick,channel:ch,down:z>=64});
      if(type===14&&(a+z*128)!==8192&&!warnings.includes('Pitch bends are not rendered.'))warnings.push('Pitch bends are not rendered.');
      if(type===11&&(a===123||a===120))for(const list of held.values())for(const n of list)if(n.channel===ch)n.endTick??=tick;
    }
    for(const list of held.values())for(const n of list)n.endTick??=tick+ppq/4;
    parts.push({id:String(track),name});p=end;
  }
  const clock=tempoClock(tempos);pedals.sort((a,b)=>a.tick-b.tick);
  const notes=raw.map(n=>{
    const end=Math.max(n.tick+1,n.endTick??longest);let pedal=false,off=end;
    for(const e of pedals){if(e.channel!==n.channel)continue;if(e.tick<=end)pedal=e.down;else if(pedal&&!e.down){off=e.tick;break;}}
    if(pedal&&off===end)off=Math.max(end,longest);
    const time=clock(n.tick/ppq),duration=clock(end/ppq)-time;
    return{time,duration,soundDuration:clock(off/ppq)-time,midi:n.midi,velocity:n.velocity,part:n.part};
  });
  return normalizeScore({title,notes,parts,warnings,format:'MIDI'});
}

export function parseMusicXML(xml,title='Imported MusicXML'){
  const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('The MusicXML is malformed.');
  if(doc.documentElement.localName!=='score-partwise')throw Error('Export score-partwise MusicXML first.');
  if(doc.querySelector('harmonic, bend, capo'))throw Error('Harmonics, bends and capo TAB need an explicitly arranged sounding-pitch export first.');
  if(doc.querySelector('ending, sound[dacapo], sound[dalsegno], sound[tocoda]'))throw Error('Volta endings / D.C. / D.S. need a fully expanded MusicXML export for exact playback.');
  const q=(e,path)=>e.querySelector(path),txt=(e,path,fallback='')=>q(e,path)?.textContent??fallback,num=(e,path,d=0)=>Number(txt(e,path,d));
  for(const tuning of doc.querySelectorAll('staff-tuning')){const line=Number(tuning.getAttribute('line')),step={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[txt(tuning,'tuning-step')],pitch=(num(tuning,'tuning-octave')+1)*12+step+num(tuning,'tuning-alter');if(line>=1&&line<=6&&pitch!==openStrings[line-1])throw Error('This TAB uses alternate tuning. Export an arranged sounding-pitch MIDI part for standard tuning.');}
  const titleText=txt(doc,'work-title',txt(doc,'movement-title',title));const parts=[...doc.querySelectorAll('part-list score-part')].map(p=>({id:p.id,name:txt(p,'part-name',p.id)}));
  const notes=[],tempos=[],warnings=[];
  for(const part of [...doc.documentElement.children].filter(e=>e.localName==='part')){
    const measures=[...part.children].filter(e=>e.localName==='measure'),order=[];let repeatStart=0;
    measures.forEach((m,i)=>{if(m.querySelector('repeat[direction="forward"]'))repeatStart=i;order.push(i);const repeat=m.querySelector('repeat[direction="backward"]');if(repeat){const times=clamp(Number(repeat.getAttribute('times')||2),2,8);for(let r=1;r<times;r++)for(let k=repeatStart;k<=i;k++)order.push(k);}});
    let division=1,beat=0,transpose=0,measureLength=4;const ties=new Map();
    for(const index of order){const m=measures[index];let cursor=beat,furthest=beat,lastStart=beat;
      for(const e of [...m.children]){
        if(e.localName==='attributes'){division=num(e,'divisions',division);if(division<=0)throw Error('MusicXML divisions must be positive.');if(q(e,'time'))measureLength=num(e,'time beats',4)*4/num(e,'time beat-type',4);if(q(e,'transpose'))transpose=num(e,'transpose chromatic')+12*num(e,'transpose octave-change');continue;}
        if(e.localName==='direction'||e.localName==='sound'){const sound=e.localName==='sound'?e:q(e,'sound'),unit={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125,'64th':.0625}[txt(e,'metronome beat-unit','quarter')]??1,dots=e.querySelectorAll('metronome beat-unit-dot').length,bpm=Number(sound?.getAttribute('tempo'))||num(e,'metronome per-minute')*unit*(2-2**(-dots));if(bpm>0)tempos.push({tick:cursor+num(e,'offset')/division,tempo:60000000/bpm});continue;}
        if(e.localName==='backup'){cursor-=num(e,'duration')/division;continue;}
        if(e.localName==='forward'){cursor+=num(e,'duration')/division;furthest=Math.max(cursor,furthest);continue;}
        if(e.localName!=='note')continue;
        if(q(e,'grace')){if(!warnings.includes('Grace notes need explicit durations to be performed.'))warnings.push('Grace notes need explicit durations to be performed.');continue;}
        const duration=num(e,'duration')/division,chord=!!q(e,'chord'),start=chord?lastStart:cursor;
        if(!chord){lastStart=cursor;cursor+=duration;}furthest=Math.max(furthest,start+duration);
        if(q(e,'rest')||!q(e,'pitch')||duration<=0)continue;
        const pitch={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[txt(e,'pitch step')],midi=(num(e,'pitch octave')+1)*12+pitch+num(e,'pitch alter')+transpose;
        const technical=q(e,'notations technical'),str=technical?num(technical,'string',-1):-1,fret=technical?num(technical,'fret',-1):-1;
        const string=str>=1&&str<=6?6-str:undefined;
        const actual=string!==undefined&&fret>=0?openStrings[string]+fret:midi;
        if(!Number.isFinite(actual))throw Error('The MusicXML contains an invalid pitch.');
        const key=[part.id,txt(e,'voice','1'),txt(e,'staff','1'),actual].join(':');const stop=!!e.querySelector('tie[type="stop"]'),begin=!!e.querySelector('tie[type="start"]');
        if(stop&&ties.has(key)){const n=ties.get(key);n.beatDuration=start+duration-n.beat;if(!begin)ties.delete(key);continue;}
        const n={beat:start,beatDuration:duration,midi:actual,velocity:clamp(Number(e.getAttribute('dynamics')||75)/100,.03,1),part:part.id,string,fret:fret>=0?fret:undefined,finger:technical?num(technical,'fingering',0):0,arpeggio:!!q(e,'notations arpeggiate')};notes.push(n);if(begin)ties.set(key,n);
      }
      // Pickups and incomplete measures retain encoded timing, empty measures use their time signature.
      beat=furthest>beat?furthest:beat+measureLength;
    }
  }
  const clock=tempoClock(tempos,60000000/100);
  for(const n of notes){n.time=clock(n.beat);n.duration=clock(n.beat+n.beatDuration)-n.time;delete n.beat;delete n.beatDuration;}
  return normalizeScore({title:titleText,notes,parts,warnings,format:'MusicXML'});
}

export async function importScore(file){
  if(file.size>5*1024*1024)throw Error('Choose a MIDI/MusicXML file smaller than 5 MB.');
  if(/\.mid(i)?$/i.test(file.name))return parseMidi(await file.arrayBuffer(),file.name);
  if(/\.mxl$/i.test(file.name)){
    const {unzipSync,strFromU8}=await import('three/addons/libs/fflate.module.js');
    const files=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:f=>f.originalSize<5*1024*1024&&/\.(xml|musicxml)$/i.test(f.name)});
    const container=files['META-INF/container.xml'];let path;
    if(container){const doc=new DOMParser().parseFromString(strFromU8(container),'application/xml');path=doc.querySelector('rootfile')?.getAttribute('full-path');}
    path??=Object.keys(files).find(k=>/\.(xml|musicxml)$/i.test(k)&&!k.startsWith('META-INF'));
    if(!path||!files[path])throw Error('No readable score was found inside the MXL file.');return parseMusicXML(strFromU8(files[path]),file.name);
  }
  if(/\.(xml|musicxml)$/i.test(file.name))return parseMusicXML(await file.text(),file.name);
  throw Error('PDF/photo books need verified transcription first. Import MIDI, MusicXML or MXL.');
}

/** Exact TAB wins; otherwise solve non-overlapping playable string positions and report inference. */
export function guitarVoicing(score){
  const result=[],groups=[];let lastFret=2,inferred=false;
  for(const n of score.notes){const g=groups.at(-1);if(g&&Math.abs(g[0].time-n.time)<.012)g.push(n);else groups.push([n]);}
  for(const group of groups){
    if(group.length>6)throw Error('This part has more than six simultaneous notes. Choose a guitar part.');
    const options=group.map(n=>n.string!==undefined&&n.fret!==undefined?[{string:n.string,fret:n.fret}]:openStrings.flatMap((base,string)=>{const fret=n.midi-base;return fret>=0&&fret<=22&&Number.isInteger(fret)?[{string,fret}]:[];}));
    if(options.some(o=>!o.length))throw Error('Some pitches are outside the guitar’s E2–D6 range. Choose another part or transpose the score.');
    let best=null,cost=Infinity;
    function solve(i,used,choices){if(i===group.length){const frets=choices.map(n=>n.fret).filter(f=>f>0),low=Math.min(...frets),high=Math.max(...frets);if(frets.length&&high-low>4)return;const c=(frets.length?high-low:0)*3+choices.reduce((a,n)=>a+(n.fret?Math.abs(n.fret-lastFret)*.13+n.fret*.04:0),0);if(c<cost){cost=c;best=choices.slice();}return;}for(const option of options[i])if(!(used&(1<<option.string))&&option.fret<=22)solve(i+1,used|(1<<option.string),[...choices,option]);}
    solve(0,0,[]);if(!best)throw Error('This chord is not playable in one four-fret hand position. Import an arranged guitar/TAB part.');
    const ordered=[...new Set(best.map(n=>n.fret).filter(f=>f>0))].sort((a,b)=>a-b);lastFret=ordered[0]??lastFret;
    group.forEach((n,i)=>{if(n.string===undefined)inferred=true;result.push({...n,...best[i],finger:n.finger||Math.max(0,ordered.indexOf(best[i].fret)+1)});});
  }
  return{...score,notes:result,inferred};
}

export function originalScore(){
  const notes=[],beat=60/86,chords=[[48,52,55],[45,48,52],[50,53,57],[43,47,50]],melody=[64,67,69,67,64,62,60,62,65,69,72,69,67,64,62,60];
  for(let bar=0;bar<8;bar++){
    chords[bar%4].forEach((midi,i)=>notes.push({time:bar*4*beat+i*.028,duration:3.7*beat,midi,velocity:.52,part:'piano'}));
    for(let k=0;k<4;k++)notes.push({time:(bar*4+k)*beat,duration:.83*beat,midi:melody[(bar*4+k)%melody.length],velocity:.69+k%2*.05,part:'piano'});
  }
  return normalizeScore({title:'A softer kind of evening',format:'Original study',notes,parts:[{id:'piano',name:'Piano study'}],warnings:[]});
}
