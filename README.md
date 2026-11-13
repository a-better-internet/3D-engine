# 3D Engine — a hand-off engine for walkable worlds

A first-person world engine for the browser, built on three.js r128, extracted
from the **Rest Area** world (a walkable I-79 rest stop) so that new worlds can
be built on everything that world worked out: how the ground, the woods and
the sky are drawn; layered lighting with a real day/night cycle and the moon in
its true phase; weather, power cuts and underground light; buildings with real
openings, doors and liners; people who sit, walk, talk, fish and play fetch;
dogs and cats; drivable cars; synthesised sound; a graphics menu that keeps it
smooth on an integrated GPU; and the tools that test it all.

Open `index.html` in Chrome. There is no build step, no server and no asset
files. Every texture is painted on a canvas at load time, every model is built
from code and every sound is synthesised. The only download is three.js r128
from cdnjs. The page that opens is **Pine Hollow**, the engine's demo world,
which uses every system; it is the best example to copy from.

## Pine Hollow (the demo world)

A village green in a clearing in the woods: a brick general store with its
lot and cars you can drive, a cabin, an open pavilion with picnic tables, a
pond with a jetty and a man fishing off it, a fire ring that is lit after
dark, lamp posts, benches, a hedge and a flower bed with butterflies, big
trees on the green with squirrels in them, and the woods all round, walkable
for a couple of hundred metres and then a canopy over the hills to the
horizon. Under the stone bothy there is a root cellar down a stair, lit the
same at noon and midnight. A track runs out east to an old quarry, and a
path into the woods.

People: a man reading on a bench, two neighbours talking outside the store
with their coffee, a jogger round the green, a woman walking her dog, the
shopkeeper on the phone behind his counter, a couple at a picnic table, a
man throwing a ball for his lab, and two by the fire after dark. Pets: Rufus
follows you (K sends him off to play or calls him to heel), a little terrier
comes to say hello, a husky lies in the shade, and the store cat wanders
round the bothy.

## Controls

