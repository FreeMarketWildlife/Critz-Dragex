import bpy,os,json,math
from mathutils import Vector,Matrix,Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
G=json.load(open(os.path.join(ROOT,'geography.json')));R=G['radiusKm'];HEAD=G['ISLAND_LENGTH_KM'];FPS=30;END=1321
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=END
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1000
def append_asset(folder,names):
    path=os.path.join(ROOT,'..',folder, 'dragex-rig.blend' if folder=='dragex' else 'moana-rig.blend')
    with bpy.data.libraries.load(path,link=False) as (src,dst):dst.objects=names
    for ob in dst.objects:scene.collection.objects.link(ob)
    return dst.objects
dragon,dragonmesh=append_asset('dragex',['Dragex_Rig','Dragex'])
moana,moanamesh=append_asset('moana-long',['Moana_Rig','Moana'])
dragon.animation_data.action=None;moana.animation_data.action=None
bpy.context.view_layer.update()
for ob in [dragon,moana]:
    for tr in ob.animation_data.nla_tracks:tr.mute=True
def key_pose(rig,frame):
    for b in rig.pose.bones:
        b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
        b.keyframe_insert('location',frame=frame,group=b.name)
        b.keyframe_insert('scale',frame=frame,group=b.name)
def reset(rig):
    for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.matrix_basis=Matrix.Identity(4)
def rot_world(rig,name,axis,angle):
    b=rig.pose.bones[name];a=rig.data.bones[name].matrix_local.to_quaternion().inverted()@Vector(axis)
    b.rotation_quaternion=Quaternion(a,angle)
def flight_pose(t,fold=0,flutter=1):
    reset(dragon);phase=2*math.pi*t
    for side,s in [('L',1),('R',-1)]:
        rot_world(dragon,f'wing_upper.{side}',(0,1,0),-s*(.40*math.sin(phase)*flutter+fold))
        rot_world(dragon,f'wing_forearm.{side}',(0,1,0),-s*(.14*math.sin(phase-.5)*flutter+fold*.25))
        for i in range(1,6):
            for j in [1,2]:rot_world(dragon,f'wing_finger_{i}_{j:02d}.{side}',(0,1,0),-s*.035*math.sin(phase-.8)*flutter)
        for tag in ['front','rear']:
            rot_world(dragon,f'{tag}_upper.{side}',(1,0,0),.45)
            rot_world(dragon,f'{tag}_lower.{side}',(1,0,0),-.55)
    for i in range(1,21):rot_world(dragon,f'tail_{i:02d}',(0,0,1),.022*math.sin(phase-i*.2)*flutter)
def bone_matrix(a,b,rest_bone=None):
    direction=(b-a).normalized()
    q=direction.to_track_quat('Y','Z') if rest_bone is None else (rest_bone.tail_local-rest_bone.head_local).normalized().rotation_difference(direction)@rest_bone.matrix_local.to_quaternion()
    return Matrix.Translation(a)@q.to_matrix().to_4x4()
def walk_pose(t):
    reset(dragon)
    bpy.context.view_layer.update()
    for side,s in [('L',1),('R',-1)]:
        for tag in ['front','rear']:
            upper=f'{tag}_upper.{side}';lower=f'{tag}_lower.{side}';foot=f'{tag}_foot.{side}'
            a=dragon.data.bones[upper].head_local.copy();rest=dragon.data.bones[lower].tail_local.copy()
            p=(t+(0 if (tag=='front')==(side=='L') else .5))%1
            if p<.6:delta=-.024+.08*p;lift=0
            else:u=(p-.6)/.4;delta=.024-.048*(u*u*(3-2*u));lift=.025*math.sin(math.pi*u)
            c=rest+Vector((0,delta,lift));l1=dragon.data.bones[upper].length;l2=dragon.data.bones[lower].length
            d=c-a;length=min(d.length,l1+l2-.00001);unit=d.normalized()
            along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along))
            q=(Vector((0,1,0))-unit*unit.y).normalized();knee=a+unit*along+q*height
            c=a+unit*length
            dragon.pose.bones[upper].matrix=bone_matrix(a,knee,dragon.data.bones[upper]);bpy.context.view_layer.update()
            dragon.pose.bones[lower].matrix=bone_matrix(knee,c,dragon.data.bones[lower]);bpy.context.view_layer.update()
            toe=c+(dragon.data.bones[foot].tail_local-dragon.data.bones[foot].head_local)
            dragon.pose.bones[foot].matrix=bone_matrix(c,toe,dragon.data.bones[foot]);bpy.context.view_layer.update()
        rot_world(dragon,f'wing_upper.{side}',(0,1,0),-s*.6)
        rot_world(dragon,f'wing_forearm.{side}',(0,1,0),-s*.15)
    for i in range(1,21):rot_world(dragon,f'tail_{i:02d}',(0,0,1),.015*math.sin(2*math.pi*t-i*.22))
