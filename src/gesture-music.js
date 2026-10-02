const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Musical interpretation is authored rules, not generative music. Landmarks are
 * normalized camera coordinates. Tests use synthetic coordinates, not fake footage.
 */
export class GestureMusic{
  constructor(){this.reset();}
  reset(){this.last=null;this.side=0;this.wasPinched=false;this.chord=0;this.pending=-1;this.pendingSince=0;this.lastStrum=-1000;this.fingers=new Map();this.lostAt=0;}
  update(hands,time,{mode='magic',chordCount=4,mirror=true}={}){
    const events=[];if(!hands?.length){if(this.fingers.size){for(const [id,midi]of this.fingers)events.push({type:'off',id,midi});this.fingers.clear();}this.last=null;this.side=0;return{events,chord:this.chord,tracking:false};}
    const selector=hands[0],strummer=hands[1]||selector,palm=hand=>({x:(hand[0].x+hand[5].x+hand[9].x+hand[17].x)/4,y:(hand[0].y+hand[5].y+hand[9].y+hand[17].y)/4});
    const a=palm(selector),b=palm(strummer),x=mirror?1-b.x:b.x,y=a.y;
    const chord=clamp(Math.floor((1-y)*chordCount),0,chordCount-1);
    if(chord!==this.pending){this.pending=chord;this.pendingSince=time;}if(time-this.pendingSince>180)this.chord=chord;
    const size=Math.max(.04,Math.hypot(strummer[5].x-strummer[17].x,strummer[5].y-strummer[17].y)),pinch=Math.hypot(strummer[4].x-strummer[8].x,strummer[4].y-strummer[8].y)/size;
    if(mode==='magic'){
      if(this.last&&time>this.last.time){const speed=(x-this.last.x)/((time-this.last.time)/1000),nextSide=x<.47?-1:x>.53?1:this.side,crossed=this.side!==0&&nextSide!==this.side;
        if(pinch>.28&&crossed&&Math.abs(speed)>.25&&time-this.lastStrum>280){events.push({type:'strum',chord:this.chord,direction:speed>0?1:-1,velocity:clamp(.38+Math.abs(speed)*.15,.35,.85)});this.lastStrum=time;}
      }
      this.side=x<.47?-1:x>.53?1:this.side;this.last={x,time};if(pinch<.23&&!this.wasPinched)events.push({type:'mute'});this.wasPinched=pinch<.23;
      return{events,chord:this.chord,tracking:true,pinched:pinch<.23,x,y};
    }
    const seen=new Set();hands.forEach((hand,h)=>[4,8,12,16,20].forEach((tip,i)=>{const id=h+':'+i,p=hand[tip],xx=mirror?1-p.x:p.x,midi=60+clamp(Math.floor(xx*24),0,23);seen.add(id);
      if(p.y>.61&&!this.fingers.has(id)){this.fingers.set(id,midi);events.push({type:'on',id,midi,velocity:.65});}
      else if(p.y<.55&&this.fingers.has(id)){events.push({type:'off',id,midi:this.fingers.get(id)});this.fingers.delete(id);}
    }));
    for(const [id,midi]of this.fingers)if(!seen.has(id)){events.push({type:'off',id,midi});this.fingers.delete(id);}
    return{events,chord:this.chord,tracking:true,pinched:false,x,y};
  }
}
