# Making a world

A step-by-step guide to building a new world on the engine, from an empty
folder to people walking their dogs at dusk. Every snippet here is real API;
the demo world (`world/`) does all of it, and is the best example to copy
from. For every function's full signature see `docs/API.md`.

## 0. Start a world

Copy the repo (or add a folder), and make a page that loads:

1. your world's config (`world/00-world.js`, plain data),
2. the engine's systems (`engine/00-config.js` … `engine/14u-water.js`),
3. your world's files, in the order they need each other,
4. the engine's finish (`engine/15-bake.js` … `engine/19-loop.js`).

`index.html` is exactly this; copy it and change the `world/` lines. Open it
in Chrome (double-click; there is no server or build). `G` opens the
graphics menu; the backquote key opens the warp list.

**Global names.** Every script shares one scope. A top-level `const look`
in your world collides with the engine's `function look` and stops the page.
Keep helpers inside a block `{ ... }` or an IIFE, or prefix them, and run
`node tools/globals.js` to list any name declared twice.

## 1. The config: `var WORLD = {...}`

Everything is optional; see `ENGINE_DEFAULTS` in `engine/00-config.js`.

```js
var WORLD={
  name:"HARBOUR TOWN", storageKey:"harbour",          // localStorage prefix for settings
  seed:7, spawn:{x:0, z:20, yaw:0},                   // yaw 0 looks north (−z)
  groundEdge:{x0:-2400, x1:2400, z0:-2400, z1:2400},  // the ground's outer edge; the haze closes over it
  day:{duration:1200, startHour:8, sun:{summer:[5.5,21], autumn:[7,18.5]}},
  sky:{daySkyTop:0x3366aa, setSkyLow:0xe8905c},       // any of DayNight.P's colours
  fog:{near:160, far:1300}, climate:{summer:[60,82], autumn:[42,60]},
  weather:{auto:true, outages:true}, season:"summer",
  plan:{x0:-300, x1:300, z0:-300, z1:300}, planLabel:"HARBOUR",
  hud:{title:"HARBOUR TOWN", subtitle:"a fishing village"},
  boot:{title:"HARBOUR TOWN", subtitle:"…", go:"CLICK TO START", toast:"N FOR NIGHTFALL"},
  edgeMessage:"THE CLIFFS ARE TOO STEEP TO CLIMB",
  ui:{sign:"#1d3a5a", blue:"#3a5a8a"},                // the HUD's colours
  envPainter:(x,W,H)=>{ /* paint an equirect sky+ground for reflections */ },
  extraKeys:[["Call the dog","<kbd>K</kbd>"]],        // more rows on the controls card
};
```

## 2. The ground

Tell the terrain how high the ground is, where the clearings are and where
the water is, then build the rings.

```js
const SQUARE={x0:-60, x1:60, z0:-50, z1:50};
Terrain.define({
  natural:{cx:0, cz:0, calm:600, rim:1200, grain:0.7},   // rolling country, quieter near (cx,cz)
  height(x, z){
    let h=Terrain.natural(x, z);
    h=Terrain.toward(h, 0, Terrain.boxDist(SQUARE, x, z), 0, 40);   // graded level, eased out over 40 m
    h=Terrain.gradePath(h, ROAD, x, z, 4, 10);                       // a road (smoothPath with y) cut in
    return h;
  },
  clear:(x, z)=>Terrain.boxSD(SQUARE, x, z),      // signed distance to the clearings: woods where it is > 0
  path:(x, z)=>Terrain.pathD(TRAIL, x, z, 20)-1.2, // narrow ways that must stay open
  water:(x, z)=>Math.hypot(x-40, z-30)-15,        // signed distance to a shore (negative over the water)
  tint:null, lawn:null,                            // or your own ground colour / lawn functions
});
const RINGS=terrainRings({cx:0, cz:0,
  levels:[{cell:2, half:272}, {cell:8, half:900}, {cell:16, half:1700}],
  holes:{2:[{x0:-60, x1:-52, z0:-40, z1:-32, bare:true}]}});   // a basement, on the 2 m lattice
buildTerrain(RINGS);
```

`terrainRings` snaps every box to the next coarser ring's lattice so the
rings share their border nodes (no cracks). A hole must be on its own ring's
lattice. Never change `height()` after this: `groundAt` remembers corners.

## 3. Woods

```js
const WOODS={x0:-256, x1:256, z0:-256, z1:256};   // the walkable woods (on the 8 m lattice)
FOREST.setZone(WOODS);                            // trees in here get trunk colliders
FOREST.wild(WOODS);                               // hardwoods, hemlock in the damp, pine in clumps, edge trees
FOREST.understory(WOODS, {density:0.7});          // saplings, shrubs at the edges, ferns
FOREST.floor(WOODS, {density:0.7});               // logs, stumps, rocks (with colliders)
FOREST.plant("lawn", 10, 20, {scale:1.1, col:true});    // one tree on a lawn, solid
FOREST.row(-40, -46, -6, -46, {sp:["shrub"], spacing:2.2, col:false});   // a hedge
const R8=RINGS.find(r=>r.cell===8), R32=RINGS.find(r=>r.cell===32);
FOREST.canopy([{box:R8, cell:8, holes:[WOODS]}, {box:R32, cell:32, holes:[R8]}], {curtain:WOODS});
FOREST.bounds(WOODS, {inset:22});                 // the world's edge: walls you cannot pass
```

