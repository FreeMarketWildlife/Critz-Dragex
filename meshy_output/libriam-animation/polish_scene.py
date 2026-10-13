import bpy,os,math,bmesh
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene=bpy.context.scene
la,lo=math.radians(19.75),math.radians(9.98)
up=Vector((math.cos(la)*math.cos(lo),math.cos(la)*math.sin(lo),math.sin(la)))
sun=bpy.data.objects['Sun'];sun.data.energy=3;sun.rotation_euler=(-up).to_track_quat('-Z','Y').to_euler()
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.25,.3,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
for name in ['Mount Yokai — 4x island span','Lake Moana',"Moana's Tear"]:
    ob=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(ob.data)
    for f in bm.faces:
        if f.normal.dot(f.calc_center_median())<0:f.normal_flip()
    bm.to_mesh(ob.data);bm.free();ob.data.update()
cam=bpy.data.objects['Story_Camera'];scene.camera=cam
for frame in range(242,482):
    cam.data.ortho_scale=250;cam.data.keyframe_insert('ortho_scale',frame=frame)
scene.frame_set(331)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
for frame,label in [(151,'flight'),(331,'attack'),(811,'walk'),(1051,'burrow'),(1321,'buried')]:
    scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,label+'.png');bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['Libriam_Overview'];scene.frame_set(331);scene.render.filepath=os.path.join(ROOT,'world-overview.png');bpy.ops.render.render(write_still=True)
