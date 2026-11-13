# Working on the engine (and on worlds built with it)

A first-person world engine in three.js r128, extracted from the Rest Area
world. There is no build step. The scripts in `engine/` and `world/` are
classic scripts that share one global scope, and they load in the order
`index.html` lists them. A file can use anything defined by a file before
it, and nothing defined after it, at load time. The README describes the
engine and the demo world; `docs/ARCHITECTURE.md` the load order, the frame
and the registries; `docs/WORLD-GUIDE.md` how to make a world; `docs/API.md`
every public function. The comment block at the top of each file describes
that file.

## The split

- `engine/` is world-agnostic. It never names a place, a building or a
  person. Anything a world needs to change about the engine's behaviour goes
  through `CFG` (the world's `WORLD` object, merged over `ENGINE_DEFAULTS` in
  `00-config.js`), a hook (`onHook`, 00), or a registry the world pushes
  into (LAMPS, DOORS, USES, SEATS, ZONES, PLAN_LAYERS, WARPS, ...). If a world
  needs the engine to do something new, add a general mechanism to the
  engine, not a special case for that world.
- `world/` is one world. The demo world, Pine Hollow, exercises every system.
  A new world is a new `world/` folder (or a copy of the repo) with its own
  `index.html` listing its files between the engine's two halves.
- The load order is: the world's config → the engine's systems (00–14u) → the
  world's files → the engine's finish (15-bake to 19-loop). Nothing may be
  pushed into a bucket or added to COL after 15-bake.

## Standing rules

These hold for everything in the engine and everything a world adds.

### 1. No two faces in one plane (no z-fighting)

The depth buffer cannot sort two faces that lie in the same plane. It draws
them as flicker, worst at a distance and at a grazing angle. So:

- **Nothing sits exactly on another surface.** Lift it clear by at least
  5 mm, more for anything seen from more than a few metres. Paper-thin
  things such as cards, decals and screens should be a real thickness or
  sit a real gap above the surface.
- **Thin baked boxes grow.** At bake, `01` grows every bucket box (`bx`, or
  a box `push`ed into a bucket) thinner than 19.5 cm by up to about 5 mm a
  side, so trim stands proud of the walls it meets. Anything on the face of
  one, such as a sign on its plate, needs at least 1 cm of clearance from
  the face as drawn, or the grown box swallows it. Boxes merged by hand
  (`mergeEntries`, `detailMesh`) are not grown.
- **Nothing is flush with the face it meets.** A trim piece, frame or
  baseboard either stands proud of the wall or stops short of it. When two
  boxes butt together, make one of them a few millimetres longer, or sink it
  into the other. `frameX` / `frameZ` (09) show how.
- **Stacked flat layers use polygon offset.** Each layer is one step
  stronger than the one under it and sits a few centimetres above it. 09's
  palette sets out the ladder: terrain, `road` (-1), `asphalt` / `walkflat`
  / `gravelbed` (-2), `lotpave` / `bed` / `mulchbed` (-3), `paint` (-4),
  `soot` (-5), `lightpool` (-6). Sign faces use `signPanel` (02), which
  carries its own offset. Those buckets are for flat planes only: the offset
  grows with how edge-on a face is, so a box's side seen at a grazing angle
  jumps through walls metres in front of it. A raised bed or a kerb is a box
  in a plain bucket.
- **Round walls seen from inside** need their own inside faces (a copy of
  the geometry turned inside out), not a DoubleSide material that z-fights
  with the outside.
- **Wall liners share their corners.** `lineX` / `lineZ` and 09's `liner`
  cut every piece at every opening's sill and head, so pieces meeting along
  a vertical edge share its corners.
- **Check new work with `tools/zfight.js`** over a box around it. It lists
  coplanar, overlapping, same-facing faces from different pieces. It cannot
  see faces inside one hand-merged mesh (a door leaf, a vehicle, a
  `detailMesh` group), so space those by hand.

### 2. Underground is not on the day/night cycle

Anything built below ground keeps the same light at noon and at midnight.
World/03-cellar.js does all of this:

