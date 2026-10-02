import {compose} from './music.js';
self.onmessage=({data:{record,side,id}})=>{try{const b=compose(record,side);self.postMessage({id,...b},[b.data.buffer]);}catch(e){self.postMessage({id,error:e.message});}};
