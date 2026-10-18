The scripts use Node.js 20+ and the app's installed dependencies. The baseline
shore fixture is unchanged source from snapshot 9918e29. It is a measurement and
regression oracle, not another production implementation.

Run the CPU shoreline comparison:

```sh
node scripts/performance/shore-benchmark.mjs
```

For browser checks, start a separate headless Chrome profile. Do not connect these
scripts to a personal browser profile. Every test creates and destroys an
incognito context with synthetic project storage. Choose unused ports.

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9286 \
  --user-data-dir=/tmp/dragex-overnight-chrome \
  --no-first-run --no-default-browser-check \
  --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader about:blank
```

Start the unchanged snapshot's Vite server on 5187 and the optimized checkout on
5186. Then run alternating terrain timings and the cached-page defect comparison:

```sh
node scripts/performance/terrain-benchmark.mjs http://127.0.0.1:5187/ http://127.0.0.1:5186/
node scripts/performance/cache-repro.mjs http://127.0.0.1:5187/ http://127.0.0.1:5186/
```

The terrain benchmark requires Vite's development module URLs. Its paused initial
animation isolates CPU setup and full-mesh updates. It asserts equal complete
position/normal hashes across versions; it does not measure phone FPS. Expected
missing-favicon and Vite back-forward-cache socket notices are recorded separately.

For release verification:

```sh
npm run build
npm exec vite preview -- --host 127.0.0.1 --port 5188 --strictPort
node scripts/performance/browser-check.mjs http://127.0.0.1:5188/
```

Run one active browser regression at a time. Browser checks save screenshots to
`docs/performance/`; redirect their JSON output to retain a report. Set
`GLOBE_CDP_PORT` when using another debugging port. The HTTP server and browser are
owned by the caller and should be closed after testing.

Second-pass checks use the integrated release and the hardware Chrome profile.
Set `GLOBE_CDP_PORT` and `GLOBE_SECOND_PASS_OUTPUT` to your owned debug port and
output folder. `second-pass.mjs` records complete downloads by GUID, raw heap/RSS
traces, cancellation/restart, navigation, map changes and lazy presentation tests.
`cache-invalidation.mjs` requires a Vite development URL and compares a changed
source against a fresh full-size rebuild. `load-check.mjs` measures three fresh
contexts with animation paused. Never use a personal browser profile.
