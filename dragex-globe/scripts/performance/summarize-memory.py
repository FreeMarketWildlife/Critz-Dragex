from pathlib import Path
import json,sys
root=Path(sys.argv[1]);report=json.loads((root/'memory-attribution.json').read_text())
rows=[]
def scalar(node,key='size'):
 value=node.get('attrs',{}).get(key,{}).get('value')
 return int(value,16) if value is not None else None
for dump in report['dumps']:
 events=json.loads((root/(dump['label']+'.trace.json')).read_text())['traceEvents']
 allocators={};private={};names={e['pid']:e.get('args',{}).get('name') for e in events if e.get('name')=='process_name'}
 for e in events:
  if e.get('ph')!='v':continue
  d=e.get('args',{}).get('dumps',{})
  if d.get('allocators'):allocators[e['pid']]=d['allocators']
  q=d.get('process_totals',{}).get('private_footprint_bytes')
  if q:private[e['pid']]=int(q,16)
 app=next((pid for pid,a in allocators.items() if 'canvas' in a and 'webgl' in a),None)
 gpu=next((pid for pid,a in allocators.items() if 'gpu/angle/metal' in a),None)
 matching=[s for s in report['snapshots'] if s['label']==dump['label']]
 if dump['label']=='after-natural-cleanup':matching=[s for s in report['snapshots'] if s['label']=='cleanup-wait-13']
 if not matching:continue
 s=matching[0];procs={x['pid']:x for x in s['processes']};a=allocators.get(app,{});g=allocators.get(gpu,{})
 rows.append({'phase':dump['label'],'appPID':app,'gpuPID':gpu,'rssBytesByRole':s['byRole'],'rssBytesTotal':sum(s['byRole'].values()),'appRSSBytes':procs.get(app,{}).get('rssBytes'),'otherRenderersRSSBytes':s['byRole'].get('renderer',0)-(procs.get(app,{}).get('rssBytes',0)),'privateFootprintBytesByPID':private,'usedJSHeapBytes':s['heap']['usedSize'],'backingStorageBytes':s['heap']['backingStorageSize'],'activeURLBytes':(s.get('urls') or {}).get('bytes',0),'activeURLs':(s.get('urls') or {}).get('count',0),'uploadedTextures':(s.get('diagnostics') or {}).get('renderer',{}).get('memory',{}).get('textures'),'allocatorBytes':{name:scalar(a.get(name,{})) for name in ['canvas','v8','partition_alloc','webgl','gpu']},'gpuAllocatorBytes':{name:scalar(g.get(name,{})) for name in ['gpu/angle/metal','gpu/shared_images','gpu/transfer_memory','ioaccelerator','iosurface']}})
summary={'rows':rows,'limitations':['RSS is resident mapping size and counts shared pages across processes; renderer role totals include background/spare/WebUI renderers.','Allocator groups overlap through hierarchy and ownership edges. Do not add category sizes or combine them with RSS.','Private footprint is reported by Chrome on macOS and may include compressed/GPU accounting; it is a separate metric from RSS.','Tracing/native/JS sampling adds overhead. Diagnostic GC is an explicitly separate final phase, not a production peak measurement.']}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for r in rows:
 print(r['phase'],'rss',round(r['rssBytesTotal']/2**20),'appRSS',round((r['appRSSBytes']or 0)/2**20),'backing',round(r['backingStorageBytes']/2**20,1),'canvas',round((r['allocatorBytes']['canvas']or 0)/2**20,1),'ANGLE',round((r['gpuAllocatorBytes']['gpu/angle/metal']or 0)/2**20,1),'textures',r['uploadedTextures'])
