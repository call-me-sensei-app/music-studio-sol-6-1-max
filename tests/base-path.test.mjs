import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

// The studio can be served from a sub-path (Vite's `base`), so same-origin URLs must resolve against the base URL or
// be relative. Root-absolute ones would leave the sub-path.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const rootAbsolute=/(?:href|src)=\\?["']\/(?!\/)|(?:fetch|new Worker|new URL|importScripts)\(\s*['"`]\/(?!\/)/g;
// Local-server endpoints: the dev-only recorders and ledger (vite.config.js) and phone pairing, which needs the
// studio's own signaling server (vite.config.js, scripts/serve.mjs) and lives at its root.
const allowed=['/__dev/','/api/phone','/phone.html'];

test('studio source resolves same-origin URLs against the base URL',()=>{
  const offenders=[];
  for(const name of readdirSync(new URL('../src/',import.meta.url))){
    if(!name.endsWith('.js'))continue;
    const source=read(`src/${name}`);
    for(const match of source.matchAll(rootAbsolute)){
      const url=source.slice(match.index+match[0].length-1);
      if(!allowed.some(prefix=>url.startsWith(prefix)))offenders.push(`src/${name}: ${source.slice(match.index,match.index+60)}`);
    }
  }
  assert.deepEqual(offenders,[]);
  assert.match(read('src/camera-play.js'),/new Worker\(import\.meta\.env\.BASE_URL\+'hands\/hand-worker\.js'\)/);
});

test('the hand worker loads its bundle next to itself',()=>{
  for(const path of ['public/hands/hand-worker.js','scripts/prepare-hands.mjs'])assert.match(read(path),/importScripts\('vision_bundle\.js'\)/,path);
  assert.doesNotMatch(read('public/hands/hand-worker.js'),/importScripts\(['"]\//);
});