- If it is dug under the ground's surface, the terrain must not run through
  it. Hole the ring it is in, on that ring's lattice (`terrainRings`' `holes`,
  04; `bare:true` so no apron hangs into the room). Cover what the hole
  leaves open with something solid, and add a VOID (06's `addVoid`) so that
  you stand on its floor and not on the coarser ground under the hole.
- Register the volume with `addBuried(x0,x1,z0,z1,y0,y1)` (06). While the
  camera is inside one, 19-loop holds the sky, sun and ambient at the fixed
  `UNDER_LIGHT`, and the glows and lamps run as though it were night. A
  seventh argument holds that fill at a fraction of `UNDER_LIGHT`; an eighth
  tints it; a ninth `[yTop, yBottom]` grades a stairwell, so the light
  changes as you go down.
- Give its lamps `under:true`. Under lamps run at full strength regardless
  of the hour, are only considered while the camera is underground, and
  lamps above ground are dropped while it is.
- Do not tie underground light to `dark`, `DayNight` or the weather.

### 3. Sign text always fits, with padding

- Draw sign text with `fitText` / `fitHwy` (02), not a bare `fillText`.
  They shrink the text until it fits inside 84% of the board's width and
  62% of its height. Give each line a `maxW` that also clears the sign's
  border, about 0.8 of the board's width for a bordered sign.
- When several lines should match, size them together: measure each, take
  the smallest size any line needs, and draw them all at that size.
- Raw `fillText` is for things that are not signs (a screen's game
  graphics, scribbles). Even there, keep the text inside the canvas.
- **Check with `tools/signaudit.js`.**

### 4. Never change the lights while the game runs

Hiding or showing a light, or flipping `castShadow`, makes every lit shader
compile again: a freeze of a second or more on a Mac. Turn a light down to
intensity 0 instead (03's torch, 16's lamp pool). The sun's shade goes and
comes through `keyShadeWant` / `keyShadow()` (03), which draw the shadow
camera's far plane in rather than stop it casting. Changing the light count
or shadows in the settings menu is the only exception. Likewise anything a
mode builds when it starts is warmed with 19's `gfxWarm(scene, camera,
true)` right after it is built; everything built at load is warmed already.

### 5. The engine names no world

See "The split" above. A `typeof SOMETHING!=="undefined"` check for a
world's own global inside an engine file is a bug: make it a hook.

## Engine notes

- `runX` / `runZ` / `lineX` / `lineZ` (09) take one row of openings. A wall
  with windows on two storeys is built as one band per storey, each given
  only its own storey's openings.
- A doorway needs a walkable surface across the wall's thickness
  (`addFlat`), as well as on the floors either side of it. `building()` does
  this for its own openings.
- `FaceGeo().slab(pts, t)` treats `pts` as a face and builds the slab behind
  it. A flat or sloped one always hangs `t` below its points, so a roof's
  points are its top and its underside is `t` lower.
- Far from the origin a float has a tenth of a millimetre of play, and two
  pieces of one wall built as boxes centred and turned into place open
  hairline cracks where they meet. Build walls a long way out with 09's
  world-coordinate kit (`pieces`, `vslab`, `vliner`, `wall`, `liner`).
- The lawn is the terrain's own shader (04): a `grass` vertex attribute says
  how much is lawn and how much of that is mown in stripes. Grass is not
  modelled as blades or tufts.
- The canopy's shell (07) is only ever meant to be seen behind real trees.
  It stands up to full height within 11 m of a clearing's edge, so wherever
  you can stand within forty-odd metres of woods that are only shell, plant
  real trees there several rows deep and add the place to `FOREST.soft` so
  the shell climbs slowly under them.
- Trees planted outside the walkable zone (`FOREST.setZone`) get no trunk
  colliders unless planted with `col:true`. Keep any tree clear of a trail
  head or a path, and 8.5 m clear of a fire.
- `zoneAt` names the last zone added that holds you, so add the general zone
  first and the particular ones (a porch, a room) after it.
- A roof with open sides (a canopy, a porch, a pavilion) is registered with
  `addRoof(x0,x1,z0,z1,top)` (06) so it keeps the rain off. Indoor zones do
  this on their own.
- `SURF`, `ZONES` and `VOIDS` are looked up through 06's rect grids. They only
  ever grow, and a rect's bounds never change once it is added (a surface's
  height may). Never splice one or move a rect.
- `Terrain.groundAt` remembers its rings' corner heights. The field is fixed
  once the ground is built; never change what `heightAt` returns after load.
- `updateDoors` (17) skips drawing a door at rest. Anything that moves a
  door's leaf itself sets `d.open`, never the leaf's transform.
- A door that should stay shut until you open it is `makeDoor` then
  `latchDoor(col)` (01): manual only, sticky, solid across `col` while shut.
  An overhead door is `makeLiftDoor` (01).
- Lit colours above 0.60 are eased halfway back (03): this renderer takes
  hex as painted, so a pale slab in full sun would otherwise clip. Concrete
  wants about `#a8a49a` to `#b8b4aa`, not `#d0ccc2`.
