import bpy, math, json, os, statistics
from mathutils import Vector
ROOT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'moana-meshy.glb'))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.name = 'Moana'
for v in mesh.data.vertices:
    x,y,z=v.co
    v.co=(y,-x,z)
# Work at a convenient ten-unit asset length; this is not a canonical size.
for v in mesh.data.vertices: v.co *= 10
coords = [v.co.copy() for v in mesh.data.vertices]
def center(x):
    nearby = list({tuple(v) for v in coords if abs(v.x-x)<.14})
    if not nearby: nearby = [tuple(min(coords,key=lambda v:abs(v.x-x)))]
    zs=sorted(v[2] for v in nearby)
    # Exclude dorsal spine tips from the trunk center estimate.
    return Vector((x,0,(zs[int(len(zs)*.1)]+zs[int(len(zs)*.65)])/2))
xs=[-4.75,-4.30]+[-4.30+(9.25*i/60) for i in range(1,61)]
points=[center(x) for x in xs]
arm=bpy.data.armatures.new('Moana_Skeleton')
rig=bpy.data.objects.new('Moana_Rig',arm)
bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones.new('root'); root.head=(-4.75,0,-1.2); root.tail=(-4.75,0,-.6); root.use_deform=False
names=[]
for i in range(len(points)-1):
    name='head' if i==0 else f'spine_{i:02d}'
    b=arm.edit_bones.new(name); b.head=points[i]; b.tail=points[i+1]
    b.parent=root if i==0 else arm.edit_bones[names[-1]]
    b.use_connect=i>0
    names.append(name)
bpy.ops.object.mode_set(mode='OBJECT')
centers=[(points[i].x+points[i+1].x)/2 for i in range(len(names))]
groups=[mesh.vertex_groups.new(name=n) for n in names]
for v in mesh.data.vertices:
    x=v.co.x
    if x<=centers[0]: weights=[(0,1.)]
    elif x>=centers[-1]: weights=[(len(names)-1,1.)]
    else:
        j=next(i for i in range(len(centers)-1) if centers[i]<=x<=centers[i+1])
        t=(x-centers[j])/(centers[j+1]-centers[j])
        weights=[(j,1-t),(j+1,t)]
    for i,w in weights:
        if w>0: groups[i].add([v.index],w,'REPLACE')
mod=mesh.modifiers.new('Moana skin','ARMATURE'); mod.object=rig
mesh.parent=rig
rig.show_in_front=True; arm.display_type='BBONE'
scene=bpy.context.scene; scene.render.fps=30
scene.frame_start=1; scene.frame_end=121
rig.animation_data_create()
for clip,amp,cycles in [('Swim',.025,1),('Idle',.008,1)]:
    action=bpy.data.actions.new(clip); rig.animation_data.action=action
    for frame in range(1,122):
        phase=2*math.pi*(frame-1)/120*cycles
        for i,name in enumerate(names):
            p=rig.pose.bones[name]; p.rotation_mode='XYZ'
            envelope=(i/(len(names)-1))**.6
            p.rotation_euler=(amp*.22*envelope*math.sin(phase-i*.22),0,amp*envelope*math.sin(phase-i*.22))
            p.keyframe_insert('rotation_euler',frame=frame,group=name)
    track=rig.animation_data.nla_tracks.new(); track.name=clip
    track.strips.new(clip,1,action)
    track.mute=True
rig.animation_data.action=bpy.data.actions['Swim']
scene.frame_set(1)
# Numeric skinning checks across the full swim cycle.
rest_edges=[(mesh.data.vertices[e.vertices[0]].co-mesh.data.vertices[e.vertices[1]].co).length for e in mesh.data.edges]
ratios=[]; finite=True
for frame in range(1,122,5):
    scene.frame_set(frame)
    ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh()
    finite=finite and all(math.isfinite(c) for v in me.vertices for c in v.co)
    for e,rest in zip(mesh.data.edges,rest_edges):
        if rest>1e-5:
            a,b=e.vertices; ratios.append((me.vertices[a].co-me.vertices[b].co).length/rest)
    ev.to_mesh_clear()
ratios.sort()
mesh.data.calc_loop_triangles()
report={'triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'deform_bones':len(names),'max_vertex_influences':max(len(v.groups) for v in mesh.data.vertices),'unweighted_vertices':sum(not v.groups for v in mesh.data.vertices),'finite_swim_vertices':finite,'swim_edge_ratio_p01':ratios[int(len(ratios)*.01)],'swim_edge_ratio_p99':ratios[int(len(ratios)*.99)],'texture_sizes':{im.name:list(im.size) for im in bpy.data.images if im.size[0]},'asset_length_units':10,'canonical_physical_scale':False,'clips':['Swim','Idle'],'jaw_rig':False}
with open(os.path.join(ROOT,'rig-audit.json'),'w') as f: json.dump(report,f,indent=2)
print(json.dumps(report,indent=2))
scene.frame_set(1)
# Export only the asset, with both independent animation tracks.
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks: track.mute=False
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'moana-animated.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
for track in rig.animation_data.nla_tracks: track.mute=True
rig.animation_data.action=bpy.data.actions['Swim']
# Studio presentation, separate from exported asset.
world=bpy.data.worlds.new('Studio'); scene.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.10,.13,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
def aim(ob,pt): ob.rotation_euler=(Vector(pt)-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-13,5))
camera=bpy.context.object; aim(camera,(0,0,0)); camera.data.type='ORTHO'; camera.data.ortho_scale=11.5; scene.camera=camera
for loc,power,size in [((-3,-5,7),1600,7),((4,3,5),1800,6),((0,-4,1),450,5)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,0))
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1400; scene.render.resolution_y=600; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for frame in [1,31,61,91]:
    scene.frame_set(frame); scene.render.filepath=os.path.join(ROOT,f'swim-{frame:03d}.png'); bpy.ops.render.render(write_still=True)
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'moana-rig.blend'))
