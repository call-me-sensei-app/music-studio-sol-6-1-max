import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),directory=path.join(root,'progress/captures');
function dimensions(b){
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return{mime:'image/png',width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
  if(b[0]!==255||b[1]!==216)return{};let i=2;
  while(i<b.length-9){if(b[i]!==255){i++;continue;}let marker=b[++i];i++;if(marker===216||marker===217)continue;const length=b.readUInt16BE(i);if(length<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{mime:'image/jpeg',width:b.readUInt16BE(i+5),height:b.readUInt16BE(i+3)};i+=length;}
  return{mime:'image/jpeg'};
}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):/\.(jpg|jpeg|png)$/i.test(d.name)?[path.join(dir,d.name)]:[]);}
const notes={
  '07-city-lights-only.jpg':'Early city-only study; self-lit decorative graphics were corrected after this capture.',
  '08-window-cat-first-pose.jpg':'First primitive cat; user rejected the visual design.',
  '09-rebuilt-facade-and-cat.jpg':'Facade refinement; gray cat still an unapproved design.',
  '10-cat-and-geometric-city.jpg':'Geometry-built city and gray cat, prior to shader conversion.',
  '11-toonlab-anime-cat.jpg':'First actual ToonLab shader study; design not accepted.',
  '12-anime-cat-resting.jpg':'Rejected gray cat resting-pose study.',
  '13-anime-cat-camera-glance.jpg':'Rejected gray cat camera-tracking study.',
  '14-rebuilt-continuous-anime-cat.jpg':'Continuous tuxedo sculpt; ears visibly detached, corrected later.',
  '15-continuous-cat-yawn.jpg':'Early mouth-cavity/jaw study, prior to latest depth correction.',
  '16-ear-sockets-embedded.jpg':'Corrected ear embedding; attachment proof, not artistic approval.',
  '17-guitar-off-wall-first-pose.jpg':'Failed first hot-update integration: old main script did not inject GuitarPresentation into UI.',
  '18-guitar-held-diagonal.jpg':'First working held-guitar pose; headstock clipped, framing corrected next.',
  '19-guitar-held-complete-framing.jpg':'Verified off-wall diagonal guitar and strum, complete headstock framing; before background blur was added.'
};
const frames=files(directory).map(file=>{const b=fs.readFileSync(file),stat=fs.statSync(file),name=path.basename(file),at=stat.mtime;
  let nativeMeta;const sidecar=file.replace(/\.(jpg|jpeg|png)$/i,'.json');if(fs.existsSync(sidecar))nativeMeta=JSON.parse(fs.readFileSync(sidecar,'utf8'));return{file:path.relative(root,file),utc:at.toISOString(),tokyo:at.toLocaleString('sv-SE',{timeZone:'Asia/Tokyo'})+' +09:00',timestamp_source:'file modification time at capture save',...dimensions(b),sha256:crypto.createHash('sha256').update(b).digest('hex'),native_browser_capture:!nativeMeta?.native_renderer_export,native_renderer_export:!!nativeMeta?.native_renderer_export,hud_included:!nativeMeta?.native_renderer_export,scene_state:nativeMeta||undefined,notes:notes[name]||(nativeMeta?.native_renderer_export?(nativeMeta.mode?.startsWith('cat-study-')?'Native intermediate cat study; user rejected/cancelled the cat. Historical evidence, not an approved asset.':(nativeMeta.mode==='guitars'&&nativeMeta.guitar===-1?'Invalid restored guitar view: no held instrument, background blur visible. Rejected state, corrected by restoring the instrument selection.':'Automatic clean native renderer frame; no HUD or synthetic pixels.')):file.includes('yawn-study')?'Actual native-browser animation study, not AI imagery.':'Original live-development browser frame.'),milestone:!file.includes('yawn-study')};
}).sort((a,b)=>a.utc.localeCompare(b.utc));
const report={created_at:new Date().toISOString(),provenance:'Native browser screenshots and application-native renderer exports, distinguished per frame. No synthetic frames, interpolation, or AI retouching. Failed/rejected intermediates are intentionally retained.',frames};
fs.writeFileSync(path.join(root,'progress/capture-manifest.json'),JSON.stringify(report,null,2)+'\n');
const list=frames.filter(f=>f.milestone).map(f=>`file '${path.join(root,f.file).replaceAll("'","'\\''")}'\nduration 1.3`).join('\n');
const last=frames.filter(f=>f.milestone).at(-1);fs.writeFileSync(path.join(root,'progress/timelapse-frames.ffconcat'),`ffconcat version 1.0\n${list}\nfile '${path.join(root,last.file)}'\n`);
console.log(`${frames.length} native frames indexed; ${frames.filter(f=>f.milestone).length} chronological milestones.`);
