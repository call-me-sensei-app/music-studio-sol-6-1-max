# Afterlight — Yua’s sound study

An original, code-built Three.js / TSL music-room prototype. **The Ananta/AAA visual target has not been achieved or accepted.** This is a work in progress, not a finished AAA game.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:5174/. A fresh session starts seated on the sofa. Development hot reload preserves the selected camera mode. Production starts on the sofa. WebGPU is the default; `?webgl` requests the WebGL2 backend. Earlier room/instrument rendering was tested on both paths; main-room WebGPU native frames are saved automatically. The restored musical tour has been replayed end-to-end on the WebGL fallback; foreground compositing is shader-tested in both WGSL and GLSL. The published WebGPU build was replayed through the original 55-second tour, with music continuing past its end. Native six-view performance/image gates were verified on WebGPU and WebGL; secondary performance views and real camera/microphone/phone workflows still need live review. CPU shader tests alone do not establish visual backend parity.

## Controls

- Drag to look; WASD to stand/walk; E interacts with the central target.
- C sits; V opens the cutaway overview; 1/2/3 inspect deck/keyboard/guitars; 4 browses records.
- Keyboard inspector: A W S E D F T G Y H U J K; Z/X octave; Shift sustain.
- F / ▶ Tour starts the musical 55-second showcase. It begins on the turntable, adds guitar and keyboard in the same key/tempo, shows the score, and ends with “Now it’s your turn.” Space / Pause holds the camera only; the music keeps going. Automatic completion returns to the sofa without lifting the stylus, braking, or fading the song. The live accompaniment repeats with the full record until its natural end. Escape / Stop tour explicitly exits.
- ✎ opens the Music Playground: aligned lanes for keyboard and three guitars, 14 chord-progression palettes, accompaniment, key/beat snapping, and a Main instrument selector. Other active parts appear as live bottom-left 3D previews during performance. Click a preview to make it main.
- Choose an explicit **Edit [instrument] lane** button or click the staff lane name. Click a note to select it; Delete/Backspace or Delete note removes just that note. **Starting melody → [lane]** fills vacant beats on the named lane/page, preserving all existing notes.
- **＋ Add 4 bars** continues the piece (up to 128 bars); page navigation keeps four bars legible. **Full sheet** shows every system. Drafts save locally; Save/Open song transfers `.afterlight.json` files. This is an editable staff/timing workspace, not professional engraving.
- **Hum into [lane]** immediately opens the visible capture card and requests microphone permission, counts in two beats, detects a monophonic melody locally, then adds beat-quantized/key-snapped notes to the selected part. The input meter, detected pitch, note count and permission/error status remain visible. Original voice is neither stored nor pitch-shifted. Stop releases the mic; capture is bounded to one minute. Quiet-room synthetic detector tests are not real-microphone accuracy evidence.
- ✋ opens Hands Play. First choose Computer, Phone, or Mouse/touch; then Magic (hand-height chords / sideways strums) or Direct (fingertip note guide). Camera video is off until an explicit Enable/Pair click. No microphone is requested by Hands Play. The touch pad and chord tiles work without a camera.
- Space starts/stops the record or strums the selected guitar. H hides the HUD; Escape returns to the sofa.
- The sun button switches golden/blue/city-night lighting and controls each room light and the window.
- The music-book button reads local MIDI, MusicXML or MXL. An original piano study is included. Keyboard performance closes the cloth panels, dims the room, and projects falling notes. Guitar performance displays inferred or explicit TAB string/fret/finger guides.

## Implementation

All room models, original textures/album graphics, instruments, foliage and audio are authored in code. No downloaded 3D models, sample libraries or commercial recordings are used. Three.js is pinned to 0.185.1.

The cat was **removed at the user's request**. Its scene object, colliders, picking, camera follow, controls and render-loop work are absent from the game. ToonLab is no longer imported into the game bundle. The old code, references, licensed vendor archive and rejected captures remain solely as development history; the isolated cat-study route is retired and no longer starts a renderer.

