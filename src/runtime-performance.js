import {ACTIVE_OPTIMIZATIONS} from './perf-defaults.js';
export const performanceOptions={enabled:new Set(ACTIVE_OPTIMIZATIONS),revision:0};
export const hasPerf=id=>performanceOptions.enabled.has(id);
const listeners=new Set();
export function setPerformanceOptions(ids){performanceOptions.enabled=new Set(ids);performanceOptions.revision++;for(const fn of listeners)fn(performanceOptions.enabled);}
export function onPerformanceOptions(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export const OPTIMIZATION_CANDIDATES=[
 {id:'indexed_batches',name:'Exact vertex indexing',area:'GPU',description:'Weld bit-identical vertex attributes in static material batches; retain every triangle and attribute.'},
 {id:'spatial_batches',name:'Spatially bounded city batches',area:'GPU',description:'Split oversized static batches by triangle centroid, preserving coordinates and triangles, for exact frustum/shadow culling.'},
 {id:'static_local',name:'Static local-matrix caching',area:'CPU',description:'Cache unchanging local transforms; moving assemblies and their controls remain mutable.'},
 {id:'static_world',name:'Static world-matrix caching',area:'CPU',description:'Cache world transforms only outside every animated/interactive ancestor.'},
 {id:'collision_dirty',name:'Dirty-only dynamic collider refresh',area:'CPU',description:'Refresh the hierarchy once; invert matrices and rebuild bounds only when their values changed.'},
 {id:'cloth_dirty',name:'Cloth buffer/normal update coalescing',area:'CPU/GPU',description:'Update normals and upload vertex buffers only when a new worker deformation arrived.'},
 {id:'idle_keys',name:'Idle key-transform elimination',area:'CPU',description:'Avoid writing unchanged key transforms; retain the exact travel curve during press and release.'},
 {id:'foreground_branch',name:'Inactive foreground sampling bypass',area:'GPU',description:'Uniformly bypass the empty guitar foreground sample outside its performance stage.'},
 {id:'idle_guides',name:'Idle score/guide traversal elimination',area:'CPU',description:'Skip score visual scans only when neither playback nor any ringing visual event exists.'},
 {id:'ui_budget',name:'Unchanged HUD/pick-work elimination',area:'CPU',description:'Do not ray-test interaction prompts in non-live camera modes or rewrite an identical prompt.'},
 {id:'collider_serialization',name:'Collision snapshot reuse',area:'CPU',description:'Reuse cloth collision snapshots while dynamic collider transforms are unchanged.'}
];
