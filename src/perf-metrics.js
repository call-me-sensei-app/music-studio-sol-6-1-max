export const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
export function percentile(a,p){if(!a.length)return null;const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.floor(p*sorted.length))];}
export function summarizeFrames(rows){return{samples:rows.length,frame_ms:mean(rows.map(x=>x.frame_ms)),frame_p95_ms:percentile(rows.map(x=>x.frame_ms),.95),cpu_ms:mean(rows.map(x=>x.cpu_ms)),simulation_ms:mean(rows.map(x=>x.simulation_ms)),submission_ms:mean(rows.map(x=>x.submission_ms)),gpu_ms:mean(rows.map(x=>x.gpu_ms).filter(Number.isFinite)),gpu_samples:rows.filter(x=>Number.isFinite(x.gpu_ms)).length,draw_calls:mean(rows.map(x=>x.draw_calls)),triangles:mean(rows.map(x=>x.triangles))};}
export function imageDifference(a,b){
 if(a.length!==b.length||a.length%4)throw Error('Image dimensions differ');let error=0,changed=0,max=0,sa=0,sb=0,saa=0,sbb=0,sab=0;const n=a.length/4;
 for(let i=0;i<a.length;i+=4){let touched=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);error+=d;max=Math.max(max,d);if(d>2)touched=true;}if(touched)changed++;
  const x=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2],y=.2126*b[i]+.7152*b[i+1]+.0722*b[i+2];sa+=x;sb+=y;saa+=x*x;sbb+=y*y;sab+=x*y;
 }
 const ma=sa/n,mb=sb/n,va=Math.max(0,saa/n-ma*ma),vb=Math.max(0,sbb/n-mb*mb),cov=sab/n-ma*mb,ssim=((2*ma*mb+6.5025)*(2*cov+58.5225))/((ma*ma+mb*mb+6.5025)*(va+vb+58.5225));
 const result={normalized_mae:error/(n*3*255),changed_pixel_fraction:changed/n,ssim,ssim_loss:Math.max(0,1-ssim),max_channel_delta:max};
 result.pass=result.normalized_mae<.01&&result.ssim_loss<.01&&result.changed_pixel_fraction<.01;return result;
}
export function compareBlocks(blocks){
 const views=[...new Set(blocks.map(x=>x.view))],per_view=views.map(view=>{const pair={view};for(const variant of['A','B']){const b=blocks.filter(x=>x.view===view&&x.variant===variant);pair[variant]=summarizeFrames(b.flatMap(x=>x.frames));}pair.improvement_pct=100*(1-pair.B.frame_ms/pair.A.frame_ms);return pair;});
 const aggregate={};for(const variant of['A','B']){aggregate[variant]={};for(const key of['frame_ms','cpu_ms','simulation_ms','submission_ms','gpu_ms','draw_calls','triangles'])aggregate[variant][key]=mean(per_view.map(x=>x[variant][key]).filter(Number.isFinite));}
 aggregate.improvement_pct=100*(1-aggregate.B.frame_ms/aggregate.A.frame_ms);aggregate.cpu_improvement_pct=100*(1-aggregate.B.cpu_ms/aggregate.A.cpu_ms);aggregate.gpu_improvement_pct=aggregate.A.gpu_ms&&aggregate.B.gpu_ms?100*(1-aggregate.B.gpu_ms/aggregate.A.gpu_ms):null;
 // Pair bootstrap of whole view/block means: captures scene/block drift, not independent-frame pseudoreplication.
 const differences=blocks.filter(x=>x.variant==='A').map((a,i)=>{const b=blocks.filter(x=>x.variant==='B')[i];return[mean(a.frames.map(x=>x.frame_ms)),mean(b.frames.map(x=>x.frame_ms))];});let seed=73119;const rng=()=>{seed=seed*16807%2147483647;return seed/2147483647;},estimates=[];
 for(let k=0;k<2000;k++){let aa=0,bb=0;for(let j=0;j<differences.length;j++){const p=differences[Math.floor(rng()*differences.length)];aa+=p[0];bb+=p[1];}estimates.push(100*(1-bb/aa));}
 aggregate.improvement_ci95=[percentile(estimates,.025),percentile(estimates,.975)];
 for(const metric of['cpu','gpu']){const key=metric+'_ms',pairs=blocks.filter(x=>x.variant==='A').map((a,i)=>{const b=blocks.filter(x=>x.variant==='B')[i];return[mean(a.frames.map(x=>x[key]).filter(Number.isFinite)),mean(b.frames.map(x=>x[key]).filter(Number.isFinite))];}).filter(p=>p.every(v=>Number.isFinite(v)&&v>0));
  if(!pairs.length){aggregate[metric+'_improvement_ci95']=null;continue;}const ci=[];seed=73119;for(let k=0;k<2000;k++){let aa=0,bb=0;for(let j=0;j<pairs.length;j++){const p=pairs[Math.floor(rng()*pairs.length)];aa+=p[0];bb+=p[1];}ci.push(100*(1-bb/aa));}aggregate[metric+'_improvement_ci95']=[percentile(ci,.025),percentile(ci,.975)];
 }
 return{aggregate,per_view};
}
