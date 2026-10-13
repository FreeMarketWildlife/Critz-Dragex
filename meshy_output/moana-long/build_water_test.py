import bpy, math, json, os
from mathutils import Vector, Matrix
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'moana-rig.blend'))
scene=bpy.context.scene
rig=bpy.data.objects['Moana_Rig']; mesh=bpy.data.objects['Moana']
R=364.376984409
HEAD=14.064
SCALE=HEAD/.70
rig.scale=(SCALE,)*3
scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1000
rig.animation_data.action=None
for track in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(track)
names=['head']+[f'spine_{i:02d}' for i in range(1,61)]
rest=[rig.data.bones[n].head_local.copy() for n in names]+[rig.data.bones[names[-1]].tail_local.copy()]
distance=[0.]
for a,b in zip(rest,rest[1:]): distance.append(distance[-1]+(b-a).length)
def path(t,s,breach):
    theta=-.38+.65*t+s/(R/SCALE)
    wave=2*math.pi*t-s*.32
    depth=(-.50+1.30*math.sin(wave)) if breach else (-1.20+.10*math.sin(wave))
    radius=R/SCALE+depth
    return Vector((radius*math.sin(theta),.08*math.sin(wave),radius*math.cos(theta)))
def apply_pose(t,breach):
    targets=[path(t,s,breach) for s in distance]
    for i,name in enumerate(names):
        bone=rig.pose.bones[name]
        direction=targets[i+1]-targets[i]
        matrix=Matrix.Translation(targets[i])@direction.to_track_quat('Y','Z').to_matrix().to_4x4()
        # Preserve segment rest length: small path approximations are handled by joints.
        bone.matrix=matrix
        bpy.context.view_layer.update()
    return targets
for clip,breach,frames in [('Submerged_Swim',False,241),('Breach_And_Dive',True,361)]:
    action=bpy.data.actions.new(clip); rig.animation_data.action=action
    for frame in range(1,frames+1):
        t=(frame-1)/(frames-1)
        apply_pose(t,breach)
        for name in names:
            bone=rig.pose.bones[name]; bone.rotation_mode='QUATERNION'
            bone.keyframe_insert('location',frame=frame,group=name)
            bone.keyframe_insert('rotation_quaternion',frame=frame,group=name)
            bone.keyframe_insert('scale',frame=frame,group=name)
    track=rig.animation_data.nla_tracks.new(); track.name=clip
    track.strips.new(clip,1,action); track.mute=True
rig.animation_data.action=bpy.data.actions['Breach_And_Dive']
scene.frame_start=1;scene.frame_end=361;scene.render.fps=30
def material(name,color,rough=.4):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    return m
water=material('Water — transparent diagnostic surface',(.008,.10,.18),.55)
nt=water.node_tree;p=nt.nodes.get('Principled BSDF');out=nt.nodes.get('Material Output')
p.inputs['Specular IOR Level'].default_value=.15
transparent=nt.nodes.new('ShaderNodeBsdfTransparent');mix=nt.nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.23
nt.links.new(transparent.outputs[0],mix.inputs[1]);nt.links.new(p.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs[0])
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=48,radius=R)
sphere=bpy.context.object;sphere.name='Libriam_Water_Surface';sphere.data.materials.append(water)
for poly in sphere.data.polygons: poly.use_smooth=True
sphere['radius_km']=R;sphere['purpose']='Diagnostic water sphere; not a surveyed lake or fluid simulation'
# Inner ocean gives the sphere a dark volume while the surface lets us inspect submerged anatomy.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=R-65)
inner=bpy.context.object;inner.name='Ocean_Interior';inner.data.materials.append(material('Deep ocean',(.005,.035,.07)))
for poly in inner.data.polygons:poly.use_smooth=True
# Simple island-size marker, not a skull model or a new geographic outline.
angle=-.18
island_center=Vector((R*math.sin(angle),-22,R*math.cos(angle)))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=island_center)
island=bpy.context.object;island.name='Moanas_Tear_Island_Size_Proxy';island.scale=(HEAD/2,1.6,.8)
island.rotation_euler[1]=angle;island.data.materials.append(material('Island size reference',(.32,.22,.09)))
island['long_span_km']=HEAD;island['width_is_proposal']=True
def aim(ob,p):ob.rotation_euler=(Vector(p)-ob.location).to_track_quat('-Z','Y').to_euler()
for ob in list(scene.objects):
    if ob.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.object.camera_add(location=(55,-350,560))
cam=bpy.context.object;cam.name='Breach_Closeup';cam.data.type='ORTHO';cam.data.ortho_scale=280;aim(cam,(55,0,345));scene.camera=cam
for frame in range(1,362,6):
    midpoint=path((frame-1)/360,distance[-1]/2,True)*SCALE
    target=Vector((midpoint.x,0,midpoint.z))
    cam.location=target+Vector((0,-220,170));aim(cam,target)
    cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
bpy.ops.object.camera_add(location=(700,-1100,900))
overview=bpy.context.object;overview.name='Whole_Sphere_Overview';overview.data.type='ORTHO';overview.data.ortho_scale=1400;aim(overview,(0,0,40));scene.camera=cam
for loc,power,size in [((-180,-250,600),4000000,250),((300,200,550),4500000,230),((100,-400,300),2000000,150)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(60,0,350))
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.07,.10,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.cycles.transparent_max_bounces=8
scene.render.resolution_x=1200;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for f,label in [(1,'Submerged start'),(91,'Head breach'),(181,'Body follows'),(271,'Head dives'),(361,'End')]:scene.timeline_markers.new(label,frame=f)
scene['scale_note']='1 Blender unit = 1 km. Head span assumed to be 14.064 km; total length follows approved image, not independently confirmed.'
scene['animation_note']='Breach-and-dive is active. Select Submerged_Swim action for the alternate test. Surface is a transparent diagnostic shell, not fluid simulation.'
# Verify actual mesh vertices, not just the control path, cross the sphere surface.
checks=[]
for frame in [1,31,61,91,121,151,181,211,241,271,301,331,361]:
    scene.frame_set(frame)
    ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh()
    depths=[(ev.matrix_world@v.co).length-R for v in me.vertices]
    assert all(math.isfinite(d) for d in depths)
    checks.append({'frame':frame,'min_radial_depth_km':min(depths),'max_radial_height_km':max(depths),'above_surface_vertices':sum(d>0 for d in depths),'total_vertices':len(depths)})
    ev.to_mesh_clear()
assert any(c['above_surface_vertices']>0 for c in checks)
assert any(c['above_surface_vertices']<c['total_vertices'] for c in checks)
with open(os.path.join(ROOT,'water-test-audit.json'),'w') as f:json.dump({'sphere_radius_km':R,'head_span_interpretation_km':HEAD,'asset_length_km':10*SCALE,'samples':checks},f,indent=2)
scene.frame_set(91)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.clip_end=10000
            area.spaces.active.shading.type='MATERIAL'
cam.data.clip_end=10000;overview.data.clip_end=10000
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'moana-water-test.blend'))
for frame in [1,91,181,271]:
    scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,f'water-{frame:03d}.png');bpy.ops.render.render(write_still=True)
scene.camera=overview;scene.frame_set(91);scene.render.filepath=os.path.join(ROOT,'sphere-overview.png');bpy.ops.render.render(write_still=True)
