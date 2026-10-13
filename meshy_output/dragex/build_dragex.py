import bpy, math, os, json
from mathutils import Vector, Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dragex-meshy.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh;mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.name='Dragex'
mesh.data.calc_loop_triangles(); original_count=len(mesh.data.loop_triangles)
dec=mesh.modifiers.new('Restrained triangle budget','DECIMATE');dec.ratio=14900/original_count
bpy.ops.object.modifier_apply(modifier=dec.name)
mesh.data.calc_loop_triangles();assert len(mesh.data.loop_triangles)<=15000
arm=bpy.data.armatures.new('Dragex_Skeleton');rig=bpy.data.objects.new('Dragex_Rig',arm);bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
segments={};categories={}
def bone(name,a,b,parent=None,category='body',deform=True):
    e=arm.edit_bones.new(name);e.head=a;e.tail=b;e.use_deform=deform
    if parent:e.parent=arm.edit_bones[parent]
    if deform:segments[name]=(Vector(a),Vector(b));categories.setdefault(category,[]).append(name)
    return name
bone('root',(0,0,-.22),(0,0,-.12),deform=False)
bone('pelvis',(0,.025,-.09),(0,-.10,-.06),'root')
bone('spine',(0,-.10,-.06),(0,-.23,-.025),'pelvis')
bone('chest',(0,-.23,-.025),(0,-.32,.00),'spine')
bone('neck_01',(0,-.32,0),(0,-.38,.065),'chest','neck')
bone('neck_02',(0,-.38,.065),(0,-.40,.14),'neck_01','neck')
bone('head',(0,-.40,.14),(-.12,-.47,.11),'neck_02','head')
for side,sign in [('L',1),('R',-1)]:
    s=sign
    for tag,y,x in [('front',-.35,.085),('rear',.0,.075)]:
        parent='chest' if tag=='front' else 'pelvis'
        upper=f'{tag}_upper.{side}';lower=f'{tag}_lower.{side}';foot=f'{tag}_foot.{side}'
        a=(s*x,y,-.055);b=(s*.10,y+.012,-.125);c=(s*.102,y-.025,-.19);d=(s*.105,y-.078,-.209)
        bone(upper,a,b,parent,f'leg_{tag}_{side}');bone(lower,b,c,upper,f'leg_{tag}_{side}');bone(foot,c,d,lower,f'leg_{tag}_{side}')
    upper=f'wing_upper.{side}';fore=f'wing_forearm.{side}'
    a=(s*.045,-.29,.015);b=(s*.115,-.277,.045);c=(s*.20,-.255,.125)
    bone(upper,a,b,'chest',f'wing_{side}');bone(fore,b,c,upper,f'wing_{side}')
    # Membrane rays share the wrist and can be posed individually.
    for i,end in enumerate([(s*.485,-.215,.195),(s*.48,-.222,.095),(s*.36,-.245,.005),(s*.25,-.267,-.055),(s*.135,-.29,-.085)]):
        mid=Vector(c).lerp(Vector(end),.52)
        n=f'wing_finger_{i+1}_01.{side}';n2=f'wing_finger_{i+1}_02.{side}'
        bone(n,c,mid,fore,f'wing_{side}');bone(n2,mid,end,n,f'wing_{side}')
tail_anchors=[(0,.025,-.09),(0,.10,-.115),(0,.20,-.10),(0,.30,-.068),(0,.40,-.063),(0,.47,-.103),(0,.494,-.145),(0,.47,-.17),(0,.40,-.163),(0,.34,-.163),(0,.29,-.175)]
tailpoints=[]
for a,b in zip(tail_anchors,tail_anchors[1:]):
    tailpoints += [Vector(a),Vector(a).lerp(Vector(b),.5)]
tailpoints.append(Vector(tail_anchors[-1]))
for i,(a,b) in enumerate(zip(tailpoints,tailpoints[1:])):
    bone(f'tail_{i+1:02d}',a,b,'pelvis' if i==0 else f'tail_{i:02d}','tail')
