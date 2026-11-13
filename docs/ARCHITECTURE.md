# Architecture

How the engine is put together: the load order, what happens in a frame,
the registries a world pushes into, and the hooks it plugs into.

## No build step

Every file is a classic `<script>` sharing one global scope. `index.html`
lists them in order and the order is load-bearing: each file runs its top
level as it arrives, so it can use anything defined by a file before it and
nothing after it *at load time* (a function body may call anything, because
it runs later). ES modules would not load from a `file://` page, and a world
is meant to open by double-clicking `index.html`. The only download is
three.js r128 from cdnjs (and two Google fonts, optional).

There are no asset files. Every texture is painted on a canvas at load
(02-textures, and each world's own), every model is built from code, every
sound is synthesised (06b-audio).

## Load order

```
world/00-world.js            var WORLD = {...}      the world's config: plain data only

engine/00-config.js          CFG = WORLD over ENGINE_DEFAULTS; SPAWN, EYE, PLAYER_R, GROUND_EDGE, STEP_UP;
                             SLOT/IMAGES; HOOKS, onHook, onFrame, runHooks, runHookUntil
engine/01-helpers.js         T, V3, clamp/lerp/smoothstep, rnd/rr/pick/hash2; geometry makers (boxGeo, rboxGeo,
                             blobGeo, rockGeo, planeGeo, discGeo, cellGeo, puddleGeo, FaceGeo, prismGeo); paths
                             (smoothPath, pathAt, distToPath, ribbonGeo); mergeEntries; BUCKETS (bucketOf, push, bx,
                             cyl, tube, wallBox) and bakeBuckets; sdPaveGeo; detailMesh; XF/lbx/lcol/lwall; doors
                             (makeDoor, latchDoor, makeLiftDoor); GLASS_PANES; registries ANIM GLOW DOORS LAMPS NEON
engine/02-textures.js        TEX.* (asphalt, road, concrete, brick, siding, shingle, quarry, ytile, mosaic, block,
                             drywall, ground, lawn, riverRock, crushed, mulch, wood, enamel, galv, brushed, rubber,
                             chain, rock, cork, soot, haze); fitText, fitHwy, signTex, signPanel, rrect, drawISA
engine/02b-ui.js             the page's styles and HUD elements (only those the page does not already have)
engine/03-scene.js           GFX settings (localStorage), renderer, GPU tier, the shader patches (tone curve,
                             pale-colour ease, shadow edge fade, ground mist MIST_U/MIST_C, aerial haze HAZE_U,
                             gloom GLOOM_U), scene, camera, ortho, hemi/amb fill, the torch, the sun/moon key
                             and its shadow camera (setShadowLevel, keyShadow)
engine/04-terrain.js         Terrain (noise, natural, boxDist/boxSD, toward, gradePath, define, siteDist/pathDist/
                             clearDist/lakeSD), terrainRings, buildTerrain, the lawn shader, groundAt
engine/05-sky.js             sky dome, stars + Milky Way, MOON (real phase), sun and moon sprites, clouds (cumulus,
                             alto, cirrus), birds, a soaring bird, DayNight (the clock), moths, GLOW_TEX
engine/05b-reflect.js        ENV (outdoor and room reflection maps), envOut, envIn
engine/06-collision.js       COL, COL_DYN, COL_TRAF, KEEP_OFF; SURF (addFlat, addRamp, addFlatOB); ZONES (addZone,
                             zoneAt, indoorsAt); VOIDS; BURIED (addBuried, buriedShare); ROOF_EXTRA (addRoof);
                             SEATS (addSeat); USES (addUse); LADDERS (addLadder, roofLadder, roofUnit); paving
                             (addPaveRect, addPaveRaster, addPaveRibbon, PAVE_FNS, pavedY, groundY); surfaceY,
                             blocked, edgeWall; the collider grid and the rect grids
engine/06b-audio.js          AUDIO: the synthesised ambience, AUDIO.source (positional loops), AUDIO.blip
engine/06c-warp.js           WARPS, warpTo, WARP (the testing list, backquote)
engine/07-forest.js          FOREST: species and the foliage atlas, plant / wild / understory / floor / row,
                             canopy (the shell and the curtain), bounds (the world's edge walls), seasons, WIND_U
engine/09-building.js        the bucket palette and the polygon-offset ladder; glowMat, emitMat, basicGlowMat;
                             runX/runZ, lineX/lineZ, floorAt, ceilAt, frameX/frameZ, wallSign; the world-
                             coordinate wall kit (pieces, vslab, vliner, wall, liner, face); windowAt; gableRoof,
                             gableEnds, flatRoof; building()
engine/10a-vehicles.js       vehicle shells (lofted), VEH_MAT, CAR_PAINTS, vehicleParts, WHEEL_POOL,
                             buildVehicleMesh, standingVehicle
engine/10b-cars.js           CARS, CARC, parkCar (drivable), updateParkedLOD, TRAFFIC
engine/11-driving.js         the rigid-body car (CarBody, Vehicle), updateCars, enterCar/exitCar, headlights
engine/13-props.js           lampPost, picnicTable, parkBench, swingCan, campfire (+ FIRES, updateFires),
                             paveRect, layRibbon, stripe
engine/14a-smoke.js          PUFFS and SPARKS (one draw each), _cloud, updatePuffs
engine/14b-people.js         buildPerson, randomPerson, poseP, _idle, levelHeld, cigarettes, buildDog, PEOPLE,
                             _hitAt (keeping clear), _stepWalker, stepPerson, npcNearDoor
engine/14c-critters.js       CRITTERS (butterflies, squirrels, the mist), updateCritters
engine/14q-crowd.js          CROWD: crowdGroup, crowdAdd, crowdHold, crowdProp, crowdRound, _armTo, updateCrowd,
                             WATER_Y
engine/14t-pets.js           makeDog, makeCat, poseDog, petSteer, PETS (follow, wander, lie, sit, chase, fetch)
engine/14u-water.js          waterPlane, WATER (ripples, wakeDrop)

world/01-...                 the world: Terrain.define + buildTerrain(terrainRings(...)), FOREST..., buildings,
                             props, crowds, pets, warps, routes — anything, in any number of files

engine/15-bake.js            FOREST.finish(), BAKED=bakeBuckets(scene), buildColGrid()
engine/16-lighting.js        LIGHT_POOL (setLightCount), FLICKER, updateLights
engine/16b-weather.js        WEATHER (kinds, scheduler, temp), GRID (power circuits, circLevel), DECK (cloud
                             deck), RAIN (with roofs), splashes, FOGBANKS, lightning (strike, BOLT), emergencyLight,
                             WET_MATS
engine/16d-glass.js          GLASS (crack, shatter, blast, mend every baked pane)
engine/17-player.js          keys, look, player, fixedUpdate (walking), seats, uses, doors (updateDoors and the
                             prompt), ladders (climbOn, climbStep), the drone
engine/18-hud.js             the compass, clock, location, season, weather, toast(), placeName, the plan
engine/18c-settings.js       the graphics menu (G), GFX_PRESETS, applyGraphics, AUTO resolution, cullBaked, the meter
engine/19-loop.js            the anisotropy pass, runHooks("build"), the warm-up (gfxWarm), begin(), the wind,
                             frame(), window.ENGINE (= window.REST, for the tools)
```

## A frame

`19-loop.js`'s `frame()` runs on every animation frame (capped by the
frame-rate setting):

