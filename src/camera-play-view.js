/** Source-first controls: only one camera path is presented at a time. */
export const CAMERA_SOURCES=['computer','phone','pad'];
export function cameraSourceNotice(source,securePhone){
  if(source==='phone'&&!securePhone)return 'This preview lives on your computer. Phone pairing needs a secure studio address that both devices can open.';
  if(source==='phone')return 'Scan the private QR code, then tap Share camera on your phone. Keep both devices on the same network.';
  if(source==='pad')return 'No camera needed. Pick a chord, or drag up/down and sweep across the centre to strum.';
  return 'Allow video when asked. Hand tracking stays on this device. No microphone is used.';
}
export function cameraPlayMarkup(){return `
  <button id="camera-close" class="close" aria-label="Close hands play">×</button>
  <small>AFTERLIGHT / HANDS PLAY</small><h2>Play with your hands.</h2><p class="hands-intro">A little movement. A little music.</p>
  <div class="hands-step"><span>01</span><h3>Choose your controls</h3></div>
  <div class="hands-sources" role="tablist" aria-label="Control source">
    <button role="tab" id="source-computer" data-source="computer" aria-selected="true">▣<span>Computer</span></button>
    <button role="tab" id="source-phone" data-source="phone" aria-selected="false">▯<span>Phone</span></button>
    <button role="tab" id="source-pad" data-source="pad" aria-selected="false">✧<span>Mouse / touch</span></button>
  </div>
  <div class="hands-source-card" id="hands-computer" role="tabpanel" aria-labelledby="source-computer">
    <p id="computer-notice"></p><button class="hands-primary" id="camera-local">Enable computer camera</button>
    <details class="hands-device"><summary>Choose a different camera</summary><label for="camera-device">Video device</label><select id="camera-device"><option value="">Default camera / system phone webcam</option></select><p>A phone already connected as a system webcam appears here.</p></details>
  </div>
  <div class="hands-source-card" id="hands-phone" role="tabpanel" aria-labelledby="source-phone" hidden>
    <p id="phone-notice"></p><button class="hands-primary" id="camera-phone">Pair phone via QR</button>
    <div id="phone-setup" class="hands-setup" hidden><strong>Secure address needed</strong><p>The QR code will appear on a trusted HTTPS studio address. Or connect your phone as a system webcam and choose <b>Computer</b>.</p></div>
    <div id="phone-link" hidden><canvas id="phone-qr" width="192" height="192" role="img" aria-label="Private phone camera pairing QR code"></canvas><strong>Scan with your phone camera</strong><p id="phone-expiry">Private pairing · expires in 15 minutes</p><details><summary>Use a link instead</summary><input id="phone-url" readonly aria-label="Private phone camera link"><button id="phone-copy">Copy pairing link</button></details></div>
  </div>
  <div class="hands-source-card" id="hands-pad" role="tabpanel" aria-labelledby="source-pad" hidden>
    <p id="pad-notice"></p><div id="magic-pad" tabindex="0" role="button" aria-label="Magic strum pad. Move up or down to pick a chord, swipe sideways to strum; Space plays the selected chord."><span>SWEEP ACROSS TO STRUM</span><strong id="magic-chord">C</strong><small>↑ Choose chord ↓ &nbsp; · &nbsp; ← Strum →</small></div>
  </div>
  <div class="hands-step" id="hands-mode-title"><span>02</span><h3>How do you want to play?</h3></div>
  <div class="hands-modes" id="camera-mode" role="group" aria-label="Play style">
    <button data-mode="magic" aria-pressed="true"><strong>✦ Magic</strong><span>Make chords sound good</span></button>
    <button data-mode="direct" aria-pressed="false"><strong>Direct</strong><span>Play individual notes</span></button>
  </div><p id="hands-guide" class="hands-guide"></p>
  <div class="hands-step"><span id="hands-instrument-step">03</span><h3>Make it yours</h3></div>
  <label class="hands-setting" for="camera-instrument">Instrument <select id="camera-instrument"><option value="guitar-0">Cedar guitar</option><option value="keyboard">Keyboard</option><option value="guitar-1">Sage guitar</option><option value="guitar-2">Ivory guitar</option><option value="band">Keyboard + cedar guitar</option></select></label>
  <label class="hands-setting" id="camera-palette-label" for="camera-palette">Chord flow <select id="camera-palette"></select></label>
  <div class="hands-chords" id="camera-chords" aria-label="Tap a chord to play"></div>
  <div class="hands-status-row"><span class="hands-dot" id="hands-dot"></span><p id="camera-status" role="status" aria-live="polite">Camera off</p><button id="camera-stop" disabled>Stop camera</button></div>
  <details class="hands-options"><summary>Video & recording <span>optional</span></summary><label><input id="camera-show" type="checkbox" checked> Show me in the corner</label><button id="camera-record" disabled>● Record performance</button><p>Save room video + your camera + studio audio locally. Your microphone is not recorded.</p></details>`;}
