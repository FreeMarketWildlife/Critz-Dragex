import bpy,os,math,json
from mathutils import Vector,Matrix,Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Dragex_Rig'];G=json.load(open(os.path.join(ROOT,'geography.json')));R=G['radiusKm']
def coord(p,r=R):
 la=math.radians(p['lat']);lo=math.radians(p['lon']);return Vector((r*math.cos(la)*math.cos(lo),r*math.cos(la)*math.sin(lo),r*math.sin(la)))
def basis(p):
 up=coord(p,1);lo=math.radians(p['lon']);e=Vector((-math.sin(lo),math.cos(lo),0));return e,up.cross(e),up
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def orient(pos,forward,pitch=0):
 up=pos.normalized();y=-forward.normalized();z=(up-y*y.dot(up)).normalized();x=y.cross(z).normalized()
 rig.location=pos;rig.rotation_quaternion=Matrix((x,y,z)).transposed().to_quaternion()@Quaternion((1,0,0),pitch)
mount=G['YOKAI'];island=G['ISLAND_CENTER'];E,N,U=basis(G['LAKE']);EM,NM,UM=basis(mount)
for frame in range(482,722):
 scene.frame_set(frame);t=(frame-481)/240;start=coord(island,R+30)+E*62;goal=coord(mount)+EM*65.67
 alt=(start.length-R)*(1-t)+21.3*t+12*math.sin(math.pi*t);pos=start.normalized().lerp(goal.normalized(),t).normalized()*(R+alt)
 orient(pos,coord(mount)-pos);rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame)
for frame in range(722,962):
 scene.frame_set(frame);t=(frame-721)/240;pos=(coord(mount)+EM*(34+31.67*(1-t))).normalized()*(R+21.3)
 orient(pos,-EM,-.4*smooth(t));rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame)
for frame in range(962,1322):
 scene.frame_set(frame);t=(frame-961)/360;pos=(coord(mount)+EM*(34*(1-smooth(t/.25)))).normalized()*(R+21.3-150*smooth(t))
 orient(pos,-EM,math.pi/2*smooth(t/.35));rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame)
cam=bpy.data.objects['Story_Camera'];scene.camera=cam
def aim(p,width,frame):
 if frame<=481:loc=p+U*100-E*90-N*170
 else:loc=p+UM*180+EM*100-NM*110
 cam.location=loc;cam.rotation_euler=(p-loc).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=width
 cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame);cam.data.keyframe_insert('ortho_scale',frame=frame)
for frame in range(242,482):aim(coord(island,R+20),280,frame)
for frame in range(722,962):aim(coord(mount,R+10)+EM*35,260,frame)
for frame in range(962,1322):aim(coord(mount,R+10),220,frame)
scene.frame_set(331);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
for frame,label in [(331,'attack'),(811,'walk'),(1051,'burrow')]:
 scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,label+'.png');bpy.ops.render.render(write_still=True)