1. **Simulation, fixed 1/60 s steps.** `acc += delta × TIME_SCALE.v`; for each
   whole step: the drone, or `fixedUpdate` (hooks `fixed` first, then the car
   you drive, a ladder, a seat, or walking with its collision response). Then
   `updateDoors` (and the centre prompt).
2. **Wind** (`Wind.gust`), into the trees' and the water's shaders.
3. **Camera.** A `camera` hook, the drone's chase view, the car's, or your
   eyes (`EYE` over your feet), eased down from a chase view over half a
   second. `CAM_SHAKE.v` shakes it.
4. **The torch** follows the eye.
5. **Day and night.** `DayNight.tick` → `updateWeather` (the scheduler,
   lightning, thunder, the power) → `DayNight.paint` (the sky's gradient,
   with the weather and any `sky` hook painting over it) → the sun and moon
   placed, the key light's direction, colour and strength, its shadow
   camera snapped to texels round you; stars, the Milky Way, the moon's
   phase; the hemisphere fill; indoors dims the sky's share; the fog's
   colour and distances; `applyWeather` (cloud cover, fog, rain, wet
   paving); the haze tint; **underground** (`buriedVolAt`): the fill held at
   `UNDER_LIGHT`, eased in; the draw distance pulls the fog in; `atmos` hooks.
6. **Artificial light.** Every `GLOW` material ramps with darkness (and its
   circuit); NEON and emergency lights; `updateLights` moves the light pool
   onto the nearest lamps.
7. **Level of detail.** `FOREST.update` (near/far sets per chunk), `cullBaked`
   (tiles past the draw distance), clouds, the wheel pool, parked cars' LOD,
   the reflection maps' strength, the curtain's light, birds, the soaring
   bird, moths.
8. **Life.** `updatePuffs`, `updateCritters`, `updateCrowd`, `PETS.update`,
   `GLASS.update`, then every `frame` hook (each in its own try), `AUDIO.update`,
   animated textures.
9. **HUD.** Car lights, `updateHUD`, `drawPlan`, `updateSettings` (meter, AUTO).
10. **Draw.** The plan's ortho camera, or the main camera, then `render` hooks.

## Registries

Everything a world adds is a plain object pushed into a list. They only ever
grow while the world builds.

