# Moana — approved longer model and Blender water test

Phil approved the long reference on October 12, 2026 and authorized a new Meshy model, Blender animation tests and a large water sphere. Earlier shorter assets are preserved in `../moana/`.

## Open and play

Open **`moana-water-test.blend`** in Blender. It opens at frame 91 with the **Breach_And_Dive** action active. Press **Space** with the pointer over the viewport or timeline to play the 12-second test. Timeline markers identify submerged start, head breach, body following and head dive. Camera **Breach_Closeup** tracks the body; **Whole_Sphere_Overview** shows its scale against the whole sphere.

For the alternate 8-second underwater test, choose **Submerged_Swim** in the Action Editor and set the end frame to 241. Both demonstration NLA tracks are stored muted so they do not stack on the active action. Water is a transparent diagnostic sphere with a dark interior; this is not a fluid/splash simulation. The gold/brown island marker is only a size proxy, not a skull sculpture or a confirmed island outline.

## Files

- `moana-meshy.glb`: original long Meshy mesh, preserved.
- `moana-animated.glb`: portable asset with seamless **Swim** and **Idle** loops, in-place. Working length is 10 arbitrary units; set your engine scale intentionally.
- `moana-rig.blend`: editable standalone rig, separate from the sphere demonstration.
- `moana-water-test.blend`: scaled sphere scene with **Submerged_Swim** and **Breach_And_Dive** actions. Travel tests are not seamless loops; they move across the sphere and reset at playback restart.
- `reference.png`: approved extended imagegen reference.
- `water-*.png`, `sphere-overview.png`: renders of the Blender test.
- `moana-breach-preview.gif`: 12-second rendered preview of the water test; the reset is intentional, because this traveling test is not a seamless loop.
- Audit JSONs and Python scripts preserve geometry, deformation, exported clip verification and reproducibility.

## Scale and canon

Phil confirms that the island in Lake Moana is **Moana’s Tear**, formed over Moana’s skull, partly exposed, and that her head is island-sized. Her body slowly decays there; enormous ribs are visible around Death’s Valley after Age 2, including Ages 3 and 4. These decisions are recorded in current canon, geography, book notes and timeline. The island's relationship to the portable Tear artifact remains unspecified.

The sphere uses Libriam’s derived **364.376984409 km radius**. Scene units are **kilometres**. For this test, the assumed anatomical head region is the first 7% of the reference model's length; matching that region to the existing **14.064 km island edge span** yields a **200.914 km total model length**. This is a scale interpretation for testing, not a newly confirmed skull measurement, total body length, gravity, water depth or historical event. The island marker's width and thickness are illustrative.

## Performance and verification

Moana has **12,926 triangles**, one material, three **2K** texture images, **61 deform bones** plus a non-deforming root, and at most two normalized influences per vertex. No subdivision, particle systems or fluid simulation. Generated vertex count is 17,099, including UV/normal splits. The model remains below the requested 15,000-triangle target; the inexpensive sphere/island geometry is separate and need not be included in your game asset.

Standalone Swim and Idle clips were exported to GLB and imported into a clean Blender scene: both move the mesh, all checked positions are finite and their endpoints match. The sphere tests check actual evaluated mesh vertices: the submerged action stays wholly below the surface; the breach action starts and ends submerged and passes through the surface between. The head-to-tail wave and spherical curvature use the existing skeleton, not a Meshy humanoid rig.

The long rig is an FK chain with blended longitudinal weights. The sphere demonstration bakes positions and rotations along a spherical path. It is not an implemented spline-IK artist-control rig. Arbitrary extreme poses still need review. In the sphere test's sampled mesh edges, the middle 98% retain approximately **84–117%** of their original lengths; these broader bends therefore produce more deformation than the gentle standalone loops. The numerical report does not establish facial-production quality or absence of all self-intersections. Jaw/facial animation remains unimplemented. No measured destination-engine frame rate is available.

## Task and charge

Meshy CLI 0.4.0, resource **image-to-3d**, Smart Topology, target 15,000 triangles, 2K PBR textures. Task **`01a13295-eb98-7051-8e3b-3171ac115b07`**. Actual charge: **15 Meshy credits**. Project trail: `20261012_170845_moana-long_01a13295/`. Rigging, scene creation and animation are local Blender work; no paid auto-rigging or extra generations were submitted.

Run scripts with Blender 5.2, `--factory-startup --python-exit-code 1`, from this folder or by absolute script path. Scripts intentionally rebuild their generated outputs while preserving `moana-meshy.glb`. Do not run the earlier folder's shorter-model scripts against these assets: Meshy returned the long model along Y, which this build explicitly rotates into X before rigging.
