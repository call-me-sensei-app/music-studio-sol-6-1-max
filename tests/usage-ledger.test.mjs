import {test} from 'node:test';import assert from 'node:assert/strict';import {parseUsage,aggregateUsage} from '../src/usage-ledger.js';
const event=(at,input,cached,output)=>({type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:input,cached_input_tokens:cached,output_tokens:output,total_tokens:input+output},last_token_usage:{input_tokens:1000}}}});
test('root and explicitly delegated agent usage are additive, with source deduplication',()=>{
  const main=parseUsage([event('a',1000,200,100),event('b',2200,900,160)],{id:'root',name:'Main'}),cat=parseUsage([event('c',600,400,80)],{id:'cat',name:'Cat'}),sum=aggregateUsage([main,cat,main]);
  assert.equal(sum.tokens.input_tokens,2800);assert.equal(sum.tokens.cached_input_tokens,1300);assert.equal(sum.tokens.output_tokens,240);assert.equal(sum.tokens.total_tokens,3040);assert.equal(sum.sources.length,2);assert.ok(Math.abs(sum.api_equivalent_usd-.00553)<1e-9);assert.equal(sum.steps.length,3);
});
test('repeated usage-counter snapshots do not charge input twice',()=>{const r=parseUsage([event('a',1000,900,20),event('b',1000,900,20)],{id:'root'});assert.equal(r.steps.length,1);assert.equal(r.tokens.total_tokens,1020);});