| List | Added with | Read by |
|---|---|---|
| `BUCKETS` | `bucketOf`, `push`, `bx`, `cyl`, `tube`, `wallBox`, `lbx` ... | 15-bake (merged per 96 m tile, thin boxes grown) |
| `COL` | `addCol`, `addColOB`, `lcol`, `wallBox` | walking, cars, people, pets (grid built at 15) |
| `COL_DYN` | push a box you move | the same, every frame, no grid |
| `SURF` | `addFlat`, `addRamp`, `addFlatOB` | `surfaceY` |
| `ZONES` | `addZone` (`indoor` true for a roofed room) | HUD, rain, light, audio, mist |
| `VOIDS` | `addVoid` | `surfaceY` (under the ground) |
| `BURIED` | `addBuried` | 19-loop and 16 (underground light) |
| `ROOF_EXTRA` | `addRoof` | the rain |
| `SEATS` | `addSeat` | C to sit |
| `USES` | `addUse` (`.game` for ENTER, `.pri` before a car) | E |
| `DOORS` | `makeDoor`, `makeLiftDoor`, `latchDoor` | `updateDoors` |
| `LADDERS` | `addLadder`, `roofLadder` | E, W/S |
| `LAMPS` | push `{x,y,z,color,intensity,dist,...}` | the light pool (16) |
| `GLOW` | `glowMat`, `emitMat`, `basicGlowMat` | 19-loop (ramp with darkness) |
| `NEON` | push a mesh | 19-loop (brighter after dark) |
| `PAVED_RECTS`, `PRASTS`, `PAVE_FNS` | `addPaveRect`, `addPaveRaster`+`addPaveRibbon`, push a function | `groundY` |
| `KEEP_OFF` | push a box | people (a flower bed) |
| `PLAN_LAYERS` | push `(ctx, px, pz, S)=>{}` | the plan (18) |
| `WARPS` | `warpTo` | the warp list, walk.js |
| `CROWD.groups` | `crowdGroup`, `crowdAdd` | `updateCrowd` |
| `PETS.list` | `PETS.add` | `PETS.update` |
| `FIRES` | `campfire` | `updateFires` |
| `AUDIO.sources` | `AUDIO.source` | `AUDIO.update` |
| `GLASS_PANES` | anything in the `glass` / `tint` buckets | `GLASS` |
| `TRAFFIC`, `COL_TRAF` | a world's moving traffic | cars you drive |

## Hooks

`onHook(name, fn, order)` (00). Lower `order` runs first.

| Hook | Signature | Semantics |
|---|---|---|
| `key` | `(e) → bool` | keydown, before the engine's keys; true takes the key |
| `keyup` | `(e)` | every keyup |
| `look` | `(dx, dy) → bool` | mouse/touch look; true takes it |
| `lookScale` | `() → number` | multiplies look speed |
| `wheel` | `(e) → bool` | true takes the wheel; otherwise it zooms |
| `fixed` | `(dt) → bool` | start of every 1/60 step; true: the player does not move |
| `camera` | `(dt) → bool` | true: this hook placed the camera |
| `interact` | `() → bool` | E, before cars, doors and uses |
| `prompt` | `() → string` | the centre prompt; `"-"` hides it |
| `frame` | `(dt, now, dark, dn)` | every drawn frame (`onFrame`) |
| `atmos` | `(dt, dn, under)` | after the haze: a mode's own fog (`GLOOM_U`) |
| `sky` | `(img, day, set, night)` | repaint the sky's gradient stops |
| `render` | `()` | after the main draw (an overlay scene) |
| `build` | `()` | once, after the bake, before the warm-up |
| `start` | `()` | once, when the player clicks in |
| `placeName` | `(x, z) → string` | the HUD's location when no zone names it |

## Coordinates and frames

Metres; +y up; +x east; +z **south**. Yaw 0 looks down −z (the compass's
north). A group's `rotation.y = t` sends a local offset (dx, dz) to
(dx·cos t + dz·sin t, −dx·sin t + dz·cos t); `XF(ox, oz, ry)` (01) gives a
frame whose `x(lx,lz)` / `z(lx,lz)` do this, and `lbx` / `lcol` / `lwall`
build in it. A vehicle is modelled in its own space with +z forward.

## Performance model

- Static geometry is merged by material into a few meshes per 96 m tile
  (buckets) and per 64 m tile (`detailMesh`), culled by the camera and past
  the draw distance (18c).
- Trees are instanced per 96 m chunk with a near and a far set (07).
- One shadow-casting light (the sun or moon), its map following you in whole
  texels and fading out at its rim (03). Shadow levels in the menu.
- A pool of `GFX.lights` point lights is moved onto the nearest lamps each
  frame; everything else glows (16). The pool never changes size in play.
- Every material is compiled, and every mesh and texture sent to the card,
  once at load behind the boot card (`gfxWarm`, 19).
- Resolution AUTO (18c) lowers the pixel ratio when frames run long because
  of the card, and raises it again when there is room.
