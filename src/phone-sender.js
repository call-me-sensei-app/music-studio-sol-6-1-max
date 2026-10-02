const params=new URLSearchParams(location.hash.slice(1)),id=params.get('id'),token=params.get('token'),status=document.querySelector('#state'),video=document.querySelector('#phone-video');
let peer,stream,timer,closed=true,cursor=0,pending=[];
const headers={'Content-Type':'application/json','X-Pair-Role':'phone','X-Pair-Token':token||''};
async function send(data){const r=await fetch('/api/phone/'+id,{method:'POST',headers,body:JSON.stringify(data)});if(!r.ok)throw Error((await r.json()).error||'Pairing failed.');}
async function stop(){closed=true;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());peer?.close();video.srcObject=null;document.querySelector('#phone-stop').disabled=true;document.querySelector('#phone-start').disabled=false;try{await send({type:'end'});}catch{}}
document.querySelector('#phone-stop').onclick=async()=>{await stop();status.textContent='Camera off. Nothing is being shared.';};
document.querySelector('#phone-start').onclick=async()=>{
  try{
    if(!id||!token)throw Error('Open the private pairing link shown by your laptop.');if(!isSecureContext)throw Error('A trusted HTTPS address is required for phone camera access.');
    closed=false;cursor=0;pending=[];stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:960},height:{ideal:540},frameRate:{ideal:24,max:30}}});video.srcObject=stream;await video.play();
    peer=new RTCPeerConnection({iceServers:[]});stream.getTracks().forEach(t=>peer.addTrack(t,stream));peer.onicecandidate=e=>{if(e.candidate)send({type:'ice',candidate:e.candidate.toJSON()}).catch(()=>{});};peer.onconnectionstatechange=()=>status.textContent=peer.connectionState==='connected'?'Connected. Watch your laptop and make some music.':'Camera link: '+peer.connectionState;
    document.querySelector('#phone-start').disabled=true;document.querySelector('#phone-stop').disabled=false;
    async function poll(){if(closed)return;try{const r=await fetch('/api/phone/'+id+'?after='+cursor,{headers}),messages=await r.json();if(!r.ok||messages.error)throw Error(messages.error||'Pairing expired.');for(const m of messages){cursor=Math.max(cursor,m.seq);if(m.data.type==='offer'){await peer.setRemoteDescription(m.data.description);for(const ice of pending)await peer.addIceCandidate(ice);pending=[];await peer.setLocalDescription(await peer.createAnswer());await send({type:'answer',description:peer.localDescription.toJSON()});}else if(m.data.type==='ice'){if(peer.remoteDescription)await peer.addIceCandidate(m.data.candidate);else pending.push(m.data.candidate);}else if(m.data.type==='end')await stop();}}catch(e){status.textContent=e.message;await stop();}if(!closed)timer=setTimeout(poll,650);}
    poll();
  }catch(e){status.textContent=e.message;await stop();}
};
addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());peer?.close();});
if(!id||!token)status.textContent='Open the private phone-camera link from the laptop camera panel.';
