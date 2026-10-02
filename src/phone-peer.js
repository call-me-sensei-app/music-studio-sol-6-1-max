export function phoneOriginReady(origin){const u=new URL(origin);return u.protocol==='https:'&&!['localhost','0.0.0.0','[::1]'].includes(u.hostname)&&!u.hostname.endsWith('.localhost')&&!/^127\./.test(u.hostname);}
export async function createPhoneReceiver(onStream,onStatus,onClosed=()=>{}){
  if(!phoneOriginReady(location.origin))throw Error('Standalone phone camera needs a trusted HTTPS room address reachable by both devices. Localhost cannot be opened from your phone. A phone exposed by your OS as a webcam can use the device picker instead.');
  const response=await fetch('/api/phone',{method:'POST'});if(!response.ok)throw Error('Phone-pairing server is unavailable.');const pair=await response.json();if(pair.error)throw Error(pair.error);
  const peer=new RTCPeerConnection({iceServers:[]});let cursor=0,closed=false,pending=[],timer;
  const headers={'Content-Type':'application/json','X-Pair-Role':'desktop','X-Pair-Token':pair.desktop};
  const send=data=>fetch('/api/phone/'+pair.id,{method:'POST',headers,body:JSON.stringify(data)});
  peer.addTransceiver('video',{direction:'recvonly'});peer.ontrack=e=>onStream(e.streams[0]||new MediaStream([e.track]));peer.onicecandidate=e=>{if(e.candidate)send({type:'ice',candidate:e.candidate.toJSON()}).catch(()=>{});};
  peer.onconnectionstatechange=()=>{if(closed)return;if(['failed','disconnected'].includes(peer.connectionState)){close('Phone disconnected. Pair again on the same network.');return;}if(peer.connectionState==='connected')onStatus('Phone camera connected');};
  await peer.setLocalDescription(await peer.createOffer());await send({type:'offer',description:peer.localDescription.toJSON()});
  async function poll(){if(closed)return;try{const r=await fetch('/api/phone/'+pair.id+'?after='+cursor,{headers});const messages=await r.json();if(!r.ok||messages.error)throw Error(messages.error||'Pairing failed.');for(const m of messages){cursor=Math.max(cursor,m.seq);if(m.data.type==='answer'){await peer.setRemoteDescription(m.data.description);for(const ice of pending)await peer.addIceCandidate(ice);pending=[];}else if(m.data.type==='ice'){if(peer.remoteDescription)await peer.addIceCandidate(m.data.candidate);else pending.push(m.data.candidate);}else if(m.data.type==='end')close();}}catch(e){close(e.message);}if(!closed)timer=setTimeout(poll,650);}
  poll();
  function close(reason){if(closed)return;closed=true;clearTimeout(timer);peer.close();fetch('/api/phone/'+pair.id,{method:'DELETE',headers}).catch(()=>{});if(reason)onClosed(reason);}
  return{url:location.origin+'/phone.html#id='+pair.id+'&token='+pair.phone,close,expires:pair.expires};
}
