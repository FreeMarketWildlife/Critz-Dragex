# Dragex Globe

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

- Drag the globe to rotate; scroll or use +/− to zoom. Hokkaido and saved-place buttons fly to their locations. Arrow keys, +/− and Home work when the globe has focus.
- Measure: choose the ↔ tool, then click two surface points. Distances use the shortest great-circle arc on Libriam.
- Add pin: choose a surface location and give it a name. Saved pins are proposals. Search finds Hokkaido and saved locations.
- Toggle coordinates, labels, illustrative relief, lighting and rotation. Save view as PNG exports the rendered 3D scene.
- Hokkaido’s proposed position is editable in the landmass card, within ±40° latitude / ±100° longitude in this first version. Placement changes preserve area; pins retain their coordinates.
- Solar system: add and edit stars, planets and moons; choose an orbital parent and circular-orbit distance in AU. Libriam starts with no assigned star, orbit or moon. Body sizes and orbit spacing are compressed and do not share a physical scale. No gravity or orbital-period simulation is claimed.
- Export/import JSON (by file or copy/paste) preserves pins, proposed Hokkaido placement and celestial-body designs. Data saves in this browser’s local storage, not a server. Local and hosted copies have separate storage. Export before changing devices or clearing storage. Import replaces the current design after confirmation.

## Scale and geographic method

The author specified Hokkaido at **83,422.22 km²**, exactly **5%** of Libriam’s **1,668,444.4 km²** surface on October 12, 2026. Assuming a sphere:

- Radius: **364.376984409 km** (`sqrt(A / (4π))`).
- Diameter: **728.753968818 km**.
- Circumference: **2,289.448114713 km**.
- One equatorial degree: **6.359578096 km**.

The public-domain main-island coastline reference comes from [amay077/JapanPrefGeoJson](https://github.com/amay077/JapanPrefGeoJson), derived from [Data of Japan](https://github.com/dataofjapan/land). It is simplified, projected into a Lambert azimuthal equal-area plane around its real-world center, and inverse-projected onto Libriam. A numerical normalization makes the resulting **spherical polygon** occupy precisely the author’s stated area. We use the main-island silhouette as the fictional whole landmass’s area envelope; this is not a cadastral model of the real prefecture. Nearby islands are not yet placed.

No Honshu or other Japanese landmasses are included. The other two confirmed great landmasses now have author-requested centers and generated draft silhouettes; ocean colors outside Hokkaido are an unmapped-surface treatment, not a canon assertion that the remaining 95% is ocean. The default latitude/longitude, relief, color, lighting and coordinates are visualization/design choices. No fictional city or mountain location is fabricated. Physical mass, density, gravity, atmosphere, rotation period, axial tilt, star and orbital properties remain undecided.

## Architecture and next steps

`src/model.js` holds physical dimensions, geospatial transformations, distances and the versioned project format independently of rendering. `src/main.js` manages Three.js views, navigation, local persistence and the proposed body hierarchy. `public/data/hokkaido.geojson` is the vendored reference silhouette. `tests/model.test.js` covers spherical coverage, geodesic edge cases, coordinate conversion, project round trips and invalid/cyclic hierarchies.

This foundation can expand with author-designed continents and islands, selected map assets, real height fields when available, named lore layers, a flat map view, body mass/density, rotation/tilt and time-driven orbits. Those require new design decisions and data; the current view does not imply they are settled.

## History viewer

The seven-age timeline provides **7,000 selectable design positions**, grouped into 1,000-unit viewing spans. Scrubbing is immediate; age buttons animate to memorable moments. The equal spans are an interface convention, not confirmed years or equal historical durations. Age 7 remains eternal. Click the globe to inspect and copy signed coordinates, or save the selected place as a pin.

The current visual model includes formation from nothing through magma/cloud/water, a great freshwater lake at **19.75° N, 9.98° E** and three rivers with author-confirmed outlet coordinates and proposed meanders, drying near the end of Age 2, an uneven expanding Age-3 drought, restoration in Age 4, poisoned Fallout, cleansing into Age 6, and lush perfection in Age 7. Author-specified mountain endpoints and the **17.69° N, 1.33° E** drought-edge reference are held fixed. A 24 km lake radius, contours, terrain motion, timing within viewing spans and river paths are illustrative proposals, not author-established measurements. The drought is a deterministic arrival-cost field with stronger western/ridge resistance, not a climate simulation.

The current landmass designs supersede the earlier small generated shapes. **Alaska** (landmass III) uses a Natural Earth Alaska reference outline, rotated **65°**, centered provisionally at **43° N, 140° W**, with **5.5%** of Libriam’s surface (**91,764.442 km²**). **New Zealand** (the working reference label for landmass II) uses its main islands plus nearby islands, rotated **15°**, centered at **25° S, 124° E**, with **6.5%** (**108,448.886 km²**). Its southern coastline reaches approximately **85° S**; the pole itself remains ocean. Both are rescaled through equal-area projection and normalized on the sphere; no Earth-size distances, politics or populations are imported. The latest request supersedes the previous combined 2% design cap.

Both polar regions contain mostly frozen ocean: solid pack ice and irregular broken floes in a marginal belt around 72°–83°, becoming solid above about 87°. The ice is a visual design model, not a climate simulation or a claim about confirmed freezing dates. No new polar continents are fabricated. Polar portions of the southern landmass can be snow/ice covered. North/south pole navigation buttons are in the sidebar.

[Alaska and New Zealand reference data](https://github.com/nvkelso/natural-earth-vector) is Natural Earth 1:50m, public domain. Vendored copies live in `src/data/` and `public/data/`. New Zealand’s distant dependencies are excluded. Multipart spherical polygons and date-line clipping preserve island gaps and avoid texture streaks near the poles. All three great landmasses are visible throughout the atlas, independently of their Age-4 discovery by Hokkaido’s inhabitants.

The project format adds an optional `timeline.frame` (0–6999) while remaining version 1. Earlier exports migrate with their pins and solar-system designs intact. Default history position: late Age 3. Timeline maps are generated once as data textures; GPU uniforms update visual state, rather than storing or generating 7,000 full images. Canon inputs are in `src/ages.js`; adapted continents are in `src/landmasses.js`; GPU rendering and river-mask construction are in `src/age-renderer.js`.

## Great rivers, lake island and inner pool

`src/hydrology.js` holds the exact river outlets: **11.37192 N, 31.43740 E**, **14.78480 N, −18.33008 E**, and **36.54197 N, −13.66136 E**. Smooth, unequal bends keep the channels on Hokkaido until their short estuaries meet the exact supplied offshore mouths. Paths are deterministic across forward/backward timeline navigation. Search finds the descriptive river-mouth labels; these are not fictional river names.

The island's two opposite edge anchors (**19.95031 N, 9.15032 E** and **19.25278 N, 11.37802 E**) imply a **14.064 km** length. Its proposed narrow outline is approximately **3.2 km wide**, enclosing a **1 km-diameter** pool at the midpoint. The **Lake island & 1 km inner pool · close-up** button flies to it. Analytical shader detail preserves the small pool beyond the base globe texture's resolution. Coordinate inspection recognizes both island and pool. The island remains present while its pool follows the existing lake's wet/dry visual timeline; earlier pool history, width and midpoint placement remain proposals. It is not Eden's Isle. The age-7/unit-6999 context does not add a new creation date.

`tests/hydrology.test.js` checks exact anchors, route continuity, meanders, inland containment, island dimensions and enclosure of the pool. River endpoints replace the first draft's automatic directions; older historical notes remain in the lore repository for attribution.
