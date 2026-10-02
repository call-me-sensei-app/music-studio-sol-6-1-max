import {guitarFrequency} from './mechanics.js';
const tuning=[40,45,50,55,59,64];
export function fitGuitarNote(midi){while(midi<40)midi+=12;while(midi>86)midi-=12;const choices=tuning.flatMap((base,string)=>{const fret=midi-base;return fret>=0&&fret<=22?[{string,fret,midi}]:[];});return choices.sort((a,b)=>Math.abs(a.fret-4)-Math.abs(b.fret-4))[0];}
export const guitarBufferKey=(string,fret,type,detune)=>[string,fret,type,detune].join(':');
/** Deterministic fractional-delay string impulse; buffers can be prepared before a performance starts. */
export function guitarStringPCM(string,fret,type=0,detune=0,sr=48000){
 const f=guitarFrequency(string,fret,detune),n=Math.floor(sr*4),data=new Float32Array(n),period=sr/f-.5,ring=new Float32Array(Math.ceil(period)+2);let seed=(string*1021+fret*1237+827)||1;
 for(let i=0;i<ring.length;i++){seed=seed*16807%2147483647;ring[i]=(seed/2147483647*2-1)*Math.sin(i/ring.length*Math.PI);}let head=0,old=0;const damping=[.9976,.9988,.9982][type];
 for(let i=0;i<n;i++){const read=(head-period+ring.length*3)%ring.length,j=Math.floor(read),frac=read-j,val=ring[j]*(1-frac)+ring[(j+1)%ring.length]*frac,sample=(val+old)*.5*damping;old=val;ring[head]=sample;head=(head+1)%ring.length;data[i]=sample*Math.min(1,i/35,(n-i)/(sr*.25));}return data;
}
