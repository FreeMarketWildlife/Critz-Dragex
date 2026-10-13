import bpy,os,json,math
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'moana-water-test.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Moana_Rig'];mesh=bpy.data.objects['Moana']
scene.render.resolution_x=1000;scene.render.resolution_y=580;scene.cycles.samples=10
rest_edges=[(mesh.data.vertices[e.vertices[0]].co-mesh.data.vertices[e.vertices[1]].co).length for e in mesh.data.edges]
checks={}
for clip,frames in [('Submerged_Swim',241),('Breach_And_Dive',361)]:
    rig.animation_data.action=bpy.data.actions[clip]
    ratios=[];samples=[]
    for frame in range(1,frames+1,20):
        scene.frame_set(frame);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
        depths=[(ev.matrix_world@v.co).length-364.376984409 for v in me.vertices]
        assert all(math.isfinite(x) for x in depths)
        samples.append({'frame':frame,'min_depth_km':min(depths),'max_height_km':max(depths)})
        for edge,length in zip(mesh.data.edges,rest_edges):
            if length>1e-5:
                a,b=edge.vertices;ratios.append((me.vertices[a].co-me.vertices[b].co).length/length)
        ev.to_mesh_clear()
    ratios.sort()
    checks[clip]={'edge_ratio_p01':ratios[int(len(ratios)*.01)],'edge_ratio_p99':ratios[int(len(ratios)*.99)],'depth_samples':samples}
    if clip=='Submerged_Swim':assert max(s['max_height_km'] for s in samples)<0,'Swim accidentally breaches'
    else:
        assert max(s['max_height_km'] for s in samples)>0,'Breach stays submerged'
        assert min(s['min_depth_km'] for s in samples)<0,'Breach does not submerge'
with open(os.path.join(ROOT,'water-deformation-audit.json'),'w') as f:json.dump(checks,f,indent=2)
rig.animation_data.action=bpy.data.actions['Breach_And_Dive']
os.makedirs(os.path.join(ROOT,'water-preview-frames'),exist_ok=True)
for frame in range(1,361,6):
    scene.frame_set(frame);scene.render.filepath=os.path.join(ROOT,'water-preview-frames',f'{frame:03d}.png');bpy.ops.render.render(write_still=True)
