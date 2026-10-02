importScripts('/hands/vision_bundle.js');
const {FilesetResolver,HandLandmarker}=self.Vision;
let detector;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const files=await FilesetResolver.forVisionTasks(data.wasm);
      detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:data.model,delegate:'CPU'},canvas:new OffscreenCanvas(640,480),runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
      self.postMessage({type:'ready'});
    }else if(data.type==='frame'&&detector){
      const result=detector.detectForVideo(data.bitmap,data.time);data.bitmap.close();
      self.postMessage({type:'landmarks',time:data.time,landmarks:result.landmarks,handedness:result.handedness});
    }
  }catch(error){data.bitmap?.close();self.postMessage({type:'error',message:error.message});}
};