Species: `hard`, `edge`, `beech`, `hemlock`, `pine`, `sapling`, `lawn`,
`spruce`, `shrub`, `bush`, `fern`. Add your own with `FOREST.addSpecies`
(see 07's header). `Y` switches summer and autumn.

## 4. Water

```js
waterPlane({x0:22, x1:58, z0:12, z1:48, y:-0.35});   // over a basin the height function carved
// the shore: a low wall of colliders a step short of the water, open where a jetty goes out
```

The terrain's `water()` signed distance feeds the ground's colour, the mist,
the HUD ("ON THE WATER") and keeps crowds out. `WATER.wakeDrop(x, z, s)`
makes a ring of waves (a boat drops one every metre behind it).

## 5. Buildings

The quick way is `building()`: walls with their openings, liners, a floor,
a ceiling, a roof, an indoor zone and ceiling lamps, in one call.

```js
const SHOP=building({
  x0:-30, x1:-14, z0:-32, z1:-22, floor:0.15, height:3.4, t:0.3,
  outer:{bk:"brick", color:BRICK}, inner:{bk:"plaster", color:"#ece4d2"},
  floorMat:{bk:"quarry"}, ceiling:{bk:"plaster"},
  openings:[
    {side:"s", at:8, door:"store", label:"THE SHOP DOOR"},              // door styles: store vision steel gate stall closet
    {side:"s", at:3.6, window:true, w:2.6, sill:0.7, head:2.4},
    {side:"n", at:12, door:"steel", label:"THE BACK DOOR", latch:true},  // stays as you leave it, solid while shut
  ],
  roof:{kind:"gable", along:"x", ridge:6.4, bk:"shingle", ends:{bk:"siding", color:CREAM}},
  name:"THE SHOP", lamps:3,
});
```

Grade the ground under it to the floor. For anything more (an L-shaped
plan, two storeys, a stairwell), use the kit underneath: `wall()` / `liner()`
(world coordinates, any distance from the origin), `runX` / `lineX`,
`floorAt`, `ceilAt`, `frameX`, `windowAt`, `gableRoof`, `gableEnds`,
`flatRoof`, `makeDoor`, `latchDoor`, `makeLiftDoor`, and `addFlat` /
`addRamp` for what you stand on. Every static piece goes in a bucket:
`bx(bucket, w, h, d, x, y, z, uv, ry, color)`, `cyl(...)`, `push(bucket,
geometry, x, y, z, ry, color, rx, rz)`. Colliders: `addCol(x0,x1,z0,z1,y0,y1)`.

**The rules** (CLAUDE.md): nothing coplanar (lift things 5 mm, let trim
stand proud, check with `tools/zfight.js`); flat layers on the polygon-offset
ladder; sign text with `fitText`; lights never added or removed in play.

## 6. Underground

A cellar, a basement, a tunnel (world/03-cellar.js):

```js
// 1. hole the ground over it (terrainRings' holes, on the ring's lattice, bare:true)
// 2. build its floor, walls and ceiling; cover the hole's edges with the building above
addVoid(x0, x1, z0, z1, floorY-0.5, groundFloorY-0.01, floorY);   // stand on its floor, not the ground over it
addZone(x0, x1, z0, z1, floorY-0.5, ceilingY, "THE CELLAR", true);
addBuried(x0, x1, z0, z1, floorY-1, ceilingY+1, 0.5);              // the room: a fixed dim fill, no clock
addBuried(sx0, sx1, sz0, sz1, -1.6, 2.2, 0.55, null, [topEyeY, bottomEyeY]);   // the stair: by degrees
LAMPS.push({x, y, z, color:0xffd8a0, intensity:0.9, dist:9, under:true});        // under lamps only
```

## 7. Light

- **Lamps**: `LAMPS.push({x, y, z, color, intensity, dist, decay, indoor, fire,
  under, circ, mod, vol, flicker, mothy})`. The nearest `GFX.lights` of them
  are real lights each frame; draw the fitting itself with a glowing bucket
  (`lamplens`, `tube`, or your own `emitMat`).
- **Glows**: `glowMat(opts, kind, circ)` / `emitMat(color, intensity, kind,
  circ)` / `basicGlowMat(...)`: kind `"warm"` (after dark), `"indoor"` (all
  day), `"always"`.
- **Props**: `lampPost(x, z, h)` (a lamp, a pool of light, moths),
  `campfire(x, z, scale, always)`, `emergencyLight(x, y, z, ry, vol)` (only
  when the power is out).
- **Power**: lamps and glows on a circuit (`circ`, "main" by default) go out
  when `GRID.trip()` is called (P, or a close lightning strike).

## 8. Props and paving

`lampPost`, `picnicTable`, `parkBench`, `swingCan`, `campfire`; `paveRect(
bucket, x0, x1, z0, z1, color, y)` (registers the surface), `stripe(...)`,
`layRibbon(bucket, path, o0, o1, yOff, uv, color)` + `addPaveRaster` /
`addPaveRibbon` for curved paving, `sdPaveGeo(sdUnion([...]), ...)` for one
seamless piece of paving made of several shapes. Signs: `signTex(w, h,
draw)` with `fitText` inside, then `signPanel(w, h, tex, x, y, z, ry)`.

## 9. People

```js
const G=crowdGroup("the square", 0, 0, 190);       // shown and moved within 190 m
G.bounds={x0:-59, x1:59, z0:-49, z1:49};
crowdAdd(G, {look:{skin:SKINS[1], hair:HAIRS[2], shirt:"#4a6a8a", pants:"#3b4a66", cap:"#b3151b"},
             x:4, z:8, yaw:Math.PI, mode:"stand", job:"talk", held:"cup", dayOnly:true});
crowdAdd(G, {seed:42, mode:"walk", loop:true, speed:1.2, dog:"#c8a060",
             path:crowdRound([[-40,0],[40,0],[40,30],[-40,30]], 5, true)});
crowdAdd(G, {look:{...}, x:10, z:4.32, mode:"sit", sitY:0.515, held:"pint", drink:true, sway:0.3});
```

Modes `stand sit walk phone read`; jobs `talk water wash kneel fish pour
tray mow watch toss pump drive mourn throw strum hang recline`; held `pint
can cup rocks tray rod can_w sponge clip paper nozzle flowers shirt`. For a
person of your own: `buildPerson(look)` and `poseP(P, mode, phase, t)` each
frame from an `onFrame` hook.

## 10. Pets and critters

```js
PETS.add(makeDog("#7a4a2a", 0.95, x, z), {mode:"follow"});             // at your heel
PETS.add(makeDog("#f2ece0", 0.56, x, z), {mode:"wander", box:{...}, greet:11});
PETS.add(makeDog("#9a9a9a", 1.05, x, z), {mode:"lie"});
PETS.add(makeCat("#7a6a5a", x, z, "#e8e0d4"), {mode:"wander", box:{...}});
const T=crowdAdd(G, {look:{...}, x, z, mode:"stand", job:"throw"});
PETS.add(makeDog("#d8b070", 1, x, z), {mode:"fetch", thrower:T, box:{...}});
CRITTERS.addButterflies([[x,z], ...], 14);
CRITTERS.addSquirrels([[x, z, treeScale], ...], 4);
```

## 11. Cars

`parkCar(x, z, yaw, kind, paint, y0)` puts down a car anyone can drive (E;
WASD; Space the handbrake). `buildVehicleMesh` / `standingVehicle` for
trucks and wrecks (give them a collider). Moving traffic of your own goes in
`TRAFFIC` / `COL_TRAF` (see 10b).

## 12. Sound

`AUDIO.source({x, z, kind:"hum"|"water"|"fire"|"engine"|"noise", vol, reach,
outdoor})` for a positional loop; `AUDIO.blip(kind, x, z)` for a one-shot.
Wind, birds, insects, rain, thunder and the hum indoors are automatic.

## 13. Hooks: your own systems

```js
onFrame((dt, now, dark, dn)=>{ /* every frame */ });
onHook("key", e=>{ if(e.code!=="KeyK") return false; /* ... */ return true; });
onHook("placeName", (x, z)=>Math.hypot(x-40, z-30)<20 ? "THE POND" : null);
onHook("fixed", dt=>MYGAME.on);          // true: the player does not move this step
onHook("camera", dt=>{ if(!MYGAME.on) return false; camera.position.set(...); return true; });
```

All the hooks are listed in `docs/ARCHITECTURE.md`.

## 14. Testing

- `warpTo(name, x, z, yaw, floor)` for every place that matters (backquote).
- `WORLD_ROUTES = {"name": [[x,z],...]}` through every doorway, and
  `WORLD_STAIRS = [{name, up, lo, hi}]`; then
  `NODE_PATH=... node tools/walk.js` walks them all at three paces, sits in
  every seat, climbs every ladder and lands at every warp.
- `node tools/shot.js shots.json outDir 1280 720` for screenshots.
- `node tools/zfight.js '{"x0":..}'` and `node tools/signaudit.js`.
- `node tools/globals.js` for name collisions.
- In the console, `ENGINE` (also `REST`): `ENGINE.go(x, z, yaw, y)`,
  `ENGINE.hour(21)`, `ENGINE.season(true)`, `ENGINE.weather.set("storm",
  true)`, `ENGINE.sim(60)`, `ENGINE.zoneAt(x, z, y)` …
