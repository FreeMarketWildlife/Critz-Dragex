# Libriam Globe

A browser-based 3D atlas of Libriam and a solar-system design workspace. The app lives alongside the lore repository; it does not turn design proposals into canon.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
cd dragex-globe
npm ci
npm run dev
```

Open the Local URL printed by Vite. `npm test` checks geometry and project validation. `npm run build` produces `dist/`, which any static HTTP host can serve. WebGL is required for the 3D views. No runtime mapping API, account, or API key is needed; JavaScript and coastline data are bundled. The optional Google Fonts stylesheet falls back to system fonts when unavailable.

## Explore and design

- Drag the globe to rotate; scroll or use +/− to zoom. Search finds the continents, named regions, islands, rivers and saved places; selecting a result flies to it. Arrow keys, +/− and Home work when the globe has focus.
- Measure: choose the ↔ tool, then click two surface points. Distances use the shortest great-circle arc on Libriam.
- Add pin: choose a surface location and give it a name. Saved pins are proposals. Search finds Hokkaido and saved locations.
- Toggle coordinates, labels, illustrative relief, lighting and rotation. Save view as PNG exports the rendered 3D scene.
- Hokkaido’s proposed position is editable in Map settings, within ±40° latitude / ±100° longitude in this first version. Placement changes preserve area; pins retain their coordinates.
- Solar system: add and edit stars, planets and moons; choose an orbital parent and circular-orbit distance in AU. Libriam starts with no assigned star, orbit or moon. Body sizes and orbit spacing are compressed and do not share a physical scale. No gravity or orbital-period simulation is claimed.
- Export/import JSON (by file or copy/paste) preserves pins, proposed Hokkaido placement and celestial-body designs. Data saves in this browser’s local storage, not a server. Local and hosted copies have separate storage. Export before changing devices or clearing storage. Import replaces the current design after confirmation.

## Scale and geographic method

The author specified Hokkaido at **83,422.22 km²**, exactly **5%** of Libriam’s **1,668,444.4 km²** surface on October 12, 2026. Assuming a sphere:

- Radius: **364.376984409 km** (`sqrt(A / (4π))`).
- Diameter: **728.753968818 km**.
- Circumference: **2,289.448114713 km**.
- One equatorial degree: **6.359578096 km**.

The public-domain main-island coastline reference comes from [amay077/JapanPrefGeoJson](https://github.com/amay077/JapanPrefGeoJson), derived from [Data of Japan](https://github.com/dataofjapan/land). It is simplified, projected into a Lambert azimuthal equal-area plane around its real-world center, and inverse-projected onto Libriam. A numerical normalization makes the resulting **spherical polygon** occupy precisely the author’s stated area. We use the main-island silhouette as the fictional whole continent’s area envelope; this is not a cadastral model of the real prefecture. Nearby islands are not yet placed.

No Honshu or other Japanese continents are included. The other two confirmed great continents now have author-requested centers and generated draft silhouettes; ocean colors outside Hokkaido are an unmapped-surface treatment, not a canon assertion that the remaining 95% is ocean. The default latitude/longitude, relief, color, lighting and coordinates are visualization/design choices. No fictional city or mountain location is fabricated. Physical mass, density, gravity, atmosphere, rotation period, axial tilt, star and orbital properties remain undecided.

## Architecture and next steps

`src/model.js` holds physical dimensions, geospatial transformations, distances and the versioned project format independently of rendering. `src/main.js` manages Three.js views, navigation, local persistence and the proposed body hierarchy. `public/data/hokkaido.geojson` is the vendored reference silhouette. `tests/model.test.js` covers spherical coverage, geodesic edge cases, coordinate conversion, project round trips and invalid/cyclic hierarchies.

This foundation can expand with author-designed continents and islands, selected map assets, real height fields when available, named lore layers, a flat map view, body mass/density, rotation/tilt and time-driven orbits. Those require new design decisions and data; the current view does not imply they are settled.

## History viewer

The seven-age timeline provides **7,000 selectable design positions**, grouped into 1,000-unit viewing spans. Scrubbing is immediate; age buttons animate to memorable moments. The equal spans are an interface convention, not confirmed years or equal historical durations. Age 7 remains eternal. Click the globe to inspect and copy signed coordinates, or save the selected place as a pin.

The current visual model includes formation from nothing through magma/cloud/water, a great freshwater lake at **19.75° N, 9.98° E** and three rivers with author-confirmed outlet coordinates and proposed meanders, drying near the end of Age 2, an uneven expanding Age-3 drought, restoration in Age 4, poisoned Fallout, cleansing into Age 6, and lush perfection in Age 7. Author-specified mountain endpoints and the **17.69° N, 1.33° E** drought-edge reference are held fixed. A 24 km lake radius, contours, terrain motion, timing within viewing spans and river paths are illustrative proposals, not author-established measurements. The drought is a deterministic arrival-cost field with stronger western/ridge resistance, not a climate simulation.

The current continent designs supersede the earlier small generated shapes. **Alaska** (continent III) uses a Natural Earth Alaska reference outline, rotated **65°**, centered provisionally at **43° N, 140° W**, with **5.5%** of Libriam’s surface (**91,764.442 km²**). **New Zealand** (the working reference label for continent II) uses its main islands plus nearby islands, rotated **15°**, centered at **25° S, 124° E**, with **6.5%** (**108,448.886 km²**). Its southern coastline reaches approximately **85° S**; the pole itself remains ocean. Both are rescaled through equal-area projection and normalized on the sphere; no Earth-size distances, politics or populations are imported. The latest request supersedes the previous combined 2% design cap.

Both polar regions contain mostly frozen ocean: solid pack ice and irregular broken floes in a marginal belt around 72°–83°, becoming solid above about 87°. The ice is a visual design model, not a climate simulation or a claim about confirmed freezing dates. No new polar continents are fabricated. Polar portions of the southern continent can be snow/ice covered. North/south pole navigation buttons are in the sidebar.

[Alaska and New Zealand reference data](https://github.com/nvkelso/natural-earth-vector) is Natural Earth 1:50m, public domain. Vendored copies live in `src/data/` and `public/data/`. New Zealand’s distant dependencies are excluded. Multipart spherical polygons and date-line clipping preserve island gaps and avoid texture streaks near the poles. All three great continents are visible throughout the atlas, independently of their Age-4 discovery by Hokkaido’s inhabitants.

The project format adds an optional `timeline.frame` (0–6999) while remaining version 1. Earlier exports migrate with their pins and solar-system designs intact. Default history position: late Age 3. Timeline maps are generated once as data textures; GPU uniforms update visual state, rather than storing or generating 7,000 full images. Canon inputs are in `src/ages.js`; adapted continents are in `src/landmasses.js`; GPU rendering and river-mask construction are in `src/age-renderer.js`.

## Great rivers, lake island and inner pool

`src/hydrology.js` holds the exact river outlets: **11.37192 N, 31.43740 E**, **14.78480 N, −18.33008 E**, and **36.54197 N, −13.66136 E**. Smooth, unequal bends keep the channels on Hokkaido until their short estuaries meet the exact supplied offshore mouths. Paths are deterministic across forward/backward timeline navigation. Search finds the descriptive river-mouth labels; these are not fictional river names.

The island's two opposite edge anchors (**19.95031 N, 9.15032 E** and **19.25278 N, 11.37802 E**) imply a **14.064 km** length. Its proposed narrow outline is approximately **3.2 km wide**, enclosing a **1 km-diameter** pool at the midpoint. The **Lake island & 1 km inner pool · close-up** button flies to it. Analytical shader detail preserves the small pool beyond the base globe texture's resolution. Coordinate inspection recognizes both island and pool. The island remains present while its pool follows the existing lake's wet/dry visual timeline; earlier pool history, width and midpoint placement remain proposals. It is not Eden's Isle. The age-7/unit-6999 context does not add a new creation date.

`tests/hydrology.test.js` checks exact anchors, route continuity, meanders, inland containment, island dimensions and enclosure of the pool. River endpoints replace the first draft's automatic directions; older historical notes remain in the lore repository for attribution.

## Globe annotations

Click the **pencil** in the globe controls to enter annotation mode. **Box** samples the geographic coordinates along all four screen-space edges; **Freehand** samples a dragged outline and closes it on release. Draw a single enclosed region entirely on the visible globe, then add its note. Choose **Move globe** to rotate/zoom between drawings, then return to a drawing tool. Each annotation stores its original age and exact design unit. Numbered outlines remain attached to latitude/longitude, hide behind the globe, and are distinct from Codex's screen-annotation tool.

The annotation sidebar holds multiple drawings with editable notes and individual view/delete actions. **Cut all annotations** copies a chat-ready group containing each note, age/unit, center, approximate spherical area, date-line-aware bounds, and every sampled outline vertex as signed `[latitude, longitude]` decimal degrees. After a successful clipboard write, active drawings and notes clear. If clipboard access is blocked, selected text appears in a copy dialog; drawings clear only when the user explicitly finishes the cut. A pending cut preserves any annotation edited or added while copying.

**Recent cut groups** retains the last **10 groups**, newest first, with notes, copy-again and restore-to-active controls. Active annotations and cut history save with the existing browser-local project and travel in project JSON exports/imports. Old files migrate with empty annotations. No sign-in or server storage is required. Local preview and the hosted site have separate browser storage. The clipboard export describes proposed changes; it never automatically changes world canon.

`src/annotations.js` owns geometry, serialization, validation and cut/history state. `src/annotation-ui.js` handles pointer capture, 3D outlines, the note editor and clipboard flow. Sampled contours use up to 256 geographic vertices per drawing and groups support up to 100 annotations; this is geographic region markup, not surveyed elevation. Tests cover date-line geometry, curved-edge box sampling, small-area winding, cut retention, concurrent edits and backward-compatible project imports.

## Annotated geography refinement

The six author-supplied contours in `src/data/geography-notes.json` drive the next geography revision. `src/coast-design.js` replaces the marked overly straight stretches with deterministic, gently tapered bays and headlands, then renormalizes each spherical continent to its existing 5.5%/6.5% area. The source reference coastlines remain archived unchanged. Sidebar buttons jump to each revised coast. Eden’s Isle has a small tropical draft shoreline wholly inside the supplied box; its sidebar close-up, map label, search and coordinate inspection are available. It is a minor island in addition to the three great continents. Hokkaido’s annotated south receives jungle color, the east savanna, and the far north colder/snowy tones. These underlying designs retain the seven-age shader effects, including poisoned Fallout. Specific contours, climate transitions, and Eden’s exact size remain proposals; the author provided regions and broad terrain character.

## Name and simplified interface — latest October 12, 2026 direction

The program is now **Libriam Globe** (formerly Dragex Globe). Its default left panel contains only **Search**. Search covers the three continents, mapped islands and regions, river outlets, poles and saved named places. The Kingdom of Moana result navigates to its established lake/valley region; no surveyed country border or capital is invented. Map layers, Hokkaido placement and saved-place controls are available through the gear button. Annotation notes and the ten-group history appear only in pencil mode. Earlier project files and the existing storage key remain compatible, preserving user data. The existing hosting URL and source folder remain stable.

The author calls Hokkaido, Alaska and the New Zealand-inspired region **continents**, in the ordinary geographic sense. Eden’s Isle and the small lake island remain islands. Archival source material retains its historical wording.

## Latest continent sizes and placement

The second continent is author-named **Zealand**. Alaska now uses **77,999.7757 km² / 4.675%**, exactly **15% less area** than the previous 5.5% design. Zealand uses **54,224.443 km² / 3.25%**, exactly **half** its previous 6.5% area. Percentages refer to surface area rather than radius or linear coastline dimensions. Hokkaido is unchanged. These values supersede the older design summaries above. Search still accepts “New Zealand” as an alias for Zealand.

The preceding refined reference outlines are resized before posing, retaining their bays/headlands. `src/continent-pose.js` rotates Alaska’s mainland southward, then places its chain islands along the author-supplied open arc. Each island rotates independently on the sphere; island sizes are reduced to preserve gaps, with total area reconciled in the mainland. Alaska’s mainland center is about 21.56 N, −124.32 E, and its northern edge about 66.15 N. Its mainland is farther from both other continental centers than the preceding design. Zealand shifts south to a reference center of 40 S, 124 E, keeping a coastline near 84.5 S while leaving the south pole as ocean. These exact placements and island footprints remain proposals within the author’s directions.

## Zealand orientation revision

Zealand receives a **clockwise 90° turn followed by a north–south reflection** in a local frame at its existing 40 S, 124 E reference center. `rotateThenFlipNorthSouth` in `src/continent-pose.js` applies an orthogonal spherical transform: local east/north components swap, radial distance and spherical area stay unchanged, and all ring windings reverse to compensate for reflection. The new broadly east–west outline no longer reaches the south pole; it supersedes the older polar-reaching orientation. Its current 54,224.443 km² area and other continents are preserved. Tests verify the transformation sequence, exact area, unchanged center distances, valid winding and no continental overlaps.

## Terrain exaggeration

The gear’s **Terrain exaggeration** slider runs from **0× (flat)** to **10×**, with **1×** as the default. It scales the existing illustrative mountain ridge and Hokkaido undulations; it does not place new named mountains. The setting saves on this device and in project JSON under optional `terrain.exaggeration`; old project files default to 1×. Turning off Illustrative relief disables the slider and flattens the geometric relief without discarding its saved value.

Relief now updates the actual sphere vertex positions and normals, so raycast coordinate picking uses the raised surface. Pins, geographic lines and annotation outlines drape over it; camera clearance grows with the highest bumps. Planetary scale calculations still use the confirmed reference sphere. The settings panel leaves the globe visible while you adjust the slider. `src/terrain.js` holds the deterministic height multiplier and validation; terrain tests cover scale, flattening, history states and persistence. Exact mountain locations and elevations beyond existing anchors remain author decisions.

## Stylized water, cloud banks, and seamless loops — October 12, 2026

The author's request for a more stylized globe with close beach views adds a visual environment layer. Its wave sizes, winds, beach widths, cloud shapes, and motion are **artistic proposals**, not new physical or geographical canon. Ocean versus freshwater rendering is a visual distinction; this release does not solve salinity, buoyancy, fluid dynamics, atmospheric circulation, or rainfall.

- Water has turquoise nearshore color, wave normals, sun reflections, incoming foam fronts, receding wash, and damp sand. Lakes and the island pool use calmer ripples; drying, restoration, Fallout, polar ice, and Hokkaido submersion still govern where effects appear.
- Clouds are irregular clusters of shaded 3D puffs, with actual directional-light shadows and periodic drift and breathing. They fade as the camera approaches the surface so they do not obscure beach exploration. This is geometric stylization, not a volumetric weather solver.
- Wave motion is baked once into a 96-frame normal/height atlas with wrapped gutters and interpolated frames. Waves, shoreline foam, cloud motion, and Creation's magma all use the same **12-second periodic phase**. Interactive camera rendering continues in WebGL; no fluid solver runs each frame.
- A 4096 × 2048 signed-distance coastline atlas covers **all** current continents and Eden's Isle. At close zoom, a 1024 × 1024 local tile follows the camera. The smallest tile covers 8 km, about **7.8 m per texel**; 16-bit packed distance avoids visible distance bands. Local tiles are used below 82° latitude. Polar views retain the global ice treatment. These distances are approximate visual fields, not surveyed bathymetry.
- Source GeoJSON is the map interface. `makeEnvironment(features)` consumes current land features; `replaceMap(nextFeatures)` rebuilds global masks and invalidates the local tile. Hokkaido's existing placement editor calls this hook. Waves and clouds remain independent of coastline geometry. New lakes would need their own freshwater mask/history input; they are not inferred from color.
- Camera clearance now uses terrain below the observer, allowing an approximately 1.5 km minimum altitude above the reference sphere where terrain is flat. This is a close aerial beach view. The existing globe mesh and terrain textures still limit ground-level detail: there are no surveyed beach slopes, displaced breaking wave meshes, individual grains of sand, or underwater topography.

Open **Map settings → Living water & clouds → Explore a beach** for an Eden's Isle coastline close-up. Pause or scrub the motion loop independently of the seven-age history. **Render loop frames** freezes the selected view and age, renders **360 PNGs at 640 × 360 / 30 fps**, and downloads one ZIP with frame metadata and conversion instructions. The endpoint at exactly 12 seconds is omitted to avoid a repeated frame on playback. Rendering can be cancelled. The export captures the 3D scene, without interface overlays; project edits remain editable and can be rendered again. It does not replace the globe with a video or cache a movie for every map coordinate. Motion/layer switches are session controls; source geography, pins, annotations, and terrain settings retain their existing persistence.

`src/water-loop.js` owns map-independent wave baking and approximate signed-distance transforms. `src/environment.js` owns editable coastline textures, camera-local detail, cloud geometry, and water shader snippets. `src/loop-export.js` renders deterministic frame sequences to an offscreen target and packages PNGs into ZIP without a service or encoder dependency. `tests/environment.test.js` verifies loop endpoints and velocity continuity, atlas gutters, wrapped versus local coastline distances, map changes, cloud motion, and archive integrity.

## Author annotations — mountains and places

The October 12 annotation group (Age 2, design unit 1556) is preserved verbatim in meaning and with all 11 exact contours in `src/data/author-annotations.json`. The three thin mountain gestures are interpreted as open ridge spines; the exporter’s automatic closing edge does not create a triangular mountain plateau. Their slopes, individual peaks, foothill widths and rock/snow details are procedural proposals. **Mount Yokai** is an isolated summit at **9.191537° N, −18.750231°**, taller than the other modeled ranges and surrounded by jungle. Relative height is author-directed; the renderer’s absolute elevation is illustrative, not confirmed geological canon. The saved 0–10× terrain control also scales these mountains. Their masks affect the existing western drought resistance.

**Prairie Bridge** follows the supplied flower-field corridor beside **Grimroot Grove**. The latter uses the full drawn boundary and a dark canopy treatment. **Cloud Forest** has greener layered canopy and mist coloring. Search finds **Rootport**, **Liarsville**, **Kaldro’s Cape**, **Sapporo**, all those regions, and all three ranges. Exact coordinates are used for fly-to destinations, labels and location picking. Settlement roof/clearing textures are small artistic suggestions, not confirmed streets, buildings, inhabitants, populations or capitals.

The globe combines broad region colors visible from space with continuous geographic noise for canopy, flower patches and crags when zooming. History rendering applies lava, drought, Fallout, cleansing and Peace over these design layers. The annotation’s Age-2 viewing timestamp establishes no formation, settlement-foundation or mountain-creation date. No new ages or borders are inferred. Existing project storage, cut-history annotations and continent coastlines are preserved.

### Softer satellite-style treatment

The follow-up visual direction reduces cloud thickness by roughly two thirds, flattens and widens the banks, feathers their edges, and uses cooler whites with lighter shadows. Cloud opacity is reduced; ocean shallows and foam are less saturated and wave highlights are gentler. This tunes the existing stylized geometry toward a satellite-view appearance; it does not introduce real satellite weather data. Map rebuilding, camera-local shore detail and the 12-second loop remain available.

## Soft light and unnamed moon — October 12, 2026

Phil requested soft, even light and a relatively large unnamed moon orbiting Libriam. Neutral ambient light, hemispheric fill and a weak directional light now replace the stronger default directional lighting. The moon follows the globe's motion-loop pause/scrub controls and exported frames. Its radius of 0.32 planet radii, orbit of 2.15 planet radii, gray surface, inclination and 12-second animation cycle are visual proposals, not confirmed physical measurements or a fictional orbital period. No name is assigned.
