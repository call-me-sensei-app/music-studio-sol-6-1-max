# Local hand tracking assets

Google MediaPipe Tasks Vision 1.0.1 and the official float16 Hand Landmarker bundle v1. Original source URLs, exact model/SDK version and SHA-256 checks are in PROVENANCE.json. SDK license is preserved at vendor/MediaPipe-LICENSE.txt in the project. These are pose-detection/runtime dependencies, not generated room art, audio or 3D models.

`npm run prepare:hands` copies installed SDK/WASM and translates the authored src/hand-worker.js into a classic worker. The SDK's WASM loader uses importScripts; do not switch this to a module worker. Model files are deliberately already local; the preparation script does not silently fetch them.

Camera video is off until the user explicitly starts it. Tracking is performed locally. No runtime CDN, raw-frame upload or audio/microphone capture is used for Hands Play. Camera/phone/microphone hardware accuracy is unverified in this development session.