# Separate reusable locomotion clips, exported before world transforms.
for name,fn in [('Flight',flight_pose),('Walk',walk_pose)]:
    action=bpy.data.actions.new(name);dragon.animation_data.action=action
    for frame in range(1,122):fn((frame-1)/60);key_pose(dragon,frame)
    tr=dragon.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,1,action);tr.mute=True
dragon.animation_data.action=None
for tr in dragon.animation_data.nla_tracks:tr.mute=tr.name not in ['Flight','Walk']
bpy.ops.object.select_all(action='DESELECT');dragon.select_set(True);dragonmesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'dragex-locomotion.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
for tr in dragon.animation_data.nla_tracks:tr.mute=True
S_D=HEAD/dragon.data.bones['head'].length;S_M=HEAD/.7
dragon.scale=(S_D,)*3;moana.scale=(S_M,)*3
def coord(p,r=R):
    la=math.radians(p['lat']);lo=math.radians(p['lon']);return Vector((r*math.cos(la)*math.cos(lo),r*math.cos(la)*math.sin(lo),r*math.sin(la)))
def basis(p):
    up=coord(p,1);lo=math.radians(p['lon']);east=Vector((-math.sin(lo),math.cos(lo),0));north=up.cross(east);return east,north,up
lake=G['LAKE'];island=G['ISLAND_CENTER'];mount=G['YOKAI'];E,N,U=basis(lake);EM,NM,UM=basis(mount)
def world(lonlat,height=0):return coord(lonlat,R+height)
def set_dragon(pos,forward,up,pitch=0):
    y=-forward.normalized();z=(up-y*y.dot(up)).normalized();x=y.cross(z).normalized();q=Matrix((x,y,z)).transposed().to_quaternion()
    dragon.location=pos;dragon.rotation_mode='QUATERNION';dragon.rotation_quaternion=q@Quaternion((1,0,0),pitch)
def lerp(a,b,t):return a.lerp(b,t)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def spherical_route(a,b,t,alt):
    p=lerp(coord(a,1),coord(b,1),t).normalized();return p*(R+alt)
def material(name,color,rough=.6):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
bpy.ops.mesh.primitive_uv_sphere_add(segments=256,ring_count=128,radius=R)
planet=bpy.context.object;planet.name='Libriam — exact radius';planet['radius_km']=R
for v in planet.data.vertices:v.co=v.co.normalized()*R
for p in planet.data.polygons:p.use_smooth=True
m=material('Current globe source map',(.1,.25,.2));planet.data.materials.append(m);nodes=m.node_tree.nodes;links=m.node_tree.links
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(os.path.join(ROOT,'libriam-map.png'));tex.image.pack()
geom=nodes.new('ShaderNodeNewGeometry');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(geom.outputs['Position'],sep.inputs[0])
def mathnode(op,a,b=None):
    n=nodes.new('ShaderNodeMath');n.operation=op
    if isinstance(a,(int,float)):n.inputs[0].default_value=a
    else:links.new(a,n.inputs[0])
    if b is not None:
        if isinstance(b,(int,float)):n.inputs[1].default_value=b
        else:links.new(b,n.inputs[1])
    return n.outputs[0]
