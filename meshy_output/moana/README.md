# Moana — animated sea-serpent dragon

## Longer proportion exploration — October 12, 2026

Phil requested a much longer Moana and approved `references/moana-long-rest-pose-v2.png`, then authorized rebuilding and a Blender water-sphere test. The new assets live in **`../moana-long/`**. This folder preserves the earlier shorter model. Prompt: approximately double serpentine body length relative to unchanged head size and trunk diameter; add middle trunk and repeated original-size scales/spines; preserve angular dragon head, teal-blue scales, ivory belly, yellow-green eyes and wingless/limbless anatomy; fully visible extended pose with shallow undulations and no crossings. The visual direction is approved, but no numerical total length or doubling ratio is confirmed. See the new folder's README for the latest asset and test.

Author approved the dragon-headed concept on October 12, 2026. Rest pose, rig settings, asset scale and movement are technical design choices, not new canon. Earlier soft-headed finned concepts were rejected.

## Deliverables

- `moana-animated.glb`: textured, skinned asset with separate **Swim** and **Idle** clips. Four-second loops, 30 fps, in-place movement. Move the root/object along a path in your engine for travel.
- `moana-rig.blend`: editable Blender skeleton, materials and presentation scene. The active action is Swim; other NLA tracks are muted for editing. Edit the head and connected spine bones in Pose Mode. Clear/mute the action before making a static pose.
- `moana-meshy.glb`: preserved unrigged Meshy result.
- `swim-001.png`, etc.: renders of the actual rigged model.
- `moana-swim.gif`: four-second looping rendered swimming preview; not an interactive 3D viewer.
- `rig-audit.json` and `export-audit.json`: geometry, skinning and GLB round-trip animation checks.
- `references/`: approved coiled concept and extended modeling reference, generated with built-in imagegen.

## Performance and rig choices

Actual mesh: **13,987 triangles**, 16,910 mesh vertices including UV/normal splits, one material, three embedded 2048×2048 texture images. Exported rendering vertices may differ because glTF splits attributes. One non-deforming root, one head and forty connected spine deform bones; at most two normalized influences per vertex. No subdivision modifier, physics, particle hair or geometry for each individual scale. Scale relief largely comes from textures.

The extended pose prevents coils from being fused into a single solid object during image reconstruction. A chain follows the body center; longitudinal blended weights maintain separation along the serpent and avoid assigning a nearby folded segment's bone. This is an FK rig with baked bone animation, not a humanoid auto-rig or an implemented spline-IK control system. Blender spline IK could later add curve controls without replacing the exported skeleton.

The round-trip test imports the delivered GLB in a clean Blender scene and checks that both independent clips move its vertices, contain finite positions and close their loops. Sampled swimming deformation edge ratios are reported in the audit. This verifies these modest loops, not arbitrary tight knots or extreme bends. AI topology is not hand-retopologized production edge flow; close-up facial work or extreme poses may require local retopology and weight refinement. Jaw and facial animation are **not implemented**; the mouth remains in its generated open pose. No collision mesh or engine-specific integration has been requested.

Asset length is **10 arbitrary Blender units**, not an author-confirmed physical size. The GLB is approximately 8 MB on disk. Triangle count alone cannot guarantee frame rate; texture memory, lighting, shadows, visible instances, hardware and engine settings also matter. Profile in the destination software before deciding on further LODs or texture compression.

## Reproducibility and costs

Meshy CLI 0.4.0, `image-to-3d`, Smart Topology, target 15,000 triangles, textured PBR, 2K, GLB. One submission: `01a13281-cc39-72bd-9387-2fd0ee01e827`. Actual reported Meshy charge: **15 credits**. Project trail: `20261012_164601_moana_01a13281/`. Blender rig/export work is local; no paid Meshy rigging/animation requests or reruns were made. Reuse the existing task for later processing rather than generating again.

The local scripts `inspect_model.py`, `build_rig.py` and `validate_export.py` reproduce inspection, rig and export verification with Blender 5.2. Run Blender with `--factory-startup --python-exit-code 1` to avoid unrelated user add-ons and detect script failures. The scripts generate their own deliverables; rerunning intentionally replaces those generated files, while the original Meshy GLB remains preserved.

Imagegen reference prompt: preserve the approved angular dragon head, yellow-green eyes, swept-back blade spines, teal-blue scales and ivory underside; uncurl the body into a fully visible near-horizontal rest pose with no coils, crossings, wings or limbs, on a neutral studio background. The new rest pose is an asset preparation proposal.

## Research checked October 12, 2026

- [Meshy Rigging API](https://docs.meshy.ai/en/api/rigging): programmatic rigging supports standard humanoids; unsuitable for non-humanoids.
- [Meshy web auto-rigging](https://help.meshy.ai/en/articles/16231707-how-to-create-3d-animation-with-auto-rigging): humanoid, quadruped and Smart Rig beta. Does not establish reliable snake-specific support.
- [Meshy Image-to-3D](https://docs.meshy.ai/en/api/image-to-3d): Smart Topology can target 100–15,000 faces; actual count can differ.
- [Meshy pricing](https://docs.meshy.ai/en/api/pricing): estimated T2 image generation with 2K textures costs 15 credits, matching the finished task.
- [Blender spline IK](https://docs.staging.blender.org/manual/en/latest/animation/armatures/posing/bone_constraints/inverse_kinematics/spline_ik.html): a connected bone chain can follow a curve; possible future artist controls, not used in this delivery.
