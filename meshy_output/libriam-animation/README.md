# Libriam — Dragex attacks Moana and burrows beneath Yokai

October 12, 2026 author-requested animation study. Uses the existing, approved Meshy assets: Dragex task `01a132be-3acf-77f1-9efc-68d10bf884a9` and long Moana task `01a13295-eb98-7051-8e3b-3171ac115b07`. **No new Meshy jobs or credits were used.** Dragex remains 14,900 triangles and Moana 12,926.

## Play the scene

Open **`libriam-attack-and-burrow.blend`**. Select **Story_Camera**, enter camera view with Numpad 0, and press Space over the viewport or timeline. The scene is baked at **30 fps**, frames **1–1321**, representing a **44-second study**. It opens at frame 331 for the attack. Timeline markers divide approach, attack, return flight, walk and burrowing. **Libriam_Overview** is a second camera for inspecting the globe. Toggle overlays to inspect skeletons and named location anchors.

**`dragex-moana-animation-study.mp4`** is a lightweight rendered preview sampled at 5 fps; the editable Blender motion has 30 fps keys. The camera cuts and compressed travel times are animation choices, not fictional dates, geography changes or claims about dragon speeds. This is an animatic for review, not a final effects shot: no fluid splashes, excavated tunnel simulation, facial performance, final mountain sculpt or death/decay effects are included.

**`dragex-locomotion.glb`** adds reusable **Flight** and **Walk** clips to the prior Idle/Wing_Flap/Tail_Curl/Ground_Step asset clips. The walking pose uses alternating stance/swing foot targets and a two-segment leg solve with rest-roll preservation. The world sequence carries the root along the map; the portable clips remain in place. Terrain contact near the volcanic rim is approximate and needs further refinement for a finished cinematic.

## Geographic scale and provenance

- Exact spherical Libriam radius: **364.376984408999 km**; diameter **728.753968817998 km**; surface **1,668,444.4 km²**. **One Blender unit is one kilometre** in the world scene.
- Globe geometry comes from the repository's current source functions: `makeHokkaido`, `otherLandmasses`, Eden's Isle, lake/island fields and great-river routes. Hokkaido uses the source's default **20° N, 0° E** placement, matching its current authored coordinate system. This is a source snapshot, not a read of an independently saved browser project.
- Lake anchor: **19.75° N, 9.98° E**. Moana’s Tear island anchor: **19.601545° N, 10.26417° E**. Mount Yokai anchor from the globe source: **9.191537° N, 18.750231° W**.
- Both selected head spans are **14.063927234846 km**, matching the source-derived island edge separation. Anatomical landmark placement remains a modeling interpretation; this does not make the two head meshes identical in all dimensions.
- Mount Yokai’s requested **3–5× size** is interpreted as footprint span and implemented at **4×**, **56.255708939384 km**. The **18 km height**, open crater, shape and underground motion are **proposals**, not newly confirmed terrain measurements.
- The planet's dimensions match exactly within mesh floating-point precision. Coastlines, continents, rivers, the lake and island reproduce the source's current design. The broad land map is a packed 2K geographic texture; it is not a survey-quality coastal terrain mesh. Most elevation and biome detail remains unfinished. Do not call this a perfected terrain replica.

`geography.json`, `libriam-map.svg` and `libriam-map.png` preserve the source snapshot. The blend also includes the geography JSON as a Text datablock, named anchor empties and packed textures. The export script is `dragex-globe/export-blender-geography.mjs`; it reads source data without changing the globe UI or app behavior.

## Story and continuity

Phil confirms Dragex attacks Moana at the lake, then digs down and buries himself beneath Mount Yokai. **His complete sleep under Yokai remains the end of Age 1**, not the moment he begins digging. The strike/swipe, flight route and poses are draft choreography. No new fire power or precise mechanism for Moana's death is asserted by this study.

Phil also refines the intended later decay: Moana should be **bones by approximately halfway through Age 2**. Her skull-island and ribs visible throughout Death's Valley in Ages 3 and 4 remain confirmed. **The skeleton and decay model are deferred**, as requested; this scene focuses on the living dragons and the attack/burrowing sequence. Current canon, timeline and geography notes record those decisions.

## Checks and limitations

`scene-audit.json` records scale and the initial final-burial check; `verification.json` records the final scene checks and locomotion GLB round-trip tests. Both new clips must move the mesh and return to matching endpoints after re-import. Sampled scene poses must contain finite vertices; all of Dragex must be beneath the planet surface at the final frame. Existing model triangle budgets are unchanged.

Blender 5.2 initially crashed during the new leg solve before an explicit rig dependency update. Evaluation initialization was added, and subsequent builds completed. A leg-roll issue and surface normal/lighting issues were corrected during render review. Source files and the prior standalone assets remain preserved. The scene uses animation, not a physics/contact solver; extreme bends, residual intersections, jaw/facial motion and terrain contact still require work for production use. No destination-engine frame-rate benchmark is claimed.

Scripts in this folder rebuild their generated outputs intentionally. Build order: source geography export and SVG rasterization → `build_scene.py` → saved-scene refinements (`polish_scene.py`, `refine_attack.py`, `refine_walk_and_burrow.py`, `finalize_motion.py`) → `validate_and_render.py` → `encode_preview.py`. The base script incorporates the main fixes; refinements retain the tested camera and motion adjustments. All Blender scripts should run with `--factory-startup --python-exit-code 1`. Asset material textures are packed in the delivered scene.