The deck has SI dimensions, separate platter/record angular dynamics, cue-lift guards, a circle-constrained tonearm, braking, RPM/pitch media-rate coupling and bidirectional PCM scratching. The keyboard has 88 individually moving keys, inharmonic modal synthesis and sustain. White and black key noses descend approximately 10mm in world space into a recessed keybed, with a small downward translation ensuring their rear caps never pop upward. Keys spring back smoothly after release. Score-hit lighting is a thin surface-following strip, not a raised glow orb. The headstock and neck now share a straight centreline and nut datum; the shaft/fretboard no longer protrude through the head face. The beanbag is a closed, slouched eight-panel fabric shell with a rear zip, not a character; it does not simulate individual filling beads. Guitars have equal-tempered fret spacing and Karplus–Strong synthesis. The selected guitar leaves its fixed wall hanger, presents its face in a natural diagonal camera-relative holding pose at unchanged scale, and returns exactly to its mount on exit. Guitar mode adds a depth-masked, half-resolution Gaussian background blur; the whole guitar depth envelope stays sharp. Scores schedule notes against the AudioContext clock, not visual timers.


The latest environment source removes the wall title, adds metric object-local material detail with independent roughness/normal channels, softens sofa upholstery with sewn piping, and reduces flat ambient fill in favor of directional golden-hour light and stronger contact shading. These source changes are not a claim of approved visual quality.

## Honest limits / next work

- The overall room, plants and city need further art-direction and asset refinement to reach the supplied Ananta references. More geometry and a shader alone do not establish AAA quality.
- Collision is conservative oriented bounds/ellipsoids plus swept cloth points. There is no complete triangle-level cloth/self-collision or dynamic rigid-body simulation of every prop.
- Audio is physically informed synthesis, not a measured/sampled concert grand or pickup model. The stylus contact system is simplified; it does not solve cantilever resonance or a full stereo microgroove.
- Guitar guides are not a full anatomically rigged pair of hands. MIDI does not encode the original musician’s fingering or picking technique; inferred arrangements are labeled explicitly.
- PDF/photo notation needs verified transcription. Grace notes and MIDI bends are reported as unsupported; advanced MusicXML repeats, capo/alternate-tuning TAB, harmonics and bends require an arranged/exported score first.
- The shelf plush now has a continuous sewn-body sculpt, embedded cloth ears, fabric textures and embroidery. **The user rejected its visual design.** It is not an accepted finished asset; a requested plush reference is pending. Topology tests are not artistic approval. “THE COLLECTION” and the earlier wall-title meshes are removed.
- Keyboard, guitar and record audio initialization are independent. Failed/stuck record workers use a cooperative, deterministic local PCM generator; worklet failures are reported instead of blocking every instrument. A real WebGPU session produced nonzero master RMS after the first decoupling fix; that is signal evidence, not proof of what the user hears. Later full playback and new supporting views still need live verification.
- In-app browser focus automation remains intermittent. The newest room code does render and produces native WebGPU canvas frames; a failed restored-guitar state (blur with no held instrument) was caught in those exports and fixed by restoring instrument selection. Live camera, humming microphone, recording codecs and real phone pairing have not been activated/tested by the agent. Do not interpret pure gesture/pitch/QR tests as hardware validation.

## Standalone phone pairing

The Phone tab displays a **locally generated private QR code** on a trusted HTTPS studio origin reachable by both devices. Scan it, then tap Share camera on the phone. Both devices must be on the same network. Signaling is same-origin, short-lived, role-token protected and held in memory; video uses a direct WebRTC connection and is not stored in the signaling server. No public QR service, STUN or TURN provider is configured. Some networks isolate clients and will not permit a direct connection.

**`127.0.0.1` is this computer, not a phone-reachable address.** The local preview intentionally shows a setup notice instead of a fake working QR. Use an OS-integrated phone webcam through Computer, or serve the studio with a trusted certificate/address reachable by both devices. Nothing has been publicly deployed/exposed automatically.

