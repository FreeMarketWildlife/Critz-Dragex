# Globe technical checkpoint — October 14, 2026

> This is the historical first isolated checkpoint. The changes have since been integrated and extended; see [the second-pass report](SECOND_PASS.md) for current source, QA and rollback status.

Libriam Globe has measured CPU improvements, lower temporary texture memory, and fixes for cached-page controls and frame-export cancellation. All work is isolated in `codex/overnight-globe-performance`; the original repository and its existing user edits remain untouched. No push or deployment.

## Baseline and ownership

- Source: `/Users/tanoshi/Documents/ChatGPT/Critz-Dragex`, branch `codex/dragex-globe`, HEAD `7346ca70f50efb28b8d710354abc82620213b659`.
- Current uncommitted globe, orbit and lore changes were copied intact into baseline snapshot `9918e2993c14f9b919395c8429914ed951d0bd9f`. The snapshot is preservation evidence, not a requested canon rewrite.
- Implementation checkout: `/Users/tanoshi/Documents/Codex/2026-10-13/task/dragex-overnight`; baseline comparison worktree: `../dragex-baseline`.
- Parent reserved all other games to dedicated workers. Only the globe and its directly required test tooling were changed here.
- Root AGENTS and globe README contracts were read. Geography, story canon, styling, approved shapes, orbital proposals, player storage key and project schema remain preserved.

## Measured results

| Operation | Before median | After median | Evidence |
|---|---:|---:|---|
| 4096×2048 shoreline transform | 637.45 ms | 199.48 ms | 3.20× faster; exact Float32 output hash matches |
| 1024×1024 camera-local shoreline | 88.41 ms | 25.68 ms | 3.44× faster; exact output hash matches |
| 512×320 globe surface update | 25.90 ms | 16.40 ms | 1.58× faster / 36.7% less CPU; complete position and normal hashes match |
| Shore RGBA packing allocation | extra 32 MiB global / 4 MiB local | zero additional RGBA buffer | Aliased source storage, offsets and packed channel values verified |
| Cached-page wheel zoom | 1,221 km → 1,221 km | 1,221 km → 1,158 km | Identical real browser-history restore and wheel input |

Node v24.21.0 on macOS arm64. Shore measurements alternate five post-warmup runs against an unchanged baseline fixture. Terrain measurements alternate three independent browser contexts per version, with 22 measured updates per context after warmup. They use the real coast and full 164,673-vertex mesh. Both complete 494,019-value Float32 position and normal arrays retain their SHA-256 hashes. These are CPU timings, not phone FPS promises. Headless Chrome uses SwiftShader; hardware GPU/Safari/physical phone behavior is unverified.

Application CPU-ready time with animation paused changed from 3,846.8 to 3,783.5 ms, approximately 1.6%. That small difference does not establish a meaningful overall load-time improvement; texture/map construction still dominates startup. Raw measurements are in [shore-optimized.json](shore-optimized.json), [terrain-browser.json](terrain-browser.json), and [cache-before-after.json](cache-before-after.json). The original fixture's SHA-256 is `431a2399ad311467c774801202eee03f6cac542b592842be5043182e60ed7679`.

## Changes

- `src/water-loop.js`: replace per-neighbor modulo/clamp calls with direct row indices while preserving sweep order, seam handling, polar costs and Float32 results.
- `src/terrain-surface.js` and `src/age-renderer.js`: cache land/mountain samples only for affected vertices, scale ocean vertices uniformly, retain exact normal computation, and use a conservative centered sphere for raycast rejection. Map edits invalidate the sparse cache. Draped coordinates retain the same state as the last mesh update within a design unit.
- `src/environment.js`: pack distance, mask and ice channels into the existing RGBA buffer.
- `src/render-lifecycle.js` and `src/main.js`: one cancellable render loop, pause hidden/cached pages, reset elapsed time on resume, and retain resources/controls for back-forward restoration. Return from the solar view restores the geographic HUD readout.
- `src/loop-export.js`: cancellation releases a pending frame wait immediately and retains target cleanup on failure.
- Twelve additional unit regressions and dependency-free browser/benchmark scripts; diagnostics expose copied GPU resource counters for verification.

## Verification

- Baseline: 56/56 unit tests pass; baseline production build succeeds.
- Final: 68/68 unit tests pass; all seven owned runtime files pass syntax checks; `git diff --check` passes.
- Production build succeeds in 610 ms; the final updated build receipt contains its exact output hashes.
- [Production browser report](browser-release.json): 12 groups pass with no application or WebGL errors. Seven-age scrubbing, 0×/10×/1× terrain, raised picking, synthetic project export/invalid import, all seven orbital bodies, real back-forward restoration, 390×844 layout and export cancellation are covered.
- Eight pin create/delete cycles retain 105 geometries / 11 textures. Map edits and camera transitions initially warm other visible space assets; repeated identical map cycles stabilize at 108 geometries / 13 textures, with no recurring growth. Six actual placement changes rebuild terrain and shore maps and preserve saved coordinates.
- Saved desktop, mobile and solar screenshots were visually inspected. Existing art and layouts are retained. The mobile globe can be cropped at the current zoom; this task changes no camera-fit design.
- Full 360-frame video ZIP completion was not rerun; cancellation, target restoration, ZIP headers/CRC/payload, and periodic wave behavior were checked.

## Resolved test/setup failures

The first isolated build failed because copying dependencies dereferenced `.bin/vite`'s symlink. Restoring the copied symlinks fixed it; repository source did not need a build repair. The first benchmark assertion included the preexisting missing favicon; the test records that known request separately. Vite intentionally closes its development WebSocket when a page enters the back-forward cache; this is retained as an expected development warning, and the release build has no Vite socket. An initial map-memory assertion compared against assets that had not yet become visible; repeat cycles distinguish that normal warmup from a leak. One syntax invocation used the repository root instead of the app folder; the corrected seven-file check passes.

## Local commits and integration

- `8edbda3`: Reduce shoreline and terrain update costs without changing geography.
- `6a7128a`: Preserve globe controls on cached restores and cancel stalled exports.
- Final evidence/report commit follows these; inspect `git log -3` for its SHA.

The parent can integrate the technical patch against the preserved dirty source state. `globe-technical.patch` omits the baseline snapshot's existing user changes; `globe-overnight.bundle` retains the isolated commits, including that preservation snapshot. Run `git apply --check` before integration, then repeat combined tests/build before any publishing decision. The patch has been checked against the original source checkout. No repository-specific publication or push has occurred.

Next justified work: profile full vertex-normal computation, which remains in every changed terrain frame, and the synchronous map/biome/texture construction dominating startup. Retain independent picking and geometry equivalence when optimizing those paths. Hardware GPU and Safari coverage would improve confidence. No deployment, canon, visual redesign or new feature is proposed by this checkpoint.