u=mathnode('ADD',mathnode('DIVIDE',mathnode('ARCTAN2',sep.outputs['Y'],sep.outputs['X']),2*math.pi),.5)
v=mathnode('ADD',mathnode('DIVIDE',mathnode('ARCSINE',mathnode('DIVIDE',sep.outputs['Z'],R)),math.pi),.5)
combine=nodes.new('ShaderNodeCombineXYZ');links.new(u,combine.inputs['X']);links.new(v,combine.inputs['Y']);links.new(combine.outputs[0],tex.inputs[0]);links.new(tex.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
# Lake and island use the exact source-exported outlines, triangulated in local tangent coordinates.
from mathutils.geometry import tessellate_polygon
def surface_polygon(feature,height,mat):
    ring=feature['geometry']['coordinates'][0][:-1];center={'lat':sum(p[1] for p in ring)/len(ring),'lon':sum(p[0] for p in ring)/len(ring)};e,n,u=basis(center)
    verts=[coord({'lon':p[0],'lat':p[1]},R+height) for p in ring];flat=[Vector((v.dot(e),v.dot(n),0)) for v in verts]
    index={tuple(v):i for i,v in enumerate(flat)};faces=[tuple(v if isinstance(v,int) else index[tuple(v)] for v in tri) for tri in tessellate_polygon([flat])]
    faces=[f if (verts[f[1]]-verts[f[0]]).cross(verts[f[2]]-verts[f[0]]).dot(verts[f[0]])>0 else tuple(reversed(f)) for f in faces]
    data=bpy.data.meshes.new(feature['properties']['name']);data.from_pydata(verts,[],faces);ob=bpy.data.objects.new(feature['properties']['name'],data);scene.collection.objects.link(ob);data.materials.append(mat);return ob
lakeob=surface_polygon(G['lake'],.45,material('Lake water',(.035,.38,.49),.25))
islandob=surface_polygon(G['island'],.8,material('Moanas Tear island',(.45,.34,.16)))
# Enlarged volcano: footprint ratio is authored, exact cone/crater details are proposals.
M_RADIUS=G['mountainSpanKm']/2;M_HEIGHT=18.;verts=[];faces=[];rings=28;segments=96
for j in range(rings):
    r=12+(M_RADIUS-12)*j/(rings-1)
    for i in range(segments):
        a=2*math.pi*i/segments;h=M_HEIGHT*(1-(r-12)/(M_RADIUS-12))**1.4
        h*=1+.05*math.sin(a*7)+.025*math.sin(a*13)
        v=(world(mount)+EM*(r*math.cos(a))+NM*(r*math.sin(a))).normalized()*(R+h);verts.append(v)
for j in range(rings-1):
    for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;c=b+segments;d=a+segments;faces.append((a,d,c,b))
data=bpy.data.meshes.new('Yokai cone');data.from_pydata(verts,[],faces);mountob=bpy.data.objects.new('Mount Yokai — 4x island span',data);scene.collection.objects.link(mountob);data.materials.append(material('Yokai volcanic rock',(.17,.13,.10),.85))
mountob['footprint_span_km']=G['mountainSpanKm'];mountob['height_proposal_km']=M_HEIGHT
# Keep the island center explicit for later skull/skeleton work.
for name,p in [('Lake Moana anchor',lake),('Moanas Tear anchor',island),('Mount Yokai anchor',mount)]:
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob);ob.location=world(p,1);ob['latitude']=p['lat'];ob['longitude']=p['lon'];ob.empty_display_size=2
# Moana's body coils around the lake with separated spiral turns; only choreography, not new anatomy.
mnames=['head']+[f'spine_{i:02d}' for i in range(1,61)]
rest=[moana.data.bones[n].head_local.copy() for n in mnames]+[moana.data.bones[mnames[-1]].tail_local.copy()]
lengths=[(b-a).length for a,b in zip(rest,rest[1:])];cum=[0.]
for length in lengths:cum.append(cum[-1]+length)
total=cum[-1]
def moana_pose(t,recoil=0):
    points=[]
    for s in cum:
        q=s/total;r=5+20*q;a=13*q+.05*math.sin(t*2*math.pi-q*5)
        points.append(Vector(((r*math.cos(a)-5)/S_M,(r*math.sin(a))/S_M,(2+1.0*math.sin(a*.7)-recoil*(1-q)*3)/S_M)))
    for i,n in enumerate(mnames):moana.pose.bones[n].rotation_mode='QUATERNION';moana.pose.bones[n].matrix=bone_matrix(points[i],points[i+1]);bpy.context.view_layer.update()
mi=basis(island);moana.location=world(island,.8);moana.rotation_mode='QUATERNION';moana.rotation_quaternion=Matrix(mi).transposed().to_quaternion()
da=bpy.data.actions.new('Attack_Flight_Walk_Burrow');dragon.animation_data.action=da
ma=bpy.data.actions.new('Moana_Lake_Reaction');moana.animation_data.action=ma
for frame in range(1,END+1):
    sec=(frame-1)/30
    if frame<=241:
        t=(frame-1)/240;pos=spherical_route(mount,lake,t,42);up=pos.normalized();forward=(world(lake)-pos);flight_pose(sec*.7);set_dragon(pos,forward,up)
    elif frame<=481:
        t=(frame-241)/240;angle=2*math.pi*t
        reach=62-14*math.sin(math.pi*t)**2
        pos=world(island,22+8*math.cos(angle))+E*(reach*math.cos(angle))+N*(reach*math.sin(angle));forward=Quaternion(pos.normalized(),.25)@(world(island,4)-pos);flight_pose(sec*.8)
        # A swoop and forward claw stroke directed at Moana, without asserting an attack power.
        for side in ['L','R']:rot_world(dragon,'front_upper.'+side,(1,0,0),-.25-.35*math.sin(math.pi*t)**2)
        set_dragon(pos,forward,pos.normalized(),.18*math.sin(math.pi*t))
    elif frame<=721:
        t=(frame-481)/240;start=world(island,30)+E*62;goal=world(mount)+EM*65.67
        alt=(start.length-R)*(1-t)+21.3*t+12*math.sin(math.pi*t)
        pos=lerp(start.normalized(),goal.normalized(),t).normalized()*(R+alt);forward=world(mount)-pos;flight_pose(sec*.7);set_dragon(pos,forward,pos.normalized())
    elif frame<=961:
        t=(frame-721)/240;pos=(world(mount)+EM*(34+31.67*(1-t))).normalized()*(R+21.3);walk_pose((frame-721)/60);set_dragon(pos,-EM,pos.normalized(),-.4*smooth(t))
    else:
        t=(frame-961)/(END-961);depth=21.3-150*smooth(t);pos=(world(mount)+EM*(34*(1-smooth(t/.25)))).normalized()*(R+depth);flight_pose(sec*.25,fold=.6+.55*smooth(t/.2),flutter=.15*(1-smooth(t/.15)))
        set_dragon(pos,-EM,UM,math.pi/2*smooth(t/.35))
    dragon.keyframe_insert('location',frame=frame);dragon.keyframe_insert('rotation_quaternion',frame=frame);key_pose(dragon,frame)
    recoil=math.sin(math.pi*(frame-241)/240)**2 if 241<=frame<=481 else 0
    moana_pose(sec*.12,recoil);key_pose(moana,frame)
    if frame%240==0:print('Baked frame',frame,flush=True)
