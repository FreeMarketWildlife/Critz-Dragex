# Bounded memory attribution and inactive texture release

The globe's aggregate Chrome RSS is not its JavaScript heap. A fresh, isolated hardware Chrome run was profiled using process-role RSS, `Runtime.getHeapUsage`, Chrome allocator memory dumps, native allocation sampling and live JS sampling. The trace buffer was capped at 8 MiB. No garbage collection was forced during the natural workflow; a separate final diagnostic-GC phase is labeled explicitly. Safari settings remained unchanged.

## Attribution before the additional fix

The blank browser already mapped **999.8 MiB** in aggregate RSS: browser 281 MiB, GPU 154 MiB, renderers 390 MiB, network 103 MiB and storage 72 MiB. Shared libraries/pages appear in several processes. After loading, tracing also introduced a tracing service (~150–173 MiB), and Chrome started a passage-embedding service (~119–138 MiB). Background/WebUI/spare renderers are included in renderer role totals. These are browser/profiler costs, not JS objects owned by the globe.

| Natural state | Aggregate RSS | Globe renderer RSS | Used JS heap | Array/string backing | Active export URLs |
|---|---:|---:|---:|---:|---:|
| Idle loaded |1,979 MiB |572 MiB |25.3 MiB |119.5 MiB |0 |
| After seven navigation round trips |1,992 MiB |515 MiB |7.9 MiB |79.4 MiB |0 |
| Flat → relief |2,103 MiB |551 MiB |7.4 MiB |111.4 MiB |0 |
| After cancellation |2,120 MiB |557 MiB |23.5 MiB |114.4 MiB |0 |
| Two seconds after completed export |2,088 MiB |552 MiB |17.7 MiB |92.5 MiB |1 /29.7 MiB |
| After 65 seconds of natural cleanup |2,073 MiB |557 MiB |15.3 MiB |79.4 MiB |0 |
| Separate diagnostic GC |2,002 MiB |480 MiB |7.2 MiB |79.4 MiB |0 |

The app's backing stores return to 79.4 MiB, and the existing sixty-second download-URL expiry clears the 31.09 MB archive from the URL registry. Cancellation creates no export URL. The retained 31 MB URL is bounded, deliberate download lifetime; its native browser allocation is separate from JS backing stores. Completed/cancelled render targets are disposed and uploaded texture counters return to their warmed baseline. This workflow does not show an accumulating export-buffer or navigation leak.

The memory dumps identify the globe renderer by its Canvas/WebGL allocators. After navigation it reports **108.1 MiB of canvas resources**, **82.8 MiB in partition allocation**, **73.7 MiB under V8**, **46.4 MiB under WebGL**, and **108.2 MiB of GPU transfer/mapped memory**. These categories overlap through ownership/containment and must not be added. V8's committed allocator size is distinct from 7.9 MiB of used JS heap. About79 MiB of persistent backing storage is expected from the exact 4096×2048 age/shore data, wave atlas, mesh attributes and related arrays.

The decoded canvas allocation is understandable from source dimensions: one 32 MiB relief presentation, 32 MiB river map, 32 MiB biome map, 8 MiB moon source, two 2 MiB gas textures and small halo/ring canvases total about108 MiB. Selecting the flat variant adds another 32 MiB cached bitmap. Canvas roots and GPU shared-image/Metal categories can overlap; source pixel sizes do not equal unique physical RAM.

ANGLE Metal allocation peaks at 618.2 MiB during initial loading, then 404.8 MiB after navigation. Selecting flat and returning to relief leaves **14 uploaded textures**, with 475.2 MiB of ANGLE Metal allocation after natural cleanup. Native sampling shows large retained 32 MiB-class asset allocations, but its opaque, unsymbolized stacks limit attribution to individual functions. Raw allocator dumps are retained under `task/globe-integration/memory-attribution/`; compact [before summary](memory-attribution/before-summary.json) and [full samples](memory-attribution/before-memory-attribution.json) are committed here.

## Evidenced avoidable allocation and fix

`71208a4` introduces explicit surface selection. It disposes the inactive variant's GPU upload while retaining both **exact original source bitmaps** for responsive switching. Reactivating a bitmap requests a fresh upload with the same filtering, mipmaps, dimensions and pixels. Lookup remains separate from selection. Geography invalidation still clears all variants. No image resolution, mesh detail, color generator, output format or export dimensions changed.

After the same flat → relief test, uploaded textures return to **13**, and after natural cleanup ANGLE Metal reports **439.0 MiB**, versus 475.2 MiB before. The logical discarded 4096×2048 RGBA upload is 32 MiB plus approximately 10.7 MiB of mip levels; actual driver allocation differs. The cached CPU canvas allocation stays140.1 MiB after both variants have been used. This is an intentional bounded two-bitmap cache that avoids regenerating the procedural artwork during switches.

Aggregate RSS varied between fresh browser runs: the after run's blank baseline was 1,411 MiB because background renderer mappings differed. It is therefore not used to claim a precise physical-RAM saving. At natural cleanup the before/after totals were 2,073/2,066 MiB; backing storage was 79.4 MiB in both. App renderer RSS was 557/543 MiB. Actual source retention is bounded while large browser/driver caches remain. [After allocator summary](memory-attribution/after-summary.json) includes per-process and ownership-category values; Chrome private-footprint counters are recorded separately from RSS.

## Verification and limitations

- Actual source: **72/72 unit tests** pass; production build passes; all runtime syntax and inverse-patch checks pass.
- The 12-group release-browser regression passes, including real back-forward restoration, picking, all ages, repeated source changes and export cancellation.
- Full hardware export produces 360 PNGs at 640×360, valid CRCs and correct 12-second/30 fps metadata after repeated presentation switches. [Export proof](memory-attribution/after-export-validation.json). Original bitmap factory is unchanged; numerical cache and frozen ZIP-byte regressions remain in place.
- Natural cleanup was observed through 65 seconds; a later deterministic dump/GC is diagnostic only. Both runs used Apple M3 Max Metal. No browser preference was changed and nothing was pushed/deployed.
- Chrome RSS includes shared pages and background processes. Memory-infra category sizes overlap; GPU/private-footprint counters include platform-specific accounting. Sampling/tracing changes timing and adds overhead. The measured workflow is bounded, not proof that every possible interaction is leak-free. Safari/iOS and physical phones remain unverified.

Remaining memory targets require profiling before changes: native canvas/transient construction, GPU transfer-buffer/driver caches, and the deliberate 32 MiB inactive CPU bitmap. Retaining exact globe detail is a constraint; lower-resolution or compressed substitutes were not introduced.
