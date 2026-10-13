import bpy,os,json,math
from mathutils import Vector,Matrix,Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Dragex_Rig'];G=json.load(open(os.path.join(ROOT,'geography.json')));R=G['radiusKm']
def coord(p,r=R):
    la=math.radians(p['lat']);lo=math.radians(p['lon']);return Vector((r*math.cos(la)*math.cos(lo),r*math.cos(la)*math.sin(lo),r*math.sin(la)))
def basis(p):
    up=coord(p,1);lo=math.radians(p['lon']);e=Vector((-math.sin(lo),math.cos(lo),0));return e,up.cross(e),up
def orient(pos,forward,pitch=0):
    up=pos.normalized();y=-forward.normalized();z=(up-y*y.dot(up)).normalized();x=y.cross(z).normalized()
    rig.location=pos;rig.rotation_quaternion=Matrix((x,y,z)).transposed().to_quaternion()@Quaternion((1,0,0),pitch)
island=G['ISLAND_CENTER'];mount=G['YOKAI'];E,N,U=basis(G['LAKE']);EM,NM,UM=basis(mount)
for frame in range(242,482):
    scene.frame_set(frame);t=(frame-241)/240;a=2*math.pi*t;r=62-14*math.sin(math.pi*t)**2
    pos=coord(island,R+22+8*math.cos(a))+E*(r*math.cos(a))+N*(r*math.sin(a));forward=Quaternion(pos.normalized(),.25)@(coord(island,R+4)-pos)
    orient(pos,forward,.18*math.sin(math.pi*t));rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame)
for frame in range(482,722):
    scene.frame_set(frame);t=(frame-481)/240;start=coord(island,R+30)+E*62;goal=coord(mount)+EM*31.67
    alt=(start.length-R)*(1-t)+21.3*t+12*math.sin(math.pi*t);pos=start.normalized().lerp(goal.normalized(),t).normalized()*(R+alt)
    orient(pos,coord(mount)-pos);rig.keyframe_insert('location',frame=frame);rig.keyframe_insert('rotation_quaternion',frame=frame)
scene.frame_set(331);scene.camera=bpy.data.objects['Story_Camera'];bpy.ops.file.pack_all()
places=bpy.data.collections.new('Named places from current globe');scene.collection.children.link(places)
for p in G['places']:
    ob=bpy.data.objects.new('Map — '+p['name'],None);places.objects.link(ob);ob.location=coord(p,R+.7);ob.empty_display_size=2;ob['latitude']=p['lat'];ob['longitude']=p['lon']
text=bpy.data.texts.new('Geography provenance.json');text.write(json.dumps(G,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene.render.filepath=os.path.join(ROOT,'attack.png');bpy.ops.render.render(write_still=True)
