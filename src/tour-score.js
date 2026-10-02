import {newComposition,chordAt,chordNotes} from './composition.js';
export const TOUR_ENTRANCES={'guitar-0':16,keyboard:26};
export function tourComposition(){const p=newComposition();Object.assign(p,{title:'Blue hour · now it’s your turn',bpm:86,bars:20,progression:'fifties',rhythm:'arpeggio',loop:false,lead:'keyboard'});for(let bar=0;bar<p.bars;bar++){const notes=chordNotes(chordAt(p,bar),60);for(let i=0;i<4;i++)p.tracks[0].notes.push({id:'tour-'+bar+'-'+i,beat:bar*4+i+.25,midi:notes[[0,2,1,2][i]],duration:.75,velocity:.48});}return p;}