bpy.ops.object.mode_set(mode='OBJECT')
def segment_distance(p,a,b):
    t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));return (p-(a+(b-a)*t)).length
groups={n:mesh.vertex_groups.new(name=n) for n in segments}
for v in mesh.data.vertices:
    p=v.co;x,y,z=p;side='L' if x>=0 else 'R';ax=abs(x)
    if (y<-.36 and z>.06) or (z>.12 and ax<.13 and y<-.32):
        candidates=categories['head']
    elif ax>.095 and z>-.12 and -.34<y<-.18:
        candidates=categories[f'wing_{side}']
    elif y>.07 and ax<.065:
        candidates=categories['tail']
    elif z<-.105 and ax>.045:
        tag='front' if y<-.18 else 'rear';candidates=categories[f'leg_{tag}_{side}']
    elif y<-.36 and z>.095:
        candidates=categories['head']
    elif y<-.32 and z>.005:
        candidates=categories['neck']+categories['head']
    elif y>.025 and ax<.055:
        candidates=['pelvis']+categories['tail'][:3]
    else:
        candidates=categories['body']+categories['neck'][:1]
        if z<-.04 and ax>.06:
            tag='front' if y<-.18 else 'rear';candidates+=categories[f'leg_{tag}_{side}'][:1]
    nearest=sorted([(segment_distance(p,*segments[n]),n) for n in candidates])[:3]
    # Rigid head and very near bone centers keep spines and claw tips stable.
    if candidates==categories['head']:nearest=nearest[:1]
    raw=[1/max(d,.005)**3 for d,n in nearest];total=sum(raw)
    for (_,n),w in zip(nearest,raw):groups[n].add([v.index],w/total,'REPLACE')
mod=mesh.modifiers.new('Creature skin','ARMATURE');mod.object=rig;mesh.parent=rig
rig.show_in_front=True;arm.display_type='OCTAHEDRAL'
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=121
rig.animation_data_create()
clips=['Idle','Wing_Flap','Tail_Curl','Ground_Step']
for clip in clips:
    action=bpy.data.actions.new(clip);rig.animation_data.action=action
    for frame in range(1,122):
        t=(frame-1)/120;phase=2*math.pi*t
        for n in segments:
            p=rig.pose.bones[n];p.rotation_mode='XYZ';p.rotation_euler=(0,0,0)
            if n=='neck_01':p.rotation_euler.x=.035*math.sin(phase)
            if n=='head':p.rotation_euler.z=.025*math.sin(phase)
            if n.startswith('tail_'):
                i=int(n[-2:]);amp=.065 if clip=='Tail_Curl' else .018
                p.rotation_euler.z=amp*math.sin(phase-i*.22)*min(1,i/8)
            if n.startswith('wing_upper'):
                s=1 if n.endswith('.L') else -1
                p.rotation_euler.y=s*(.32 if clip=='Wing_Flap' else .025)*math.sin(phase)
            if n.startswith('wing_forearm'):
                s=1 if n.endswith('.L') else -1
                p.rotation_euler.y=s*(.12 if clip=='Wing_Flap' else .015)*math.sin(phase-.45)
            if n.startswith('wing_finger') and clip=='Wing_Flap':
                s=1 if n.endswith('.L') else -1;p.rotation_euler.y=s*.025*math.sin(phase-.8)
            if ('_upper.' in n or '_lower.' in n) and not n.startswith('wing') and clip=='Ground_Step':
                offset=0 if (n.startswith('front')==n.endswith('.L')) else math.pi
                p.rotation_euler.x=(.12 if '_upper.' in n else -.08)*math.sin(phase+offset)
            q=p.rotation_euler.to_quaternion()
            if n.startswith('wing_'):
                s=1 if n.endswith('.L') else -1
                axis=rig.data.bones[n].matrix_local.to_quaternion().inverted()@Vector((0,1,0))
                if n.startswith('wing_upper'):angle=-s*(.32 if clip=='Wing_Flap' else .025)*math.sin(phase)
                elif n.startswith('wing_forearm'):angle=-s*(.12 if clip=='Wing_Flap' else .015)*math.sin(phase-.45)
                else:angle=-s*.025*math.sin(phase-.8) if clip=='Wing_Flap' else 0
                q=Quaternion(axis,angle)
            p.rotation_mode='QUATERNION';p.rotation_quaternion=q
            p.keyframe_insert('rotation_quaternion',frame=frame,group=n)
    track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
