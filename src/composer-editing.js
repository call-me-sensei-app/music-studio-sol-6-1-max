import {snapToKey,progression} from './composition.js';
export function selectedScoreNote(project,selection){return selection&&project.tracks[selection.track]?.notes.find(n=>n.id===selection.id)||null;}
export function deleteScoreNote(project,selection){if(!selectedScoreNote(project,selection))return false;const part=project.tracks[selection.track];part.notes=part.notes.filter(n=>n.id!==selection.id);return true;}
/** Deterministic and non-destructive: fill vacant two-beat slots in exactly the selected lane/system. */
export function fillStartingMelody(project,track,page=0,id=()=>crypto.randomUUID()){
 const part=project.tracks[track];if(!part)return[];const first=page*16,last=Math.min(project.bars*4,first+16),minor=!!progression(project).minor,pattern=minor?[0,2,3,7,3,2,0,2]:[0,2,4,7,4,2,0,2],base=part.instrument==='keyboard'?60:48,added=[];
 for(let beat=first,i=0;beat<last;beat+=2,i++){const duration=Math.min(1.5,project.bars*4-beat);if(part.notes.some(n=>n.beat<beat+duration&&n.beat+n.duration>beat))continue;const n={id:id(),beat,midi:snapToKey(base+project.key+pattern[i%8],project.key,minor),duration,velocity:.65};if(part.notes.length>=4096)break;part.notes.push(n);added.push(n);}return added;
}
export function scorePointerAction({noteId,x,localY,eraser=false}){if(noteId)return eraser?'delete':'select-note';if(x<86||localY<42||localY>139)return 'select-lane';return eraser?'select-lane':'add-note';}
