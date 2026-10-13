import bpy,os,math,json
from mathutils import Vector,Matrix,Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Dragex_Rig'];mesh=bpy.data.objects['Dragex'];G=json.load(open(os.path.join(ROOT,'geography.json')));R=G['radiusKm']
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
    reset(rig);phase=2*math.pi*t
    for side,s in [('L',1),('R',-1)]:
        rot_world(rig,f'wing_upper.{side}',(0,1,0),-s*(.40*math.sin(phase)*flutter+fold))
        rot_world(rig,f'wing_forearm.{side}',(0,1,0),-s*(.14*math.sin(phase-.5)*flutter+fold*.25))
        for i in range(1,6):
            for j in [1,2]:rot_world(rig,f'wing_finger_{i}_{j:02d}.{side}',(0,1,0),-s*.035*math.sin(phase-.8)*flutter)
        for tag in ['front','rear']:
            rot_world(rig,f'{tag}_upper.{side}',(1,0,0),.45)
            rot_world(rig,f'{tag}_lower.{side}',(1,0,0),-.55)
    for i in range(1,21):rot_world(rig,f'tail_{i:02d}',(0,0,1),.022*math.sin(phase-i*.2)*flutter)
def bone_matrix(a,b,rest_bone=None):
    direction=(b-a).normalized()
    q=direction.to_track_quat('Y','Z') if rest_bone is None else (rest_bone.tail_local-rest_bone.head_local).normalized().rotation_difference(direction)@rest_bone.matrix_local.to_quaternion()
    return Matrix.Translation(a)@q.to_matrix().to_4x4()
def walk_pose(t):
    reset(rig)
    bpy.context.view_layer.update()
    for side,s in [('L',1),('R',-1)]:
        for tag in ['front','rear']:
            upper=f'{tag}_upper.{side}';lower=f'{tag}_lower.{side}';foot=f'{tag}_foot.{side}'
            a=rig.data.bones[upper].head_local.copy();rest=rig.data.bones[lower].tail_local.copy()
            p=(t+(0 if (tag=='front')==(side=='L') else .5))%1
            if p<.6:delta=-.024+.08*p;lift=0
            else:u=(p-.6)/.4;delta=.024-.048*(u*u*(3-2*u));lift=.025*math.sin(math.pi*u)
            c=rest+Vector((0,delta,lift));l1=rig.data.bones[upper].length;l2=rig.data.bones[lower].length
            d=c-a;length=min(d.length,l1+l2-.00001);unit=d.normalized()
            along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along))
            q=(Vector((0,1,0))-unit*unit.y).normalized();knee=a+unit*along+q*height
            c=a+unit*length
            rig.pose.bones[upper].matrix=bone_matrix(a,knee,rig.data.bones[upper]);bpy.context.view_layer.update()
            rig.pose.bones[lower].matrix=bone_matrix(knee,c,rig.data.bones[lower]);bpy.context.view_layer.update()
            toe=c+(rig.data.bones[foot].tail_local-rig.data.bones[foot].head_local)
            rig.pose.bones[foot].matrix=bone_matrix(c,toe,rig.data.bones[foot]);bpy.context.view_layer.update()
        rot_world(rig,f'wing_upper.{side}',(0,1,0),-s*.6)
        rot_world(rig,f'wing_forearm.{side}',(0,1,0),-s*.15)
    for i in range(1,21):rot_world(rig,f'tail_{i:02d}',(0,0,1),.015*math.sin(2*math.pi*t-i*.22))

def coord(p,r=R):
 la=math.radians(p['lat']);lo=math.radians(p['lon']);return Vector((r*math.cos(la)*math.cos(lo),r*math.cos(la)*math.sin(lo),r*math.sin(la)))
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
mount=G['YOKAI'];UM=coord(mount,1);lo=math.radians(mount['lon']);EM=Vector((-math.sin(lo),math.cos(lo),0))
rig.animation_data.action=bpy.data.actions['Walk']
for frame in range(1,122):
 scene.frame_set(frame);walk_pose((frame-1)/60);key_pose(rig,frame)
rig.animation_data.action=bpy.data.actions['Attack_Flight_Walk_Burrow']
for frame in range(722,962):
 scene.frame_set(frame);walk_pose((frame-721)/60);key_pose(rig,frame)
for frame in range(962,1322):
 scene.frame_set(frame);t=(frame-961)/360;pos=coord(mount,R+21.3-150*smooth(t));flight_pose((frame-1)/120,fold=.6+.55*smooth(t/.2),flutter=.15*(1-smooth(t/.15)))
 y=EM;z=UM;x=y.cross(z).normalized();rig.location=pos;rig.rotation_quaternion=Matrix((x,y,z)).transposed().to_quaternion()@Quaternion((1,0,0),math.pi/2*smooth(t/.35))
 rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame);key_pose(rig,frame)
mountob=bpy.data.objects['Mount Yokai — 4x island span']
center=coord(mount)
for v in mountob.data.vertices:
 h=(v.co-center).dot(UM);v.co=v.co.normalized()*(R+h)
mountob.data.update()
cam=bpy.data.objects['Story_Camera'];scene.camera=cam
la,lo=math.radians(G['LAKE']['lat']),math.radians(G['LAKE']['lon']);U=coord(G['LAKE'],1);E=Vector((-math.sin(lo),math.cos(lo),0));N=U.cross(E)
for frame in range(242,482):
 target=coord(G['ISLAND_CENTER'],R+5);cam.location=target+U*100-E*90-N*170;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
# Replace the portable locomotion export using corrected Walk, without world transforms.
rig.animation_data.action=None
old=rig.matrix_world.copy();rig.matrix_world=Matrix.Identity(4);old_units=scene.unit_settings.scale_length;scene.unit_settings.scale_length=1
for tr in rig.animation_data.nla_tracks:tr.mute=tr.name not in ['Flight','Walk']
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'dragex-locomotion.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
rig.matrix_world=old;scene.unit_settings.scale_length=old_units
for tr in rig.animation_data.nla_tracks:tr.mute=True
rig.animation_data.action=bpy.data.actions['Attack_Flight_Walk_Burrow'];scene.frame_set(331)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
for frame,label in [(331,'attack'),(811,'walk'),(1051,'burrow'),(1321,'buried')]:
 scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,label+'.png');bpy.ops.render.render(write_still=True)