rig.animation_data.action=bpy.data.actions['Wing_Flap']
rest_edges=[(mesh.data.vertices[e.vertices[0]].co-mesh.data.vertices[e.vertices[1]].co).length for e in mesh.data.edges]
audit={}
for clip in clips:
    rig.animation_data.action=bpy.data.actions[clip];ratios=[]
    for frame in range(1,122,10):
        scene.frame_set(frame);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
        assert all(math.isfinite(c) for v in me.vertices for c in v.co)
        for edge,length in zip(mesh.data.edges,rest_edges):
            if length>1e-6:
                a,b=edge.vertices;ratios.append((me.vertices[a].co-me.vertices[b].co).length/length)
        ev.to_mesh_clear()
    ratios.sort();audit[clip]={'edge_ratio_p01':ratios[int(len(ratios)*.01)],'edge_ratio_p99':ratios[int(len(ratios)*.99)]}
head_span=(segments['head'][1]-segments['head'][0]).length
scale_km=14.064/head_span
mesh.data.calc_loop_triangles()
report={'original_triangles':original_count,'delivered_triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'deform_bones':len(segments),'max_influences':max(len(v.groups) for v in mesh.data.vertices),'unweighted_vertices':sum(not v.groups for v in mesh.data.vertices),'clips':audit,'head_span_asset_units':head_span,'head_span_test_km':14.064,'asset_to_km_scale':scale_km,'scale_is_anatomical_interpretation':True,'jaw_rig':False}
with open(os.path.join(ROOT,'rig-audit.json'),'w') as f:json.dump(report,f,indent=2)
# Engine asset remains in compact working units; scale matching is in the Blender test.
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'dragex-animated.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
for track in rig.animation_data.nla_tracks:track.mute=True
rig.animation_data.action=bpy.data.actions['Wing_Flap']
world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.07,.09,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(ob,p):ob.rotation_euler=(Vector(p)-ob.location).to_track_quat('-Z','Y').to_euler()
for loc in [(-1,-2,3),(2,2,3),(0,-3,1)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=200;o.data.size=3;aim(o,(0,0,0))
bpy.ops.object.camera_add(location=(1.7,-2.8,1.0));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.5;cam.data.clip_start=.001;scene.camera=cam;aim(cam,(0,0,0))
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.frame_set(31)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'dragex-rig.blend'))
for clip in clips:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(31);scene.render.filepath=os.path.join(ROOT,clip+'.png');bpy.ops.render.render(write_still=True)
# Same head-span scale reference as Moana's water test, in a separate Blender test scene.
rig.animation_data.action=bpy.data.actions['Wing_Flap'];rig.scale=(scale_km,)*3
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1000
for ob in scene.objects:
    if ob.type=='LIGHT':ob.location*=scale_km;ob.data.energy*=scale_km**2;ob.data.size*=scale_km
cam.location*=scale_km;cam.data.ortho_scale*=scale_km;cam.data.clip_end=10000;aim(cam,(0,0,0))
scene['head_scale_note']='Dragex and Moana use the same 14.064 km head-span interpretation. Anatomical landmark placements are asset choices.'
scene.timeline_markers.new('Wings raised',frame=31);scene.timeline_markers.new('Wings lowered',frame=91)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.clip_end=10000;area.spaces.active.shading.type='MATERIAL';area.spaces.active.overlay.show_overlays=False
scene.frame_set(31);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'dragex-animation-test.blend'))
