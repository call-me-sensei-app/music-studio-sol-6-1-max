import {phoneBridge} from './scripts/phone-bridge.mjs';
import {defineConfig} from 'vite';import fs from 'node:fs';import path from 'node:path';import {execFile} from 'node:child_process';
import crypto from 'node:crypto';
const root=import.meta.dirname;let refreshing=null,last=0;
let reloadBatch;
const rendererReloadPlugin={name:'afterlight-coalesced-renderer-reload',hotUpdate({file,modules,timestamp}){
 if(this.environment.name!=='client'||!file.startsWith(path.join(root,'src'))||!file.endsWith('.js'))return;
 for(const module of modules)this.environment.moduleGraph.invalidateModule(module,new Set(),timestamp,true);
 clearTimeout(reloadBatch);const environment=this.environment;reloadBatch=setTimeout(()=>environment.hot.send({type:'full-reload',path:'*'}),900);
 return[];
}};
const capturePlugin={name:'afterlight-native-development-captures',configureServer(server){server.middlewares.use('/__dev/capture',async(req,res)=>{
 if(req.method!=='POST'){res.statusCode=405;res.end();return;}
 const directory=path.join(root,'progress/captures');fs.mkdirSync(directory,{recursive:true});
 if(fs.readdirSync(directory).filter(n=>n.startsWith('native-')&&n.endsWith('.png')).length>=750){res.statusCode=429;res.end('Development capture limit reached.');return;}
 const chunks=[];let size=0;try{for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024){res.statusCode=413;res.end();return;}chunks.push(chunk);}const png=Buffer.concat(chunks);
  if(png.length<24||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||png.readUInt32BE(16)*png.readUInt32BE(20)>32000000){res.statusCode=400;res.end('Expected a bounded native PNG.');return;}
  let meta={};try{meta=JSON.parse(decodeURIComponent(String(req.headers['x-afterlight-capture']||'')));}catch{}
  const stamp=new Date().toISOString(),safe=String(meta.mode||'scene').replace(/[^a-z0-9-]/gi,'').slice(0,20),name='native-'+stamp.replace(/[:.]/g,'-')+'-'+safe+'.png',out=path.join(directory,name);
  fs.writeFileSync(out,png);const sourceHash=crypto.createHash('sha256');for(const n of fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js')).sort())sourceHash.update(fs.readFileSync(path.join(root,'src',n)));
  fs.writeFileSync(out.replace(/\.png$/,'.json'),JSON.stringify({utc:stamp,...meta,image:{width:png.readUInt32BE(16),height:png.readUInt32BE(20)},source_hash:sourceHash.digest('hex'),hud_included:false,native_renderer_export:true},null,2)+'\n');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:name}));
 }catch{res.statusCode=500;res.end('Capture save failed.');}
});}};
const perfPlugin={name:'afterlight-performance-evidence',configureServer(server){server.middlewares.use('/__dev/perf/save',async(req,res)=>{
 if(req.method!=='POST'){res.statusCode=405;res.end();return;}
 const name=new URL(req.url,'http://localhost').searchParams.get('file');if(!name||!/^\d{4}-[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(json|png)$/.test(name)){res.statusCode=400;res.end('Invalid evidence filename');return;}
 try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024){res.statusCode=413;res.end();return;}chunks.push(chunk);}let data=Buffer.concat(chunks);
  if(name.endsWith('.png')){if(data.length<24||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||data.readUInt32BE(16)*data.readUInt32BE(20)>32000000)throw Error('Invalid PNG');}
  else{const value=JSON.parse(data.toString()),hash=crypto.createHash('sha256');for(const n of fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js')).sort())hash.update(fs.readFileSync(path.join(root,'src',n)));value.source_hash=hash.digest('hex');data=Buffer.from(JSON.stringify(value,null,2)+'\n');}
  const out=path.join(root,'progress/performance',name);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:name}));
 }catch(e){res.statusCode=400;res.end(e.message);}
});}};
// Production builds publish the recorded session ledger (progress/usage.json, without its per-step rows: the same
// shape /__dev/usage serves) as usage.json, which the HUD reads when no dev server is running.
const publishedUsagePlugin={name:'afterlight-published-usage',apply:'build',generateBundle(){const file=path.join(root,'progress/usage.json');if(!fs.existsSync(file)){this.warn('progress/usage.json is missing; the HUD will show no build ledger.');return;}this.emitFile({type:'asset',fileName:'usage.json',source:JSON.stringify({...JSON.parse(fs.readFileSync(file,'utf8')),steps:undefined})});}};
export default defineConfig({build:{assetsInlineLimit:0,rolldownOptions:{input:{main:path.join(root,'index.html'),phone:path.join(root,'phone.html')},output:{codeSplitting:{groups:[{name:'toonlab-runtime',test:/node_modules\/@call-me-sensei\/toonlab/},{name:'three',test:/node_modules\/three/}]}}}},server:{host:process.env.AFTERLIGHT_HOST||'127.0.0.1',https:process.env.AFTERLIGHT_TLS_KEY&&process.env.AFTERLIGHT_TLS_CERT?{key:fs.readFileSync(process.env.AFTERLIGHT_TLS_KEY),cert:fs.readFileSync(process.env.AFTERLIGHT_TLS_CERT)}:undefined,headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},port:5174,strictPort:true,watch:{ignored:['**/progress/**','**/dist/**']}},plugins:[{name:'afterlight-phone-bridge',configureServer(server){server.middlewares.use(phoneBridge());}},rendererReloadPlugin,capturePlugin,perfPlugin,publishedUsagePlugin,{name:'afterlight-development-ledger',configureServer(server){server.middlewares.use('/__dev/usage',async(req,res)=>{if(Date.now()-last>15000){if(!refreshing)refreshing=new Promise(resolve=>execFile(process.execPath,[path.join(root,'scripts/usage.mjs')],{cwd:root},()=>{last=Date.now();refreshing=null;resolve();}));await refreshing;}res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');try{const u=JSON.parse(fs.readFileSync(path.join(root,'progress/usage.json'),'utf8'));res.end(JSON.stringify({...u,steps:undefined}));}catch{res.end(JSON.stringify({unavailable:true}));}});}}]});
