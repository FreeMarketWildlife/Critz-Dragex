# Dragex — rigged dragon with revised tail

October 12, 2026: Phil approved the general concept, replaced its tufted tail with a smooth, tapering, small-spined tail from his new reference, and authorized Meshy. `references/dragex-concept-v1.png` preserves the original; `references/dragex-tail-v2.png` is the built-in imagegen edit used for modeling. Meshy generation and local Blender rigging are complete.

Confirmed direction: Dragex is a land dragon with wings and Moana's head shape, and their heads should be the same size. The general red/gold, four-legged and two-winged concept is approved visual direction; the initial tufted tail is superseded. Animation and rig choices do not establish new history or powers.

Prompt: translate the red dragon on the left of Phil's supplied illustration into a realistic studio 3D creature concept, using approved Moana's exact angular head anatomy, long wedge muzzle, strong jaws, pronounced brow, teeth and swept-back crown/cheek spines. Crimson armored scales, golden segmented underside, yellow eyes. Propose four strong separate legs plus two back-mounted wings with articulated fingers and membranes. Full body, both wingtips, feet and tail visible; relaxed open wings and clear separation for future modeling and rigging; three-quarter view on neutral gray, no fire effects or scenery. Image is for author approval before 3D modeling.

Tail edit prompt: change only the tail to a continuously tapering red reptilian tail with a slim whip-like point and small separated dorsal spines, matching Phil's supplied screenshot. Remove the oversized tuft/blade clusters, keep a gentle open S curve for modeling, and preserve the approved head, body, four legs, both wings, materials and studio style. Expand framing to keep the full tail visible.

## Deliverables and playback

- **`dragex-animated.glb`**: portable textured and skinned asset with **Idle**, **Wing_Flap**, **Tail_Curl** and **Ground_Step** clips. Four-second seamless test loops at 30 fps.
- **`dragex-rig.blend`**: editable working-scale rig with wing flap selected, frame 31, frames 1–121. Press Space over the viewport/timeline to play. To test another clip, select its action in the Action Editor. Stored NLA tracks are muted to avoid stacking with the selected action.
- **`dragex-animation-test.blend`**: the same rig scaled to Moana's head-span reference. Scene units are kilometres. Camera and lights are scaled with the asset.
- **`dragex-meshy.glb`**: original Meshy result before local simplification, preserved.
- **`dragex-wing-flap.gif`**: rendered flap preview, not an interactive 3D viewer.
- **`tail-curl-side.png`**: side render exposing the complete revised tail.
- `rig-audit.json` and `export-audit.json`: geometry, skin weights, deformation and GLB round-trip checks.

## Budget and rig

Meshy returned **16,153 triangles**, slightly above its 15,000 target. Local Blender decimation reduced this to **14,900 triangles**. The delivered asset uses one material, three embedded 2K images, **62 deform bones** plus a root, and at most three normalized bone influences per vertex; no vertex is unweighted. Wing shoulders/forearms and five two-bone membrane finger rays per side, all four leg chains, neck/head, body and a twenty-bone tail chain are independently poseable. No paid humanoid auto-rig was used.

All four exported clips were re-imported into a clean Blender scene; they deform the mesh, contain finite positions and match their loop endpoints. In the sampled flap test, the middle 98% of edges retained approximately 98.8–101.4% of their rest lengths. Head/wing weighting was corrected after the first local inspection; the delivered export uses the corrected weights and actual up/down flap axes. The curl and ground-step clips are deformation demonstrations, not a foot-locked production walk or flight simulation. Extreme folding and custom poses need further review. **Jaw/facial animation and individual toe rigs are not implemented.** Generated anatomy and topology are not a guarantee of production quality or destination-engine frame rate.

## Matching Moana's head scale

The Blender scale test uses the same **14.064 km head-span interpretation** as Moana's water scene. Dragex's selected head landmarks span **0.1421267 working units**; scale factor **98.9539613** converts that span to 14.064 km. Moana's selected head region spans 0.7 of her working units at scale 20.0914286, giving the same span. Landmark placement is a technical approximation, not an independently verified skull measurement. Matching this span does not make the two AI-generated head meshes identical in every dimension. The compact GLB retains working units; apply the documented scale deliberately when comparing assets in an engine.

## Task trail and charges

Meshy CLI 0.4.0, **image-to-3d**, Smart Topology, target 15,000 triangles, 2K PBR textures, GLB. Task **`01a132be-3acf-77f1-9efc-68d10bf884a9`**, project **`20261012_175223_dragex_01a132be/`**. Reported actual charge: **15 Meshy credits**. One generation was submitted; simplification, skeleton, animation, rendering and verification were local Blender work. No additional paid stages or reruns were used.

Scripts: `inspect_dragon.py`, `build_dragex.py`, `validate_export.py`, with Blender 5.2 and `--factory-startup --python-exit-code 1`. They intentionally rebuild their generated outputs, preserving the source GLB. Reuse this task/model for future work rather than generating again.
