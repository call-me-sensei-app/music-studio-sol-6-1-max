import crypto from 'node:crypto';
export class PhoneSessions{
  constructor(clock=()=>Date.now()){this.clock=clock;this.sessions=new Map();}
  create(){this.clean();if(this.sessions.size>=8)throw Error('Too many camera pairings.');const id=crypto.randomBytes(16).toString('hex'),desktop=crypto.randomBytes(24).toString('hex'),phone=crypto.randomBytes(24).toString('hex'),expires=this.clock()+15*60*1000;this.sessions.set(id,{desktop,phone,expires,seq:0,messages:[],claimed:false});return{id,desktop,phone,expires};}
  clean(){for(const [id,s]of this.sessions)if(s.expires<this.clock())this.sessions.delete(id);}
  authenticate(id,role,token){this.clean();const s=this.sessions.get(id);if(!s||!['desktop','phone'].includes(role)||typeof token!=='string'||token.length!==s[role].length||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(s[role])))throw Error('Pairing expired or not authorized.');return s;}
  send(id,role,token,data){const s=this.authenticate(id,role,token);if(!data||!['offer','answer','ice','end'].includes(data.type))throw Error('Invalid camera signaling message.');if(JSON.stringify(data).length>80000||s.messages.length>=160)throw Error('Camera signaling limit reached.');
    if((data.type==='offer'&&role!=='desktop')||(data.type==='answer'&&role!=='phone'))throw Error('Invalid pairing role.');
    if(data.type==='answer'&&s.claimed)throw Error('This pairing has already been claimed.');if(data.type==='answer')s.claimed=true;
    s.messages.push({seq:++s.seq,from:role,data});return{seq:s.seq};}
  poll(id,role,token,after=0){const s=this.authenticate(id,role,token);return s.messages.filter(m=>m.from!==role&&m.seq>after);}
  remove(id,role,token){this.authenticate(id,role,token);this.sessions.delete(id);}
}
export function phoneBridge(sessions=new PhoneSessions()){
  const rates=new Map();
  return async(req,res,next)=>{
    const url=new URL(req.url,'http://localhost');if(!/^\/api\/phone(?:\/[^/]+)?\/?$/.test(url.pathname))return next?.();
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{
      const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)throw Error('Same-origin camera pairing only.');
      const ip=req.socket?.remoteAddress||'local',at=Date.now(),bucket=rates.get(ip)||{at,count:0};if(at-bucket.at>60000){bucket.at=at;bucket.count=0;}if(++bucket.count>240){res.statusCode=429;res.end(JSON.stringify({error:'Camera pairing request limit.'}));return;}rates.set(ip,bucket);if(rates.size>128)for(const [key,b]of rates)if(at-b.at>60000)rates.delete(key);
      const [,id]=url.pathname.replace('/api/phone','').split('/'),role=req.headers['x-pair-role'],token=req.headers['x-pair-token'];let result;
      if(!id&&req.method==='POST')result=sessions.create();
      else if(id&&req.method==='GET')result=sessions.poll(id,role,token,Number(url.searchParams.get('after'))||0);
      else if(id&&req.method==='DELETE'){sessions.remove(id,role,token);result={ended:true};}
      else if(id&&req.method==='POST'){let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>80000)throw Error('Camera message too large.');body+=chunk;}result=sessions.send(id,role,token,JSON.parse(body));}
      else{res.statusCode=405;result={error:'Unsupported pairing request.'};}
      res.end(JSON.stringify(result));
    }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}));}
  };
}
