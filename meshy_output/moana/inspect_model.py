import bpy, json, os
from mathutils import Vector
ROOT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'moana-meshy.glb'))
report = []
for ob in bpy.context.scene.objects:
    if ob.type != 'MESH': continue
    ob.data.calc_loop_triangles()
    pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    report.append(dict(name=ob.name, vertices=len(pts), triangles=len(ob.data.loop_triangles), min=lo,max=hi,materials=[m.name for m in ob.data.materials]))
print(json.dumps(report,indent=2))
with open(os.path.join(ROOT,'mesh-audit.json'),'w') as f: json.dump(report,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'inspection.blend'))