for f,label in [(1,'Age 1 — approach'),(241,'Attack at Lake Moana'),(481,'Departure for Mount Yokai'),(721,'Walk at Yokai'),(961,'Burrow beneath Yokai'),(END,'Age 1 ends only at complete sleep')]:scene.timeline_markers.new(label,frame=f)
worldmat=bpy.data.worlds.new('World');scene.world=worldmat;worldmat.use_nodes=True;worldmat.node_tree.nodes['Background'].inputs[0].default_value=(.2,.25,.3,1);worldmat.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='SUN',location=(800,-500,900));sun=bpy.context.object;sun.name='Sun';sun.data.energy=3;sun.rotation_euler=(-coord(lake,1)).to_track_quat('-Z','Y').to_euler()
def aim(ob,p):ob.rotation_euler=(Vector(p)-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Story_Camera';cam.data.type='ORTHO';cam.data.clip_end=10000;scene.camera=cam
for frame in range(1,END+1):
    scene.frame_set(frame)
    if frame<=241:target=world(lake)+lerp(EM,E,.5)*0;location=target+U*300-E*160-N*180;width=380
    elif frame<=481:target=world(island,20);location=target+U*100-E*90-N*170;width=280
    elif frame<=721:target=lerp(world(lake),world(mount),(frame-481)/240);up=target.normalized();location=target+up*260-N*160;width=300
    else:target=world(mount,10)+(EM*35 if frame<=961 else EM*0);location=target+UM*180+EM*100-NM*110;width=260 if frame<=961 else 220
    cam.location=location;aim(cam,target);cam.data.ortho_scale=width;cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame);cam.data.keyframe_insert('ortho_scale',frame=frame)
bpy.ops.object.camera_add(location=coord({'lat':35,'lon':-8},1200));overview=bpy.context.object;overview.name='Libriam_Overview';overview.data.type='ORTHO';overview.data.ortho_scale=1100;overview.data.clip_end=10000;aim(overview,(0,0,0));scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene['scene_status']='Geographic dimensions exact; choreography, terrain and clip time are draft choices. Skeleton/decay phase deferred.'
scene.frame_set(331)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.clip_end=10000;area.spaces.active.overlay.show_overlays=False;area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
audit={'radius_km':R,'diameter_km':R*2,'island_span_km':HEAD,'dragex_head_span_km':dragon.data.bones['head'].length*S_D,'moana_head_span_km':.7*S_M,'mountain_footprint_span_km':G['mountainSpanKm'],'mountain_height_proposal_km':M_HEIGHT,'lake_coords':lake,'yokai_coords':mount,'frames':END,'fps':FPS,'timeline_seconds':44,'additional_meshy_credits':0,'final_dragex_max_radial_height_km':None}
scene.frame_set(END);ev=dragonmesh.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();depths=[(ev.matrix_world@v.co).length-R for v in me.vertices];assert all(math.isfinite(d) for d in depths);assert max(depths)<0,'Dragex is not completely buried';audit['final_dragex_max_radial_height_km']=max(depths);ev.to_mesh_clear()
with open(os.path.join(ROOT,'scene-audit.json'),'w') as f:json.dump(audit,f,indent=2)
for frame,label in [(151,'flight'),(331,'attack'),(811,'walk'),(1051,'burrow'),(END,'buried')]:
    scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,label+'.png');bpy.ops.render.render(write_still=True)
scene.camera=overview;scene.frame_set(331);scene.render.filepath=os.path.join(ROOT,'world-overview.png');bpy.ops.render.render(write_still=True)
