import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('the retired cat is absent from the game, picking and UI entry points',()=>{
  for(const file of['src/main.js','src/picking.js','src/camera.js','src/ui.js','src/milestone-recorder.js','index.html']){
    const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.ok(!/windowCat|cat\.root|cat\.update|cat-ink-toggle|cat-explore|cat-recall|Window companion|Visit the window cat|setWindowActor/.test(source),file);
  }
  assert.ok(!fs.readFileSync(new URL('../cat-study.html',import.meta.url),'utf8').includes('<script'));
});
