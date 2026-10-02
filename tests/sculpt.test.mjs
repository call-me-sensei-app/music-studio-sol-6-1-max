import {test} from 'node:test';import assert from 'node:assert/strict';
import {sculpt,frontSurface,smoothUnion,ellipsoidDistance} from '../src/implicit-sculpt.js';
test('implicit surface has finite unit normals, welded vertices and outward triangles',()=>{
  const field=(x,y,z)=>Math.hypot(x,y,z)-.1027,g=sculpt(field,{min:[-.15,-.15,-.15],max:[.15,.15,.15],cells:[20,20,20]});const p=g.attributes.position,n=g.attributes.normal;assert.ok(p.count>1000);assert.ok(g.index.count>p.count);for(let i=0;i<p.count;i++){assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.0001);assert.ok(Math.abs(Math.hypot(p.getX(i),p.getY(i),p.getZ(i))-.1027)<.0011);assert.ok(p.getX(i)*n.getX(i)+p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0);}
  assert.ok(Math.abs(frontSurface(field,0,0)-.1027)<.0001);
});
test('anatomical fields remain valid at the center and blended attachment',()=>{assert.equal(ellipsoidDistance(0,0,0,[0,0,0,.1,.2,.3]),-.1);assert.ok(smoothUnion(-.02,.005,.04)<0);assert.equal(smoothUnion(Infinity,-.1,.04),-.1);});
