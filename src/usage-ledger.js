import {priceStep} from './accounting.js';
const counters=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'];
const costFields=['uncached_input_usd','cached_input_usd','cache_write_usd','output_usd'];

/** Parse one source once. Child-agent counters start independently; cached input remains a billed subset. */
export function parseUsage(rows,identity){
  let previous={},latest,model,effort,serviceTier,cost=0;const steps=[],breakdown=Object.fromEntries(costFields.map(k=>[k,0]));
  for(const row of rows){
    if(row.type==='turn_context'){model=row.payload.model;effort=row.payload.effort||row.payload.reasoning_effort;serviceTier=row.payload.service_tier;}
    if(row.type!=='event_msg'||row.payload?.type!=='token_count'||!row.payload.info?.total_token_usage)continue;
    const info=row.payload.info,t=info.total_token_usage,d={};for(const k of counters)d[k]=Math.max(0,(t[k]||0)-(previous[k]||0));previous=t;latest={timestamp:row.timestamp,total:t};
    if(!d.input_tokens&&!d.output_tokens)continue;const priced=priceStep(d,info.last_token_usage?.input_tokens||0);cost+=priced.api_equivalent_usd;for(const k of costFields)breakdown[k]+=priced[k];steps.push({source_id:identity.id,source_name:identity.name,at:row.timestamp,...d,...priced});
  }
  return{...identity,usage_as_of:latest?.timestamp,tokens:latest?.total||Object.fromEntries(counters.map(k=>[k,0])),model,reasoning_effort:effort,service_tier:serviceTier,api_equivalent_usd:cost,cost_breakdown:breakdown,steps};
}

export function aggregateUsage(sources){
  const unique=[...new Map(sources.map(s=>[s.id,s])).values()],tokens=Object.fromEntries(counters.map(k=>[k,0])),breakdown=Object.fromEntries(costFields.map(k=>[k,0]));let cost=0;
  for(const s of unique){for(const k of counters)tokens[k]+=s.tokens[k]||0;for(const k of costFields)breakdown[k]+=s.cost_breakdown[k]||0;cost+=s.api_equivalent_usd;}
  return{tokens,cost_breakdown:breakdown,api_equivalent_usd:Number(cost.toFixed(6)),usage_as_of:unique.map(s=>s.usage_as_of).filter(Boolean).sort().at(-1),sources:unique.map(({steps,...s})=>s),steps:unique.flatMap(s=>s.steps).sort((a,b)=>a.at.localeCompare(b.at))};
}
