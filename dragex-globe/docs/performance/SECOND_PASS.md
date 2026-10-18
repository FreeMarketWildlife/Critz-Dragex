# Integrated globe — second-pass verification

> The follow-up [memory attribution report](MEMORY_ATTRIBUTION.md) records the subsequent inactive-GPU fix and current 72-test checkpoint.

The technical changes are now applied in the actual checkout at `/Users/tanoshi/Documents/ChatGPT/Critz-Dragex`, on local branch `codex/overnight-globe-integration`. Existing orbital and lore work remains uncommitted. HEAD remains `7346ca70f50efb28b8d710354abc82620213b659`; the staging area remains unchanged/empty. Technical commits are preserved separately in `task/dragex-overnight` on `codex/overnight-globe-performance`, and in the updated Git bundle. Nothing was pushed or deployed.

## Integration and rollback

Before each apply, the current user files, already integrated files and index were rechecked against recorded SHA-256 hashes. All 48 original globe files matched the preservation snapshot before initial integration. Backups of 55 original source/user files, original tracked/staged patches and the integration record are retained at `/Users/tanoshi/Documents/Codex/2026-10-13/task/globe-integration/`. All 49 non-overlapping backed-up files remain byte-identical, including the original untracked orbital sources and lore. Changes to the shared main file are exactly the reviewed technical hunks applied against the snapshot containing the user's orbital work.

Guarded rollback: `python3 /Users/tanoshi/Documents/Codex/2026-10-13/task/globe-integration/rollback.py`. It checks branch, HEAD, staging and every relevant file hash, verifies the inverse patch, reverses only this task's changes, and returns to `codex/dragex-globe`. It refuses later edits or commits rather than discarding them. Filesystem authorization is required when executing it against the actual checkout. No reset, stash, force-push or commit of the user's dirty files was used in the actual checkout; their copied preservation snapshot remains isolated.

## Second-pass fixes

- `32993ff`: retain immutable encoded PNG Blobs rather than all PNG ArrayBuffers plus a duplicate final ZIP payload. CRCs are calculated per frame. An unchanged baseline ZIP encoder independently verifies every output byte for fixed frame data.
- `05e648c`: build the unselected 4096×2048 flat presentation only when requested. That defers a logical 32 MiB RGBA canvas and its generation work at default startup. Both variants invalidate together when geography changes. Real UI tests cover first selection, source edits while flat, and restoring relief; the actual texture-generator function is byte-identical to the pre-integration function.
- Later receipt/tooling commit retains this report, full traces, final scripts and screenshots.

## Release and export verification

The actual checkout passes **71/71 unit tests** and builds successfully in **609 ms** with Vite 7.3.7. The final eight-file release manifest is saved in [second-pass/integrated-build-manifest.json](second-pass/integrated-build-manifest.json). All runtime changes were independently reread against pre-integration backups, frozen numerical/ZIP references and actual outputs. No additional agent was used for the review.

Hardware Chrome 155 reports **ANGLE Metal Renderer: Apple M3 Max**, with WebGL enabled. On the final release:

- Two full exports each produce **360 unique 640×360 PNG frames**, 30 fps / 12 seconds, frame names `0000`–`0359`, and no repeated endpoint frame. Each approximately **31.09 MB** archive includes valid ZIP CRCs and correct metadata. Completion takes approximately **6.4 seconds** on this machine. Cancellation at frame 18 succeeds twice; immediate restart then completes a full export.
- One complete final archive is **byte-identical to the baseline archive**, SHA-256 `33ef02aa4b0382a47812fbadd65298ce458a1badc11af25f2f5de1298d448a98`. Fixed-data ZIP regression also preserves all baseline bytes independently of GPU rendering.
- **21 space-to-globe round trips** preserve controls and geographic readout. Warmed resource counts remain **114 geometries / 13 textures** through all three cycles.
- Six large Hokkaido source-position changes rebuild maps and retain the same warmed counts. Additional source edits while flat verify lazy variant invalidation.
- A separate full-size source replacement at the same fractional history frame matches a fresh rebuild for all **494,019 position values**, all normals, the complete global shore map and the local shore tile. Restoring the original source restores the original position hash; old local/global textures receive disposal events.
- The focused 12-group release-browser suite passes again, including a real back-forward cache restore with working wheel zoom, picking, pins, all seven ages, responsive layout and export cancellation. No JavaScript or WebGL errors were reported.
- Frames 0, 180 and 359 and the hardware release screenshot were visually inspected. Existing scene content, including distant orbital objects, is retained; the export excludes UI as before.

Full final archives are preserved outside Git at `/Users/tanoshi/Documents/Codex/2026-10-13/task/globe-integration/final-memory/exports/complete-360-first.zip` and `complete-360-restart.zip`. [Validation receipts](second-pass/final-archive-validation.json) include hashes, frame counts, PNG dimensions, metadata and CRC results.

## Startup and realistic memory

Three fresh hardware-browser contexts per version, with the first animation paused to isolate CPU setup, measured median CPU-ready time at **3,204.1 → 2,907.0 ms**, a **9.3% reduction** from deferring the unused flat texture. This measures application CPU setup, not network load or physical-phone first paint. [Before](second-pass/load-before-lazy.json) / [after](second-pass/load-after-lazy.json).

Memory was sampled during real exports, cancellations, navigation and map edits using `Runtime.getHeapUsage` plus resident bytes from the owned Chrome process tree. Export samples occur about every 250 ms. There is no forced garbage collection; traces retain startup/GC variation.

| Sampled metric | Before second-pass fixes | Final workflow |
|---|---:|---:|
| Maximum backing storage | 157.8 MiB | 143.6 MiB |
| First complete export backing peak | 157.8 MiB | 125.8 MiB |
| Restart export mean backing storage | 108.6 MiB | 101.9 MiB |
| Maximum used JS heap | 32.2 MiB | 33.0 MiB |
| Chrome process-tree RSS sum | 2,145.7 MiB | 2,158.2 MiB |

The final workflow also exercises cold flat-variant creation. Backing-store retention is lower, but the process RSS result establishes **no overall RAM reduction**. RSS includes browser/GPU/native overhead and may count shared pages more than once; it is not unique physical RAM. Peak samples are lower bounds between sampling points. The renderer remains memory-heavy, and full map construction still creates large transient buffers. [Complete before trace](second-pass/baseline-memory.json) / [final trace](second-pass/final-memory.json).

## Limitations and resolved test failures

Safari 27.0 is installed, but WebDriver refused a session because **Allow remote automation is disabled**. Browser preferences were left unchanged; [exact probe](second-pass/safari-probe.json). Hardware Chrome coverage is complete; Safari/iOS and physical-phone behavior remain unverified.

The first repeated-download observer incorrectly assumed each suggested filename would create a new directory entry. The browser reused the filename; explicit per-download GUID/completion events now provide reliable archival receipts. A scripted form variable was changed to block scope before repeated evaluation. An extra EOF blank line in the frozen ZIP fixture was removed. These were tooling issues, not product failures. No unresolved release-test failure remains.

The next justified performance work remains full vertex-normal computation and profiling large map/canvas construction and GPU/native allocations. Changing texture resolution, visual direction, world content or orbital canon is outside this checkpoint.