For a separately configured trusted TLS setup, use `AFTERLIGHT_HOST`, `AFTERLIGHT_TLS_KEY`, `AFTERLIGHT_TLS_CERT` with Vite or `npm run serve`. Certificate trust/firewall/network routing must be established by the user; do not bypass browser warnings. `npm run build` includes the game and `phone.html`; the provided production server also mounts the signaling bridge. A static file host alone does not provide `/api/phone`.

Local optional performance recording composites the native game canvas, performer video and compressed studio audio. It downloads to the device, uses supported browser MediaRecorder codecs, and stops/saves at ten minutes. No camera/microphone permission is auto-accepted by this agent.

## Development evidence / cost

`progress/captures/` holds native browser screenshots, including failed intermediate models. `progress/capture-manifest.json` records timestamps, dimensions, hashes, and honest notes. `progress/development-timelapse-room-pass.mp4` is the updated 37-second, 30-frame room/mechanics progress montage (selection and normalization recorded in room-montage-provenance.json). `progress/development-timelapse-first-stages.mp4` is the earlier chronological milestone montage (not continuous screen recording); native originals are untouched. `progress/source-snapshots/` and `progress/manifest.json` preserve stages. Later snapshots use the same shared ToonLab archive in `vendor/`; copy that folder into an older snapshot before restoring its npm dependencies if needed.

Development builds also include an automatic clean native-canvas milestone recorder (first settled frame, view changes and one-minute intervals). Earlier rejected cat-study exports remain history. Current main-room WebGPU exports are also present, with audio/ensemble/tour state metadata. The capture server now permits 750 retained native frames (the earlier 200/400-frame caps had been reached); it does not overwrite older evidence. Production includes the game and phone sender entries. Native canvas frames omit the HTML HUD and do not prove camera permission, sound heard, or device pairing.

`npm run usage` reads this chat’s recorded session counters. The HUD shows **active build time** (union of logged task-start/end intervals, excluding gaps), actual primary plus explicitly delegated-agent recorded tokens and a cache-aware **standard API-equivalent USD estimate**, not an invoice/subscription charge. Cached input is billed, not treated as free. Reasoning is a subset of output and is not double-charged. Per-step long-context tiers are used rather than applying a tier to cumulative usage. ImageGen reference-sheet fees are unavailable in the token logs and explicitly excluded, not assumed free. See `progress/COST.md` and `progress/usage.json`.

