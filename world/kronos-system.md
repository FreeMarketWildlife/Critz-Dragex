# Kronos system — author decisions and orbital study

**Author decision:** Phil, direct globe-development request, October 13, 2026. **Numerical study:** implementation proposal, October 13, 2026. These are different evidence classes.

## Confirmed system

An **orange dwarf** is the sun. Exactly two planets orbit it: **Kronos** and **Zuhal**, both Saturn-like; Zuhal differs visually and has a complementary color to Kronos. **Libriam is a moon of Kronos**, with its own sub-satellite named **Moon** (the “moon” in ordinary usage). Zuhal has a moon with a sub-satellite; their individual names are not supplied. Phil authorizes designing their paths and appearance. There are occasional comets. No additional planets or major moons have been introduced.

Phil requests Libriam's passage through Kronos's ring/asteroid fields **every 1,000 years**. The desired recurrence is author-confirmed; its physical mechanism is unresolved. For the globe experiment only, **one age-viewing frame is treated as one year**. Actual age durations still need author decisions. The Seventh Age remains eternal; a 1,000-frame viewing window does not end it. The event is not an explanation for any novel catastrophe unless Phil separately confirms that connection.

This supersedes earlier descriptions of Libriam as an independently orbiting planet and Moon as unnamed. Libriam still names the entire inhabited world; Hokkaido is still one of its three continents. Its established dimensions and authored surface geography are unchanged. The October 12 relatively large moon remains historical evidence; the present 60 km radius is an implementation proposal needing aesthetic review.

## Proposed physical parameters

Masses, distances, colors beyond the requested complementary relationship, eccentricities and inclinations below are proposals. Centre-to-centre distances, Julian Earth years (365.25 days), gravitational constant 6.67430 × 10^-20 km³ kg^-1 s^-2. Orbital periods include both parent and child mass. Speeds are circular reference speeds, not constant velocities along eccentric ellipses.

| Body | Parent | Radius | Mass | Semimajor axis | Period | Reference speed |
|---|---|---:|---:|---:|---:|---:|
| Sun | — | 574,698 km | 0.75 solar masses | — | — | — |
| Kronos | Sun | 60,268 km | 5.683 × 10^26 kg | 0.72 AU | 257.62 days | 30.405 km/s |
| Zuhal | Sun | 55,000 km | 4.5464 × 10^26 kg | 2.40 AU | 1,567.88 days | 16.653 km/s |
| Libriam | Kronos | 364.376984 km | approximately 1.115 × 10^21 kg | approximately 2,000,161 km | 33.40192 days | 4.355 km/s |
| Moon | Libriam | 60 km | approximately 2.986 × 10^18 kg | 5,000 km | 2.977 days | 0.122 km/s |
| Zuhal's moon | Zuhal | 1,800 km | approximately 8.062 × 10^22 kg | 2,000,000 km | 37.337 days | 3.895 km/s |
| Zuhal's submoon | Zuhal's moon | 100 km | approximately 1.257 × 10^19 kg | 18,000 km | 2.394 days | 0.547 km/s |

The proposed K dwarf is 4,700 K and 0.30 solar luminosity. Kronos receives approximately 0.579 Earth insolation; this alone does not establish a habitable climate. Libriam density is provisionally 5,500 kg/m³. It implies approximately 0.057 Earth surface gravity and 0.639 km/s escape speed: its existing oceans and atmosphere are a fantasy-world assumption, not a result validated by this orbital study.

The two planets are about 17.6 mutual Hill radii apart. Kronos's pericentre Hill radius is about 5.31 million km; Libriam's orbit uses about 0.377 of it. Libriam's own Hill radius is about 16,925 km; Moon uses about 0.295. Zuhal's moon's Hill radius is about 76,348 km; its submoon uses about 0.237. All proposed pericentres pass the implemented conservative Hill screening (0.40 for ordinary moons, 0.33 for submoons) and fluid Roche checks. These bounds are estimates; nonzero eccentricity, inclination and tides matter. No N-body integration or long-term tidal evolution is performed.

The displayed Libriam period is tuned to 10,935 revolutions per provisional millennium so the scheduled event falls at an orbital node. This is a deliberately selected initial condition, not an astronomical measurement or a derived resonance with a demonstrated physical driver.

## The millennium passage: what is and is not physically supported

Saturn-like bright inner rings lie tens to hundreds of thousands of kilometres from their parent. Libriam's selected orbit is about two million kilometres out. A moon on a fixed inclined orbit crosses a continuous ring plane twice every orbit, approximately every 16.7 days here. It cannot wait a thousand years between crossings of the same continuous ring. An orbit with a thousand-year Kepler period around Saturn's mass would require approximately 985 million km, far outside Kronos's Hill sphere. Bringing Libriam through a main ring also shrinks its submoon stability region so far that the selected Moon cannot be retained.

**Implemented interpretation/proposal:** retain the bright inner rings and add an extremely sparse **outer debris annulus**, 1.93–2.07 million km from Kronos. A denser **authored debris episode** is scheduled at years 1,000, 2,000, …, 6,000 in the present viewing range, with a ±0.03-year envelope. The actual visual encounter additionally requires Libriam to be within 12,000 km of the ring plane. It passes through the annulus at the orbital node at each exact millennium. The recurrence/density envelope is a narrative scheduler, not a prediction of gravity. It does not prove a replenishment mechanism or promise impact-free passage. Rock/dust point brightness and comet tails are illustrative visibility aids.

Real diffuse outer rings and comet-fed meteor streams motivate this idea. They do **not** establish an exact thousand-year repeating debris episode. The two incidental comet ellipses in the explorer have approximately 21.4- and 42.1-year periods; they are not claimed to physically create the millennium ring.

## Sources consulted online

- [NASA: Saturn facts](https://science.nasa.gov/saturn/facts/) — gas giant/ring reference, including distant diffuse rings.
- [NASA: giant outer ring discovered](https://science.nasa.gov/missions/spitzer/nasa-space-telescope-discovers-largest-ring-around-saturn/) — outer dust ring analogue, not proof of this fictional structure.
- [NASA: Goldilocks K stars](https://science.nasa.gov/missions/hubble/goldilocks-stars-are-best-places-to-look-for-life/) — orange-dwarf stellar context.
- [Kollmeier and Raymond, Can Moons Have Moons?](https://arxiv.org/abs/1810.03304) — tidal survival restrictions.
- [Rosario-Franco et al., Orbital Stability of Exomoons and Submoons](https://arxiv.org/abs/2005.06521) — conservative Hill screening and tidal limitations.
- [Gladman, Dynamics of Systems of Two Close Planets](https://www.tat.physik.uni-tuebingen.de/~schaefer/teach/f/gladman.pdf) — mutual Hill separation criterion, with its model assumptions.
- [NASA: meteor shower environment](https://www.nasa.gov/meteoroid-environment-office/shower-meteoroid-environment/) — debris stream analogy.
- [Google Earth education navigation guide](https://storage.googleapis.com/gweb-earth-education/pdf/EN_Guide_GoogleEarthEducation3D.pdf) — globe-to-surface navigation reference.

## Editable implementation

Numerical proposals: `dragex-globe/src/orbital-model.js`. Visualization: `src/space-renderer.js`. The renderer uses one physical scale, selected-body floating origins and logarithmic depth. Guide labels remain legible when the true-sized bodies become subpixel. Scroll beyond the globe to enter space; select Libriam and zoom down to return to surface mapping. Previous device solar-system proposals are retained in the exported `legacyBodies` field when older saves migrate. Geography, pins and annotations are preserved.
