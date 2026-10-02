export const NOTE_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const c=(root,quality='major')=>({root,quality});
/** Curated, expandable harmonic vocabulary; not an exhaustive list of songs. */
export const PROGRESSIONS=[
  {id:'pop',name:'Familiar pop',roman:'I · V · vi · IV',chords:[c(0),c(7),c(9,'minor'),c(5)]},
  {id:'songwriter',name:'Singer-songwriter',roman:'vi · IV · I · V',chords:[c(9,'minor'),c(5),c(0),c(7)]},
  {id:'fifties',name:'Warm nostalgia',roman:'I · vi · IV · V',chords:[c(0),c(9,'minor'),c(5),c(7)]},
  {id:'three',name:'Three-chord sunshine',roman:'I · IV · V · IV',chords:[c(0),c(5),c(7),c(5)]},
  {id:'anthem',name:'Lift the roof',roman:'I · IV · vi · V',chords:[c(0),c(5),c(9,'minor'),c(7)]},
  {id:'jazz',name:'Little jazz café',roman:'ii7 · V7 · Imaj7 · Imaj7',chords:[c(2,'minor7'),c(7,'7'),c(0,'maj7'),c(0,'maj7')]},
  {id:'canon',name:'An unfolding story',roman:'I · V · vi · iii · IV · I · IV · V',chords:[c(0),c(7),c(9,'minor'),c(4,'minor'),c(5),c(0),c(5),c(7)]},
  {id:'blues',name:'Twelve-bar blues',roman:'I7 / IV7 / V7',chords:[0,0,0,0,5,5,0,0,7,5,0,7].map(r=>c(r,'7'))},
  {id:'andalusian',name:'Spanish sunset',roman:'i · ♭VII · ♭VI · V',chords:[c(0,'minor'),c(10),c(8),c(7)],minor:true},
  {id:'minor',name:'A wistful adventure',roman:'i · ♭VI · ♭III · ♭VII',chords:[c(0,'minor'),c(8),c(3),c(10)],minor:true},
  {id:'dream',name:'Dreamy seventh chords',roman:'Imaj7 · iii7 · IVmaj7 · ii7',chords:[c(0,'maj7'),c(4,'minor7'),c(5,'maj7'),c(2,'minor7')]},
  {id:'city',name:'City lights',roman:'I · ♭VII · IV · I',chords:[c(0),c(10),c(5),c(0)]},
  {id:'lament',name:'Tender minor',roman:'i · iv · V7 · i',chords:[c(0,'minor'),c(5,'minor'),c(7,'7'),c(0,'minor')],minor:true},
  {id:'circle',name:'Around the circle',roman:'I · IV · vii° · iii · vi · ii · V · I',chords:[c(0),c(5),c(11,'dim'),c(4,'minor'),c(9,'minor'),c(2,'minor'),c(7),c(0)]}
];
export const INTERVALS={major:[0,4,7],minor:[0,3,7],dim:[0,3,6],'7':[0,4,7,10],minor7:[0,3,7,10],maj7:[0,4,7,11]};
export function progression(project){return PROGRESSIONS.find(p=>p.id===project.progression)||PROGRESSIONS[0];}
export function chordAt(project,index){const p=progression(project),chord=p.chords[((index%p.chords.length)+p.chords.length)%p.chords.length];return{...chord,root:(chord.root+project.key)%12};}
export function chordName(chord){return NOTE_NAMES[chord.root]+({major:'',minor:'m',dim:'°','7':'7',minor7:'m7',maj7:'maj7'}[chord.quality]||'');}
export function chordNotes(chord,octave=48){return INTERVALS[chord.quality].map(i=>octave+chord.root+i);}
export function snapToKey(midi,key=0,minor=false){const scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];for(let d=0;d<12;d++)for(const n of[d===0?midi:midi-d,midi+d])if(scale.includes(((n-key)%12+12)%12))return n;return midi;}
export function guitarVoicing(chord){
  let f=(chord.root-4+12)%12,useA=false;if(f>7){f=(chord.root-9+12)%12;useA=true;}
  const shapes=useA?{major:[-1,f,f+2,f+2,f+2,f],minor:[-1,f,f+2,f+2,f+1,f],'7':[-1,f,f+2,f,f+2,f],minor7:[-1,f,f+2,f,f+1,f],maj7:[-1,f,f+2,f+1,f+2,f]}:{major:[f,f+2,f+2,f+1,f,f],minor:[f,f+2,f+2,f,f,f],'7':[f,f+2,f,f+1,f,f],minor7:[f,f+2,f,f,f,f],maj7:[f,f+2,f+1,f+1,f,f]};
  if(shapes[chord.quality])return shapes[chord.quality];
  // Diminished triad on three strings, not a falsely labeled major/minor shape.
  return [40,45,50,55,59,64].map((m,s)=>s<3?((chord.root+INTERVALS.dim[s]-m)%12+12)%12:-1);
}
export function newComposition(){return{version:1,title:'My little afterlight',key:0,bpm:96,lead:'keyboard',progression:'pop',bars:4,loop:true,snap:true,backing:'guitar-0',rhythm:'steady',tracks:[{id:'keys',name:'Keyboard',instrument:'keyboard',notes:[]},{id:'cedar',name:'Cedar guitar',instrument:'guitar-0',notes:[]},{id:'sage',name:'Sage guitar',instrument:'guitar-1',notes:[]},{id:'ivory',name:'Ivory guitar',instrument:'guitar-2',notes:[]}]};}
export function compositionEvents(project){
  const events=[];for(const track of project.tracks)for(const n of track.notes)events.push({...n,instrument:track.instrument});
  if(project.backing!=='none')for(let bar=0;bar<project.bars;bar++){
    const chord=chordAt(project,bar),beats=project.rhythm==='pop'?[0,1,1.5,2.5,3,3.5]:project.rhythm==='arpeggio'?[0,.5,1,1.5,2,2.5,3,3.5]:[0,2];
    if(project.backing==='keyboard')beats.forEach((b,i)=>{const notes=chordNotes(chord);(project.rhythm==='arpeggio'?[notes[i%notes.length]]:notes).forEach(midi=>events.push({beat:bar*4+b,midi,duration:project.rhythm==='arpeggio'?.45:1.8,velocity:.46,instrument:'keyboard',backing:true}));});
    else beats.forEach((b,i)=>{const e={beat:bar*4+b,chord,direction:i%2?-1:1,duration:project.rhythm==='pop'?.45:1.85,velocity:.58,instrument:project.backing,backing:true};if(project.rhythm==='arpeggio'){const frets=guitarVoicing(chord),strings=frets.flatMap((f,s)=>f>=0?[s]:[]),pattern=[0,1,2,3,4,5,4,3],s=strings[pattern[i%8]%strings.length];Object.assign(e,{string:s,fret:frets[s],duration:.9});}events.push(e);});
  }
  return events.filter(e=>e.beat>=0&&e.beat<project.bars*4).sort((a,b)=>a.beat-b.beat);
}
export function validateComposition(value){
  if(!value||value.version!==1||!Array.isArray(value.tracks)||value.tracks.length>4)throw Error('This is not an Afterlight composition.');
  const p=newComposition();p.title=String(value.title||p.title).slice(0,80);p.key=Math.max(0,Math.min(11,Math.round(Number(value.key)||0)));p.bpm=Math.max(40,Math.min(180,Number(value.bpm)||96));p.bars=Math.max(1,Math.min(128,Math.round(Number(value.bars)||4)));p.progression=PROGRESSIONS.some(x=>x.id===value.progression)?value.progression:'pop';p.backing=['none','keyboard','guitar-0','guitar-1','guitar-2'].includes(value.backing)?value.backing:p.backing;p.rhythm=['steady','pop','arpeggio'].includes(value.rhythm)?value.rhythm:'steady';p.lead=Object.hasOwn(INSTRUMENT_NAMES,value.lead)?value.lead:p.lead;p.loop=!!value.loop;p.snap=!!value.snap;
  for(const track of p.tracks){const source=value.tracks.find(t=>t&&t.instrument===track.instrument);if(!source)continue;track.notes=(Array.isArray(source.notes)?source.notes:[]).filter(n=>n&&typeof n==='object').slice(0,4096).map((n,i)=>({id:String(n.id||i),beat:Math.round(Math.max(0,Math.min(p.bars*4-.25,Number(n.beat)||0))*4)/4,midi:Math.round(Math.max(21,Math.min(108,Number(n.midi)||60))),duration:Math.max(.25,Math.min(512,Number(n.duration)||1)),velocity:Math.max(.15,Math.min(.9,Number(n.velocity)||.65))}));}
  return p;
}
export const INSTRUMENT_NAMES={keyboard:'Keyboard','guitar-0':'Cedar guitar','guitar-1':'Sage guitar','guitar-2':'Ivory guitar'};
export const PART_COLORS={keyboard:'#e5a7c7','guitar-0':'#e7bc82','guitar-1':'#96c9b4','guitar-2':'#a8bfee'};
export function activeInstruments(project){const parts=project.tracks.filter(t=>t.notes.some(n=>n.beat<project.bars*4)).map(t=>t.instrument);if(project.backing!=='none'&&!parts.includes(project.backing))parts.push(project.backing);return [...new Set(parts)];}
export function mainInstrument(project){const active=activeInstruments(project);return active.includes(project.lead)?project.lead:active.includes('keyboard')?'keyboard':active[0]||'keyboard';}
