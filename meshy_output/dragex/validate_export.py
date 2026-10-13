import bpy, os, json, math
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dragex-animated.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
tracks=list(rig.animation_data.nla_tracks)
print('Imported clips:',[t.name for t in tracks])
checks={}
rig.animation_data.action=None
for track in tracks:
    for t in tracks: t.mute=t!=track
    positions=[]
    for frame in [1,31,61,91,121]:
        bpy.context.scene.frame_set(frame)
        ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh()
        positions.append([v.co.copy() for v in me.vertices]); ev.to_mesh_clear()
    movement=max((a-b).length for a,b in zip(positions[0],positions[1]))
    seam=max((a-b).length for a,b in zip(positions[0],positions[-1]))
    checks[track.name]={'max_sampled_movement':movement,'loop_seam_distance':seam,'finite':all(math.isfinite(c) for ps in positions for p in ps for c in p)}
    assert movement>.001, 'Animation did not deform imported mesh'
    assert seam<.0001, 'Loop is not seamless'
assert len(checks)==4
with open(os.path.join(ROOT,'export-audit.json'),'w') as f: json.dump(checks,f,indent=2)
print(json.dumps(checks,indent=2))
# Render preview frames from source rig after round-trip validation.
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'dragex-rig.blend'))
scene=bpy.context.scene; scene.cycles.samples=12
scene.render.resolution_x=900;scene.render.resolution_y=650
os.makedirs(os.path.join(ROOT,'preview-frames'),exist_ok=True)
for frame in range(1,121,4):
    scene.frame_set(frame)
    scene.render.filepath=os.path.join(ROOT,'preview-frames',f'{frame:03d}.png')
    bpy.ops.render.render(write_still=True)
# A separate side view exposes the full tapered tail during its curl test.
rig=bpy.data.objects['Dragex_Rig'];rig.animation_data.action=bpy.data.actions['Tail_Curl']
from mathutils import Vector
scene.camera.location=(3,0,1)
scene.camera.rotation_euler=(Vector((0,0,0))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.frame_set(31);scene.render.filepath=os.path.join(ROOT,'tail-curl-side.png');bpy.ops.render.render(write_still=True)
