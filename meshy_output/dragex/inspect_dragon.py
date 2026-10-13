import bpy,os,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dragex-meshy.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh;mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.data.calc_loop_triangles()
report={'triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'min':[min(v.co[i] for v in mesh.data.vertices) for i in range(3)],'max':[max(v.co[i] for v in mesh.data.vertices) for i in range(3)]}
print(json.dumps(report))
with open(os.path.join(ROOT,'mesh-audit.json'),'w') as f:json.dump(report,f,indent=2)
scene=bpy.context.scene;world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.10,.13,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(ob,p):ob.rotation_euler=(Vector(p)-ob.location).to_track_quat('-Z','Y').to_euler()
for loc in [(-1,-2,3),(2,2,3),(0,-3,1)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=200;o.data.size=3;aim(o,(0,0,0))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.65;cam.data.clip_start=.001;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
for label,loc in [('front',(0,-3,1)),('side',(3,0,1)),('top',(0,0,3)),('three-quarter',(2,-3,1.3))]:
    cam.location=loc;aim(cam,(0,0,0));scene.render.filepath=os.path.join(ROOT,label+'.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'inspection.blend'))
