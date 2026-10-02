import {test} from 'node:test';import assert from 'node:assert/strict';import {PhoneSessions} from '../scripts/phone-bridge.mjs';import {phoneOriginReady} from '../src/phone-peer.js';
test('phone pairing separates roles, needs private tokens, and claims only one answer',()=>{
 const s=new PhoneSessions(),p=s.create();assert.throws(()=>s.poll(p.id,'phone',p.desktop));s.send(p.id,'desktop',p.desktop,{type:'offer',description:{type:'offer',sdp:'test'}});assert.equal(s.poll(p.id,'phone',p.phone).length,1);assert.equal(s.poll(p.id,'desktop',p.desktop).length,0);s.send(p.id,'phone',p.phone,{type:'answer',description:{type:'answer',sdp:'test'}});assert.throws(()=>s.send(p.id,'phone',p.phone,{type:'answer'}));assert.throws(()=>s.send(p.id,'phone',p.phone,{type:'offer'}));
});
test('pairing expires, revokes, bounds messages and stores no video',()=>{
 let now=0;const s=new PhoneSessions(()=>now),p=s.create();assert.throws(()=>s.send(p.id,'phone',p.phone,{type:'frame',video:'pixels'}));assert.throws(()=>s.send(p.id,'phone',p.phone,{type:'ice',candidate:'a'.repeat(81000)}));now=15*60*1000+1;assert.throws(()=>s.poll(p.id,'desktop',p.desktop));const q=s.create();s.remove(q.id,'desktop',q.desktop);assert.throws(()=>s.poll(q.id,'phone',q.phone));
});
test('standalone phone links refuse loopback and insecure origins',()=>{
 assert.equal(phoneOriginReady('http://192.168.1.20:5174'),false);assert.equal(phoneOriginReady('https://localhost:5174'),false);assert.equal(phoneOriginReady('https://studio.example'),true);
});