- `addSeat(x, z, y, yaw, label, lie, drop)` (06): `y` is the floor under the
  seat and `drop` how far a seated person's eyes are below a standing one's,
  a chair's 0.66 unless given; a stool at 0.79 takes 0.34, a low lounge
  chair 0.76. A crowd person's `sitY` is the seat's top plus about 5.5 cm.
- Every person's pose ends in `_idle` (14b) for `sit` and `stand`. A job that
  sets its own bones does it after `poseP`, so it wins. `poseP` sets the
  root's whole position every frame: anything that adds to a bone's position
  must start from there.
- Anything a person holds that must stand as it would in a hand (a glass, a
  can, a rod) rides on the forearm's bone and is turned back each frame by
  14b's `levelHeld(obj, P, ax)`. Never leave a drink to the forearm's angle.
- A crowd's `sway` turns them from the waist, never the whole body.
- Nothing flat and pale goes on the water (14u): it would not be lit like it
  and shows up white at night. The shore is a wall of colliders a step short
  of the water, open where a dock goes out.
- A stain, damp, dirt or oil on a wall or floor is a soft-edged decal (a
  transparent blotch texture in its own bucket, coloured by the vertex
  colour), never a hard-edged flat shape.
- Every texture on a material in the scene gets anisotropic filtering once
  the world is built (19), except normal maps. A texture made later, at run
  time, sets its own `anisotropy`.
- The world's edge is walls of colliders from y −40 to 300 (07's
  `FOREST.bounds`). Only walking into one of those puts up the edge toast
  (`edgeWall`, 06), `CFG.edgeMessage` or the wall's own `.msg`.
- A game played out in the world takes keys through `onHook("key")` (return
  true to take the key), its frame through `onFrame`, and if it uses ENTER to
  start, its use is marked `.game`. A game's own keys must not take a
  mid-game ENTER as "start again".
- The warp list (06c, backquote) is for testing: `warpTo(name, x, z, yaw,
  floor)` for every place that matters. `tools/walk.js` puts you down at
  every one and fails any that is in something or does not hold you.

## The machine it must run on

The owner plays in Chrome on a refurbished MacBook Pro: a 2.4 GHz 8-core
Intel Core i9 with Intel UHD Graphics 630 (1536 MB shared), 32 GB of RAM,
macOS 14. Treat the Intel chip as the floor, at Retina resolution, and keep
High and Ultra for faster cards. 03 asks for the high-performance GPU and
reads which one it got (`GFX.gpu`, `GFX.tier`). On a first run on an
integrated chip it starts at Medium with resolution on AUTO (`GFX.res` −1,
18c moves `GFX.auto`). Anything costly per pixel or per frame should scale
with a menu setting, not be fixed. Hand-merged detail goes through
`detailMesh` (tiled, culled past the draw distance); an InstancedMesh spread
over a field is tiled too, never `frustumCulled=false` with a world-sized
reach.

## Tools

Run them with `NODE_PATH` pointing at a global Playwright, and a local
three.js r128 at `tools/three.min.js` (gitignored; `npm pack three@0.128.0`
and take `package/build/three.min.js`), for example
`NODE_PATH=/opt/node22/lib/node_modules node tools/walk.js`. `PAGE=other.html`
points any of them at another world's page.

- `tools/shot.js shots.json outDir [w] [h]` renders screenshots from the
  world itself (see its header for the shot format).
- `tools/walk.js` walks every route (`WORLD_ROUTES`) and stair
  (`WORLD_STAIRS`), every seat, ladder and warp, with keys held at walk, run
  and sprint, and fails if you get stuck anywhere. `ONLY=regex` walks just
  those whose names match. Add a route for any new place you can walk to.
  The walker is a square ±0.34 m across, not a circle, so give corners room.
- `tools/zfight.js '{"x0":..,"x1":..,"z0":..,"z1":..,"y0":..,"y1":..}'`
  finds coplanar faces in a box.
- `tools/signaudit.js [pad]` finds sign text too close to an edge.
