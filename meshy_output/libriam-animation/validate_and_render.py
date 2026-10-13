import bpy,os,json,math
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dragex-locomotion.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');tracks=list(rig.animation_data.nla_tracks);rig.animation_data.action=None
checks={}
for tr in tracks:
 for t in tracks:t.mute=t!=tr
 positions=[]
 for f in [1,16,31,61,121]:
  bpy.context.scene.frame_set(f);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();positions.append([v.co.copy() for v in me.vertices]);ev.to_mesh_clear()
 movement=max((a-b).length for a,b in zip(positions[0],positions[1]));seam=max((a-b).length for a,b in zip(positions[0],positions[-1]))
 assert movement>.001;assert seam<.0001
 checks[tr.name]={'max_sampled_movement':movement,'loop_seam':seam}
assert 'Flight' in checks and 'Walk' in checks
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'libriam-attack-and-burrow.blend'))
scene=bpy.context.scene;R=json.load(open(os.path.join(ROOT,'geography.json')))['radiusKm'];rig=bpy.data.objects['Dragex_Rig'];mesh=bpy.data.objects['Dragex']
planet=bpy.data.objects['Libriam — exact radius'];radius_error=max(abs(v.co.length-R) for v in planet.data.vertices);assert radius_error<.0001
restedges=[(mesh.data.vertices[e.vertices[0]].co-mesh.data.vertices[e.vertices[1]].co).length for e in mesh.data.edges]
poses={}
for f in [1,151,241,331,481,721,781,811,871,931,961,991,1051,1201,1321]:
 scene.frame_set(f);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();ratios=[]
 assert all(math.isfinite(c) for v in me.vertices for c in v.co)
 for e,L in zip(mesh.data.edges,restedges):
  if L>1e-6:a,b=e.vertices;ratios.append((me.vertices[a].co-me.vertices[b].co).length/L)
 ratios.sort();depths=[(ev.matrix_world@v.co).length-R for v in me.vertices]
 poses[f]={'edge_p01':ratios[int(len(ratios)*.01)],'edge_p99':ratios[int(len(ratios)*.99)],'max_height_km':max(depths)}
 ev.to_mesh_clear()
assert poses[1321]['max_height_km']<0
with open(os.path.join(ROOT,'verification.json'),'w') as out:json.dump({'locomotion_export':checks,'planet_radius_max_error_km':radius_error,'scene_samples':poses},out,indent=2)
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=12
scene.camera=bpy.data.objects['Story_Camera'];os.makedirs(os.path.join(ROOT,'movie-frames'),exist_ok=True)
for f in range(1,1321,6):
 scene.frame_set(f);scene.render.filepath=os.path.join(ROOT,'movie-frames',f'{f:04d}.png');bpy.ops.render.render(write_still=True)
