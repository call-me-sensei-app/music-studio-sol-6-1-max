# Reference cat reconstruction — intake

Authoritative evidence is the user's 360 × 360 illustration (`user-cat-reference.png`).
The generated `inferred-multiview-v1.png` is a design proposal for unseen sides and standing anatomy, **not ground truth**. It is used only as modeling guidance; no generated pixels or mesh enter the room renderer.

## Observation, before inference

- Category: chibi feline character, confidence 1.0. One opaque, fully framed subject against white, beside small decorative leaves/petals and a painted ground shadow.
- Form: oversized, low-set rounded head with a broad forehead and short muzzle; paired triangular ears; compressed body and rounded paws; unusually thick upward-curled tail. Bilateral anatomical symmetry, asymmetrical coat markings.
- Source pixel landmarks (manual observation, approximately ±3 px): skull crown y≈81, chin y≈235; skull x≈58…262. Head width/height ≈1.32. Ear tips near (97,45) and (259,91). Eye centres near (98,170) and (174,194), the difference arising from the three-quarter pose. Mouth centre near (123,199). Lowest paws y≈307. Tail visible x≈254…339, y≈72…278.
- Macro modules: continuous torso/four-leg skin, continuous skull, two attached ear shells, thick curled tail. Meso modules: lower jaw, cheek pads, four compressed paws. Micro: closed warm-brown eyes, tiny mouth, three whiskers per cheek, toe creases, pointed tan forehead patch, warm ear/flank/tail patches.
- Contacts: ears embed into the upper lateral skull, muzzle blends into the cheek surface, head overlaps chest/neck, paws share continuous limb skin, tail embeds into rump. Eye/mouth linework conforms to the skull rather than hovering in space.
- Palette: cream-white dominant surface, tan ear/crown markings, muted rose-brown flank and tail bands, salmon-pink ear interior, warm brown thin linework. The source shows watercolor-like shading, not physical specular highlights.
- Material interpretation: fur is represented as opaque matte stylized solid masses, no strand grooming. Metalness 0; inferred roughness ≈0.85. The illustration cannot establish measured roughness, normal maps, subsurface parameters or PBR.
- Identity-defining features: large head, short muzzle, small closed smiling eyes, attached warm-tan/pink ears, oversized curled tail and rounded compressed paws. These take priority over microscopic fur detail.

## Inferences and suitability

**Conditional pass** for a stylized procedural animation-ready interpretation. The original contains only a resting three-quarter view, with occluded joints and no back/standing view. Limb segment lengths, underside, back markings and tail depth are inferred. Generated alternate views are proposals, not recovered evidence; their side-specific markings must not override visible original markings. Natural gait is implemented with four leg chains and ground contact rather than humanoid/chibi hopping. Real gravitational jumps and feline compression can coexist with the deliberately chibi proportions, but this is not a veterinary anatomical simulation.

No exact 3D likeness, AAA-quality, renderer parity, or material-recovery claim is established by intake. The final result requires actual browser pose and multi-angle evidence.

## Proposed topology and motion contract

- L0: smooth implicit torso with articulated four-leg skin; separate continuous skull and blended cheeks.
- L1: volumetric curved tail, ear shells with embedded sockets.
- L2: recessed mouth bag, jaw/tongue, two small upper teeth.
- L5: coat masks and attached face linework.
- L-Proxy: invisible torso/head/ears/limb/paw proxies following bones.
- Four-beat walk with phase offsets, planted feet in world space, rounded paws facing support plane; bounded head tracking, breathing, blink, ear flick, yawning; crouched launch/tucked flight/extended landing; room navigation avoids occupied cells and returns to sill.
- Single-view/hidden-side confidence is low; multi-angle volume and rig integrity are independent of source-view similarity.

## Image generation provenance

Built-in `image_gen` called once using the original path, explicit user authorization relayed by the parent agent. Output copied from `/Users/juminoz/.codex/generated_images/01a0f70f-3bcd-7803-978f-6c382a67bfa5/exec-dbb0bb67-0ba2-4b67-b31d-66671eaa3387.png`.
The prompt requested a consistent 2-row modeling sheet: resting front/left/rear/right and three-quarter/standing/walking, cream/tan likeness, attached ears, four-leg anatomy, volumetric curled tail, no props, no text. It explicitly identified unseen-side interpretation as speculative.
Image-generation billing is not exposed in the session token ledger, so this call's cost is not asserted or included as a fabricated USD value.