Repository: [call-me-sensei-app/music-studio-sol-6-1-max](https://github.com/call-me-sensei-app/music-studio-sol-6-1-max), published on `main`. Source snapshots, dependencies and build output remain excluded by the existing `.gitignore`; development captures, timelapses, reports and benchmark evidence are retained as project history.


## Restored tour / grounded exterior / styled startup — October 2 follow-up

- The approved camera path, 55-second timeline, shot targets/FOV, 16-second window-side guitar entrance, 26-second keyboard entrance, and guitar fly-out/return animation have been restored byte-for-byte. A portable hash fixture locks the four authored choreography files against accidental redesign.
- The tour guitar uses an isolated foreground render pass with the **actual model and live string/guide geometry**, preserving the original camera-relative staging while preventing room/window objects from occluding it. This is a game view-model compositing solution, **not proof of rigid-body guitar/wall contact simulation**. Original texture wear, tilt and physical model scale are unchanged.
- Guitar impulses, guide textures, foreground materials and background blur are warmed before the musical timeline starts. Startup runs after camera selection; preparation cannot consume the opening shot. Worker failure still falls back to deterministic local PCM. The worklet follows its audio clock; only explicit seek/scratch revisions reposition the groove, preventing a visual hitch from rewinding the record.
- A live WebGL replay reached the sofa/final invitation with camera time 55s while the record continued at 61.472s, 33⅓RPM, tracking true and RMS 0.03637. Both guitar and keyboard accompaniment remained active into the next score cycle. See `progress/tour-end-continuous-music-proof.json`. This measures the live audio graph, not a claim that the agent listened through the laptop speakers.
- CSS now loads through a render-blocking head stylesheet link, not through the large 3D JavaScript dependency graph. A tiny inline gate hides the whole body until the external stylesheet reveals it. No unstyled control layout should be exposed while CSS is pending.
- The skyline extends laterally behind the nearest facade, with a procedural cloud dome. Buildings now meet a continuous neighborhood ground level. A modeled asphalt street, curb/pavement, crossing, drains, planted park, benches, grass and shared-geometry trees fill the lower view. Outdoor lights follow the time-of-day independently of room switches. Latest ground/park pixel quality still needs review; no AAA claim is made.
- Explicit lane selection and deterministic starter-note placement were checked live: 8 notes went into Sage only; other editable lanes stayed empty. Delete/Backspace, permission cancellation, denied microphones, low-amplitude pitch and persistent capture-card rebinding are regression-tested. **No real microphone or camera was activated.**

Latest suite: **113 passing tests**; production main + phone build passed. Live browser proof screenshots are native JPEGs in `progress/captures/30-33*.jpg`; automatic clean renderer frames remain separately identified. The canceled cat remains absent. The plush, overall Ananta/AAA target, real microphone/camera/phone pairing and full hardware/audio-DSP parity remain unapproved/unverified. Subsequent steady-state WebGPU/WebGL measurements are recorded below.


## Measured performance pass — October 2

- The retained change is **bit-exact vertex indexing of existing static material batches**. Every triangle, normal and UV remains; no decimation, texture/resolution reduction, lighting reduction, AO-sample cut or shadow-quality cut.
- The completed confirmation series tested five distinct candidates with ABBA blocks across six views. Each iteration yielded <5% retained overall-frame improvement; changes that worsened performance were rejected, including spatial splitting, static transform caches and dirty-only dynamic-collider refresh. These experimental paths remain disabled for reproducibility.
- A separate final verification measured WebGPU mean frame interval **15.378 → 14.592 ms (5.11%)**, native GPU work **7.649 → 6.262 ms (18.13%)**, and CPU callback work **12.969 → 12.884 ms** (no statistically clear change). WebGL measured **26.231 → 25.673 ms (2.13%, confidence interval includes zero)**, native GPU work **8.949 → 7.465 ms (16.58%)**, and no clear CPU change. These are local 1280×720 / DPR 1 browser measurements, not portable hardware promises.
- Final image gates compare identical frozen states against both the previous retained state and the original all-off baseline. Worst WebGPU normalized RGB MAE was **0.00236%**, changed-pixel fraction **0.06836%**, and luminance SSIM loss **0.00141%**. All six WebGL image pairs were bit-identical. The <1% gate covers these tested views, not every possible camera or a universal perceptual guarantee.
- The approved four tour/choreography sources remain byte-for-byte unchanged. No plush redesign or other visual change is included.
- Development time now comes from the union of actual logged task boundaries, including overlapping historical agents only once. The cost breakdown exposes active, elapsed and excluded idle time separately. Waiting within an active task counts as task time; this is not an estimate of keystroke time. The five-hour overnight gap no longer inflates active build time.
- Reproduce locally with `/?benchmark&samples=160&warm=48`, click **Run optimization experiment**; use `&webgl` and **Validate published build** for fallback verification. This panel exists only in development, does not enable camera/microphone, mutes test audio, warms buffers/shaders, and saves genuine PNGs plus raw frame samples under `progress/performance/`. Periodic captures and usage scans are disabled in the benchmark tab during timing. Other user tabs and OS power/thermal conditions are not controlled.
- Full results, methodology, confidence intervals, rejected/calibration runs, native before/after comparisons, usage and time accounting: **`progress/performance-report.html`**. Regenerate with `node scripts/performance-report.mjs` after `npm run usage`. Startup/peak-memory costs and audio DSP throughput are not benchmarked.

Current regression suite: **123 passing tests**; production game + phone build passed. The Ananta/AAA visual-quality target and the rejected plush design are still not certified.

The published default WebGPU build was also replayed live: the original camera tour reached its 55s end, while the worklet-driven record continued to **126.043s**, at 33⅓RPM, with both accompanying instruments active (cycle 2), nonzero RMS 0.02920 and no reported audio error. See `progress/performance/published-tour-end.json`. This proves the running audio graph and continuous transport, not what was heard through physical speakers or a full tour-frame-time benchmark.