| | |
|---|---|
| Walk · run · sprint | `W A S D` · `Shift` · `Q` |
| Look | mouse (click for pointer lock), or drag |
| Door · drive · use | `E` |
| Sit / stand | `C` |
| Drone | `F` (fly `WASD`, up `Space`, down `Shift`) |
| Flashlight | `L` |
| Nightfall · midday · scrub time | `N` · `M` · `[` `]` |
| Summer / autumn | `Y` |
| Rain and fog · storm · power cut | `R` · `T` · `P` |
| Sound | `U` |
| Plan view · HUD | `O` · `H` |
| Graphics settings | `G` |
| Warp list (testing) | `` ` `` |
| Call the dog (demo) | `K` |

## What the engine does

- **Rendering** (03): a tone curve with a soft shoulder, pale colours eased in
  full sun, the sun's shadow fading out at its map's rim, ground mist in the
  fog itself, aerial perspective (far hills go blue-grey), an optional heavy
  gloom fog, a field of view that never stretches, a high-performance GPU
  request with an integrated-chip first run at Medium and AUTO resolution.
- **Terrain** (04): a height field you supply, drawn as nested LOD rings that
  share their borders (no cracks), holed for basements, a lawn shader with
  mown stripes, swells and hummocks lit per pixel.
- **Sky and the day** (05): a painted dome, four layers of stars and the Milky
  Way wheeling with the clock, the moon in its real phase lit from the sun's
  side, cumulus / alto / cirrus decks, birds and a soaring bird, moths at the
  lamps; one clock (DayNight) driving sun, sky, fog, every lamp and glow.
- **Woods** (07): instanced trees of a dozen kinds in 96 m chunks with near
  and far sets, wind, autumn colour, a canopy shell over the far hills, a
  curtain at the walkable zone's edge, logs and rocks.
- **Lighting** (09, 16): the sun/moon key, a sky fill that dims indoors, a
  pool of real point lights moved onto the nearest lamps, glowing materials
  for the rest; lamps on power circuits; underground light held at a fixed
  level (06's addBuried).
- **Weather** (16b): clear, overcast, rain, fog banks, thunderstorms with
  lightning and thunder at the speed of sound, a cloud deck, rain that stops
  under roofs, wet paving, power cuts with emergency lights.
- **Collision and walking** (06, 17): AABB and turned-box colliders on a grid,
  plates and ramps you stand on, voids under the ground, zones, seats, uses,
  ladders, doors that open as you come up (or latch), the drone.
- **Building kit** (09): a palette of materials and the polygon-offset
  ladder, walls in pieces round their openings with liners and frames, a
  world-coordinate wall kit for anything far from the origin, windows,
  gable and flat roofs, and `building()` for a whole building in one call.
- **People** (14b, 14q): one skinned mesh each on eleven bones, built from
  plain shapes in any look; walk, sit, stand, phone, read, smoke, and twenty
  jobs; an idle that keeps them alive; drinks that stay upright in the hand;
  crowds shown near you, walkers that steer round everything.
- **Pets and critters** (14t, 14c): dogs and cats that follow, wander, greet
  you, lie in the shade, chase each other and play fetch; butterflies,
  squirrels that bolt up a tree, dawn and dusk mist.
- **Vehicles** (10a, 10b, 11): lofted car and truck shells with a finish per
  part, cars you can drive anywhere (rigid body, four springs, a bicycle
  model), headlights.
- **Water** (14u): rippled, reflective water with wakes.
- **Smoke, sparks, fire, glass** (14a, 13, 16d): one draw for every puff and
  every spark, campfires, and every pane of glass breakable.
- **Sound** (06b): wind, birds, crickets and katydids, rain, thunder, the
  hum indoors, positional sources, and a library of one-shots, all
  synthesised.
- **HUD and settings** (02b, 18, 18c): compass, clock, location, season and
  weather, the plan, toasts and prompts; a graphics menu (resolution with
  AUTO, frame cap, shadows, draw distance, light count, antialiasing, meter).
- **Hooks** (00): a world's keys, look, step, camera, frame, atmosphere,
  sky and overlay plug in without editing the engine.

## Layout

```
index.html            the demo's page: the world's config, the engine, the world's files, the engine's finish
starter.html          the smallest world worth walking in: copy it and starter/ to begin a new one
engine/               the engine (world-agnostic), numbered in load order
world/                Pine Hollow, the demo world
starter/              the starter world (two files)
tools/                headless tests: walk, shot, zfight, signaudit, globals
docs/ARCHITECTURE.md  load order, the frame, the registries, the hooks
docs/WORLD-GUIDE.md   making a world, step by step
docs/API.md           every public function
CLAUDE.md             the standing rules for working on the engine and its worlds
```

## Making a world

Start from `starter.html` and `starter/` (a clearing in the woods, a hut, a
lamp, a bench, a person and a dog, in about forty lines), and read
`docs/WORLD-GUIDE.md`. In short: a `var WORLD={...}` config before the
engine; then your files call `Terrain.define` + `buildTerrain(terrainRings(...))`,
`FOREST.wild/canopy/bounds`, `waterPlane`, `building(...)`, props, `crowdGroup`
/ `crowdAdd`, `PETS.add`, `warpTo`, and hooks for anything of your own; then
the engine's finish bakes it and runs it.

## Tools

```bash
npm pack three@0.128.0 && tar xzf three-0.128.0.tgz package/build/three.min.js && mv package/build/three.min.js tools/
```

```bash
NODE_PATH=/opt/node22/lib/node_modules node tools/walk.js
```

```bash
NODE_PATH=/opt/node22/lib/node_modules node tools/shot.js shots.json shots 1280 720
```

```bash
node tools/globals.js
```

See CLAUDE.md's Tools section for each one.

## Not extracted (yet)

Some of Rest Area's systems were built for that one place and stay there,
though each could become an engine module the same way: the interstate's
traffic loop and its ramp paving and markings (`rampPave`, `interstateEdges`),
the outboard pontoon boat and its docking, the house generator that lays out
Lake Street's houses and their rooms, the arcade cabinet framework and its
games, the TV screens and vending machines, and zombie mode. The hooks those
used are all in the engine (`key`, `look`, `fixed`, `camera`, `atmos`, `sky`,
`render`, `TIME_SCALE`, `GLOOM_U`, `GLASS`, `CAR_BEAMS_BORROW`), so a world
that wants one can bring it over without touching the engine.

## Where it came from

The engine is the Rest Area world's (itself grown from the "Low Desert"
engine of an earlier motel world), with everything that belonged to that one
place taken out and replaced with the general mechanism it stood for: its
interstate's paving became `PAVE_FNS`, its zombie mode's hooks became the
engine's hook lists, its rings of ground became `terrainRings`, its custodian's
and townsfolk's crowds became `crowdGroup`, its dog park's dogs became `PETS`.
The Rest Area repository itself was not changed.
