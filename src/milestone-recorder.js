/** Development-only native renderer exports requested for the build timelapse.
 * No DOM recreation, synthetic HUD, image generation, or simulated screenshots.
 */
export function milestoneRecorder(canvas,readState){
  if(!import.meta.env.DEV)return{tick(){}};
  const boot=performance.now();let frames=0,busy=false,shots=0,last=0,key='',stable=boot,saved='';
  function save(reason,state){
    busy=true;canvas.toBlob(async blob=>{try{
      if(blob){const meta={capture_mode:'native-renderer-canvas',reason,frames_since_boot:frames,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},...state};
        const response=await fetch('/__dev/capture',{method:'POST',headers:{'Content-Type':'image/png','X-Afterlight-Capture':encodeURIComponent(JSON.stringify(meta))},body:blob});
        if(response.ok){shots++;last=performance.now();saved=key;}else if(response.status===429)shots=40;
      }
    }catch{/* A production/static server need not accept development frames. */}finally{busy=false;}},'image/png');
  }
  return{tick(){
    frames++;if(busy||shots>=40||frames<3)return;const now=performance.now(),state=readState(),next=[state.backend,state.mode,state.lighting,state.guitar].join('/');
    if(next!==key){key=next;stable=now;}
    if(now-boot<1800||now-stable<1400)return;
    if(key!==saved){save(shots?'settled-view-change':'first-settled-frame',state);return;}
    if(now-last>60000)save('one-minute-development-milestone',state);
  }};
}
