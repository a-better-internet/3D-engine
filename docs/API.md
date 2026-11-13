# API reference

Every public name the engine defines, by file, in load order. Names starting
with `_` are internal. Coordinates are metres, +x east, +y up, +z south; yaw
0 looks north (−z). `bk` is a bucket name (09's palette or your own
`bucketOf`); colours are hex strings or numbers.

## 00-config

| | |
|---|---|
| `WORLD` | the world's config, declared by the world before the engine (`var WORLD = {...}`) |
| `CFG` | `WORLD` merged over `ENGINE_DEFAULTS` (deep for plain objects) |
| `SPAWN`, `EYE`, `PLAYER_R`, `GROUND_EDGE`, `STEP_UP` | from `CFG` |
| `SLOT`, `IMAGES`, `IMAGE_PROXY` | image slots (aspect ratios) and hosted replacements |
| `onHook(name, fn, order)` | add a hook (see ARCHITECTURE.md for the list) |
| `onFrame(fn, order)` | `onHook("frame", fn)`: `fn(dt, now, dark, dn)` every drawn frame |
| `runHooks(name, ...)`, `runHookUntil(name, ...)` | call them all / until one returns truthy |

## 01-helpers

**Maths and rng.** `T` (THREE), `V3(x,y,z)`, `clamp`, `lerp`, `smoothstep(e0,e1,x)`,
`rnd()` (seeded by `CFG.seed`), `rr(a,b)`, `pick(arr)`, `hash2(x,z)` (0..1, stable by position).

**Textures.** `cvs(w,h)`, `setSRGB(t)`, `rep(t,x,y)`, `artTex(slotKey, long, draw)`, `hosted(key, tex, opt)`,
`ANIM` (push `{c, tex, draw}` to redraw a canvas each frame).

**Geometry.** `boxGeo(w,h,d,uvScale)` (UVs in metres), `rboxGeo(w,h,d,r,seg)` (eased edges, cached),
`blobGeo(r)`, `rockGeo(size, seed)`, `planeGeo(w,h,uv)`, `cellGeo(w,h,cols,rows,seed)` (one cell of a sheet),
`streakGeo`, `puddleGeo(rx,rz,seed)`, `discGeo(r,seg,uv)`, `shadeGeo`, `domeGeo`, `prismGeo(pts, depth, uv)`,
`FaceGeo` (`.poly(pts, inside, uv)`, `.slab(top, t, uv)`, `.geo()`), `mergeEntries([{geo, matrix, color}])`.

**Paths.** `smoothPath(pts, step, chord)` → points `{x,z,y,s}`, `pathSide(P,i)`, `pathAt(P, s)`,
`distToPath(P, x, z)` → `{d, x, z, y, s}`, `ribbonGeo(P, o0, o1, yOff, uv)`, `dashesAlong(...)`.

**Buckets.** `bucketOf(name, ()=>material)`, `push(bk, geo, x,y,z, ry, color, rx, rz)` (Euler YXZ),
`bx(bk, w,h,d, x,y,z, uv, ry, color)`, `cyl(bk, rt,rb,h,seg, x,y,z, color, rx,ry,rz)`,
`tube(bk, a, b, r, seg, color, r2)`, `wallBox(bk, x0,x1,z0,z1,y0,y1, color, uv, floorY)` (box + collider,
world-anchored UVs), `bakeBuckets(scene)` (15 calls it), `NO_SHADOW_IN` (bucket names that do not receive).

**Local frames.** `XF(ox, oz, ry)` → `{x(lx,lz), z(lx,lz), ry}`; `lbx(xf, bk, w,h,d, lx,ly,lz, uv, color)`,
`lcol(xf, w,d, lx,lz, y0,y1)`, `lwall(...)` (both).

**Paving as one piece.** `SD_rect`, `SD_box`, `SD_ellipse`, `SD_ring`, `sdUnion(list, r)`,
`sdPaveGeo(sd, x0,x1,z0,z1, cell, uvm)`.

**Detail.** `detailMesh(entries, material, name, cast)` → tiled meshes in `DETAIL` (culled past `detail`).

**Doors.** `makeDoor(xf, lx, ly, lz, label, opensIn, ajar, style, tint)` (styles `store vision steel gate
stall stallw closet`; swings open as you or a walker come up), `latchDoor(col)` (the last door made: manual,
sticky, solid while shut), `makeLiftDoor(xf, y0, w, h, col, label, colBox, kind)` (sectional, or `"roll"`).
A `DOORS` entry: `{g, open, target, x, z, y, base, swing, label, reach, manual, manualOnly, sticky,
blockCol, partner, onUse, promptFn, lift, slide, rate, npcReach, occ}`.

**Registries.** `ANIM`, `GLOW`, `DOORS`, `LAMPS`, `NEON`, `GLASS_PANES`, `BUCKETS`, `DETAIL`.

## 02-textures

`TEX.*`: `asphalt road concrete brick siding shingle quarry ytile mosaic block drywall ground lawn riverRock
crushed mulch wood enamel galv brushed rubber chain rock cork soot haze`. `asphaltTex(seed, cracks, base)`,
`noiseDots`, `_tex(canvas)`, `_trng(seed)`.
Signs: `fitText(ctx, str, maxW, size, cx, cy, weight, family)` (returns the size used),
`fitHwy(ctx, str, maxW, size, cx, cy)`, `signTex(w, h, draw)`, `signPanel(w, h, tex, x, y, z, ry, lit, rx)`,
`rrect(ctx, x, y, w, h, r)`, `drawISA(ctx, cx, cy, s, col)`.

## 02b-ui

`UI` (the colours), `PLAN_LAYERS` (push `(ctx, px, pz, S)=>{}` to draw on the plan). Builds `#app #vig #dot
#prompt #toast #mast #keys #cluster #plan #touch #boot` unless the page has them.

## 03-scene

`GFX` (`res fps shadows draw lights meter aa`, `gpu`, `tier`), `SHADOW_LEVELS`, `DRAW_LEVELS`
(`tree small cull fog detail`), `gfxPixelRatio()`, `renderer`, `scene`, `camera`, `ortho`, `view`
("fp" | "plan"), `applyFov()`, `fovZoom`, `hemi`, `amb`, `key` (the sun/moon), `setShadowLevel(i)`,
`keyShadeWant`, `keyShadow(on)`, `torch`, `torchOn`, `MIST_U` / `MIST_C` (ground mist), `HAZE_U` (aerial
perspective), `GLOOM_U` (a mode's heavy fog: x amount, y ground under the camera, z drift clock, w far end),
`MAXANISO`.

## 04-terrain

`Terrain.define({height, clear, path, water, tint, lawn, natural, rimMask, wander})`,
`Terrain.heightAt(x,z)`, `Terrain.groundAt(x,z)` (as drawn), `Terrain.natural(x,z,o)`, `Terrain.fbm(x,y,oct)`,
`Terrain.vnoise`, `Terrain.ridged`, `Terrain.boxDist(B,x,z)`, `Terrain.boxSD(B,x,z)`,
`Terrain.toward(h, y, d, half, blend)`, `Terrain.gradePath(h, P, x, z, half, blend)`, `Terrain.pathD(P,x,z,pad)`,
`Terrain.pathBox(P, pad)`, `Terrain.siteDist`, `Terrain.pathDist`, `Terrain.clearDist`, `Terrain.lakeSD`,
`Terrain.mask`.
`terrainRings({cx, cz, levels:[{cell, half}], holes:{cell:[box]}, extra:[{box, cell, holes}]})` → rings,
`buildTerrain(rings)`, `onLattice(box, cell)`, `groundAt(x,z)`, `TERRAIN_RINGS`, `TERRAIN_MAT`, `TERRAIN_TINT`.

## 05-sky, 05b-reflect

`DayNight` (`DUR`, `P` (palette), `state` {t, hour, day, dark, nightAmount, sunsetAmount, sunHeight, paused},
`setHour(h)`, `nudge(d)`, `tick(dt)`, `paint()`, `sunTimes()`), `MOON` (`phase`, `frac`, `bright`), `skyDome`,
`starPivot`, `STAR_LAYERS`, `MILKY`, `sunDisc`, `moonDisc`, `CLOUDS`, `ALTO`, `CIRRUS`, `BIRDS`, `VULTURE`,
`MOTHS`, `GLOW_TEX`, `skyImg`.
`ENV` (`out`, `in`), `envOut(material, k)`, `envIn(material, k)`, `ENV_OUT_MATS`.

## 06-collision

**Solid.** `addCol(x0,x1,z0,z1,y0,y1)`, `addColOB(cx,cz,yaw,hx,hz,y0,y1,list)`, `COL`, `COL_DYN`, `COL_TRAF`,
`KEEP_OFF`, `blocked(x,z,feetY)`, `hitsAny(...)`, `colsNear(x,z)`, `edgeWall(x,z,feetY)`, `buildColGrid()`.
**Floors.** `addFlat(x0,x1,z0,z1,y)`, `addRamp(x0,x1,z0,z1,axis,a0,a1,y0,y1)`, `addFlatOB(...)`,
`surfaceY(x,z,curY)` (the highest within `STEP_UP` of curY), `groundY(x,z)` (paving or ground), `SURF`.
**Paving.** `addPaveRect(x0,x1,z0,z1,y)`, `addPaveRaster(x0,z0,x1,z1)`, `addPaveRibbon(P,o0,o1)`, `PAVE_FNS`,
`pavedY(x,z)`, `PAVE_T` (3 cm).
**Zones.** `addZone(x0,x1,z0,z1,y0,y1,name,indoor)`, `addZoneOB(...)`, `zoneAt(x,z,y)`, `indoorsAt(x,z,y)`,
`addRoof(x0,x1,z0,z1,top)`.
**Underground.** `addVoid(x0,x1,z0,z1,y0,y1,floor)`, `voidAt`, `addBuried(x0,x1,z0,z1,y0,y1,amb,tint,grad)`,
`buriedAt`, `buriedVolAt`, `buriedShare`.
**Using things.** `addSeat(x,z,y,yaw,label,lie,drop)`, `addUse(x,z,y,label,fn,r,when)` (→ use; `.game`,
`.pri`), `addLadder(x,z,y0,y1,yaw,out,top,label)`, `roofLadder({x,z,nx,nz,g,edge,roof,off,soffit,land,label,
walk})`, `roofUnit(x,z,y,w,d,h,col,side)`, `SEATS`, `USES`, `LADDERS`, `ROOF_WALKS`.

## 06b-audio

`AUDIO.start()`, `.toggle()`, `.on()`, `.update(dt, dark)`, `.source({x,y,z,kind,vol,reach,outdoor,pitch,
freq})` (kinds `hum water fire engine noise`; returns it: `.on`, `.x/.z`, `.rpm`), `.blip(kind, x, z, vol)`,
`.thunder(d, pan)`, `.outage()`, `.tone(type, f0, f1, dur, peak, at, pan, dest)`, `.ctx()`, `.master()`,
`.outLP()`, `.noise(sec, color)`, `.quiet` (no birds or insects), `.noHum`.

## 06c-warp

`warpTo(name, x, z, yaw, floor)`, `WARPS`, `WARP.go(i)`, `WARP.open`.

## 07-forest

`FOREST.setZone(box)`, `.plant(sp, x, z, {scale, y, ry, color, autumn, solid, lean, col, colR})`,
`.wild(box, {spacing, edge, mix, scale, col})`, `.understory(box, {density})`, `.floor(box, {density})`,
`.row(x0,z0,x1,z1, {seed, spacing, gap, sp, scale, shrubs, col, where})`,
`.canopy([{box, cell, holes, fine}], {curtain, open})`, `.bounds(box, {inset, gaps, msg})`, `.soft`
(CANOPY_SOFT boxes `{x0,x1,z0,z1,reach}`), `.addSpecies(name, def)`, `.species`, `.build.{broadleaf, hemlock,
pine, shrub, fern}`, `.setSeason(autumn)`, `.isAutumn()`, `.canopyAt(x,z)`, `.canopyY(x,z,fine)`,
`.hide(fn)`, `.inZone(x,z)`, `.barkCyl(r0,r1,L,seg)`, `.atlas`, `.inst`, `.chunks`, `.finish()`, `.update(cam)`,
`WIND_U`.

## 09-building

**Palette.** Buckets `road asphalt lotpave paint walkflat bed mulchbed gravelbed soot concrete metal paintm
rock wood rubber brick siding shingle block ytile mosaic quarry plaster porcelain steel chrome beam cork
fabric roofmetal mat glass tint mirror tube ceilfix winglow lamplens exitsign ledgreen ledamber ledred
lightpool`; colours `BRICK BRICK_IN FASCIA BRONZE CREAM TILE BLOCKC PART PORC WHITE_LINE YELLOW_LINE`; `_po(f)`.
**Glow.** `glowMat(opts, kind, circ)`, `emitMat(color, intensity, kind, circ)`, `basicGlowMat(color, kind,
blend, max)`.
**Walls.** `runX/runZ(bk, c, t, a, b, y0, y1, openings, color, uv)`, `lineX/lineZ(bk, face, dir, a, b, y0, y1,
openings, color, uv, inset)`, `floorAt(bk, x0,x1,z0,z1, y, color, uv)`, `ceilAt(...)`, `frameX/frameZ(c, t, a,
b, head, color, floor)`, `wallSign(w,h,draw,x,y,z,ry)`.
**World-coordinate kit.** `pieces(a,b,y0,y1,holes)`, `vslab(bk,ax,c,pcs,t,dir,col,uv)`,
`vliner(bk,ax,c,pcs,dir,col,uv)`, `wall(bk,ax,c,t,a,b,y0,y1,ops,col,uv,floorY)`,
`liner(bk,ax,fc,dir,a,b,y0,y1,ops,col,uv)`, `face(bk,pts,n,col,uv)`, `holesIn(ops,a,b,y0,y1)`, `addFace`,
`flush`, `clip`, `area`, `newell`. An opening is `{a, b, sill, head}`.
**Windows, roofs.** `windowAt(ax, c, t, o, out, trim, curtain)`, `gableRoof(bk, B, eave, ridge, along, over,
t, color)`, `gableEnds(bk, B, eave, ridge, along, t, color, uv)`, `flatRoof(bk, B, top, t, over, color,
parapet)`.
**`building(o)`** → `{inner, floor, ceil, roofTop, doors, zone, ops}`; see its header in 09.

## 10a-vehicles, 10b-cars, 11-driving

`vehicleParts(kind, paint, trailer, livery, coarse, opts)` (0 sedan, 1 SUV, 2 pickup, 3 minivan, 4 box truck,
5 tractor-trailer, 6 reefer, 7 flatbed), `buildVehicleMesh(kind, paint, trailer, livery, opts)` →
`{g, spec, lamps, lod}`, `standingVehicle(kind, paint, x, z, yaw, gy)`, `WHEEL_POOL.register(v, spec)`,
`VEH_MAT`, `VEH_GLASS`, `CAR_PAINTS`, `TRUCK_PAINTS`, `wheelSlots(spec)`.
`parkCar(x, z, yaw, kind, paint, y0)` → car, `CARS`, `CARC` (tuning), `CAR_RIDE`, `driving`, `TRAFFIC`,
`updateParkedLOD(cam)`.
`enterCar(c)`, `exitCar()`, `nearestCar()`, `updateCars(dt)`, `showCar(car)`, `carYaw(q)`, `carHits(...)`,
`updateCarLights(dark, dt)`, `carBeams`, `CAR_BEAMS_BORROW(dark, dt, beams)` (define it to borrow them).

## 13-props

`lampPost(x, z, h, y0)`, `picnicTable(x, z, ry, color, y0)`, `parkBench(x, z, ry, y0, color)`,
`swingCan(x, z, ry, y0)`, `campfire(x, z, scale, always, y0)` → fire (`.on`), `FIRES`, `fireFlameMat(seed)`,
`emergencyLight(x, y, z, ry, vol)`, `paveRect(bk, x0,x1,z0,z1, color, y)`, `layRibbon(bk, P, o0, o1, yOff,
uv, color)`, `ribbonGeoVar`, `layRibbonVar`, `stripe(x0,z0,x1,z1,w,color,y)`, `PICNIC`.

## 14a-smoke

`PUFFS.emit(x,y,z, vx,vy,vz, s0,s1, life, a0, shade, glow)`, `SPARKS.emit(x,y,z, vx,vy,vz, size, life)`,
`_cloud(N, tex, additive)`, `_SOFT_TEX`, `updatePuffs`.

## 14b-people

`buildPerson(look)` → `{g, mesh, B, j, HIP, h, female}` (set `.seed`), `randomPerson(rng)`,
`poseP(P, mode, phase, t)`, `levelHeld(obj, P, ax)`, `DRINK_TIP`, `giveCigarette(P)`, `updateCigarette(p,
dt, now, dark)`, `buildDog(coat)`, `SKINS`, `HAIRS`, `SHIRTS`, `PANTS`, `PEOPLE_MAT`, `PEOPLE`,
`_hitAt(x,z,y,r,self)`, `_stepWalker(p, dt, speed)`, `stepPerson(p, dt, now)`, `npcNearDoor(d)`,
`rigidSkin`, `skinned(parts, bones, mat)`, `BODY_R`.

## 14c-critters

`CRITTERS.addButterflies(anchors, n)`, `CRITTERS.addSquirrels(trees, n)`, `CRITTERS.mist` (false: none),
`CRITTERS.mistGround(x,z)`, `updateCritters`.

## 14q-crowd

`crowdGroup(name, cx, cz, reach)` (`.bounds`), `crowdAdd(G, o)` (see 14q's header), `crowdHold(P, kind,
right)`, `crowdProp(build)`, `crowdRound(pts, R, closed)`, `_armTo(P, sh, el, target, pole)`, `CROWD`,
`WATER_Y`, `updateCrowd`.

## 14t-pets

`makeDog(coat, scale, x, z)`, `makeCat(coat, x, z, belly)`, `buildCat`, `poseDog(D, gait)` (`stand trot run
bow sit lie`), `petSteer(D, tx, tz, vmax, dt, stopAt, box)`, `petGait(D)`, `petLook(D, x, z, up)`,
`PETS.add(D, {mode:"follow"|"wander"|"lie"|"sit"|"chase"|"fetch", box, greet, with, thrower, range, reach,
dayOnly})`, `PETS.list`, `PETS.behaviours` (add your own), `PETS.update(dt)`.

## 14u-water

`waterPlane({x0, x1, z0, z1, y, color, tile})`, `WATER.wakeDrop(x, z, s)`, `WATER.focus(x, z)`,
`WATER.sheets`.

## 15–19

`BAKED`; `LIGHT_POOL`, `setLightCount(n)`, `FLICKER`, `updateLights(dark, cam)`;
`WEATHER` (`set(kind, fast)`, `kind`, `cover`, `rain`, `fog`, `storm`, `wet`, `flash`, `temp()`, `label()`),
`WKINDS` (`clear cloudy rain fog rainfog storm dread`), `GRID` (`trip(test)`, `phase`, `cut`, `onOut`,
`onBack`, `emerg`), `circLevel(c)`, `strike(close, test)`, `rainOB(ob, top)`, `DECK`, `RAIN`, `FOGBANKS`,
`WET_MATS`; `GLASS` (`ray`, `hit`, `shatter`, `blast`, `update`, `mend`);
`player` (`pos`, `yaw`, `pitch`, `feetY`, `moving`, `ladder`), `keys`, `started`, `interact()`,
`nearestUse(game)`, `sitToggle()`, `standUp()`, `nearestFree(x,z,base,maxR,tol)`, `climbOn(L, way)`,
`setDrone(on)`, `droneMode`, `updateDoors(dt)`, `fixedUpdate(dt)`, `look(dx,dy)`;
`toast(text, color)`, `placeName(x,z)`, `updateHUD()`, `drawPlan()`;
`GFXMENU`, `applyGraphics()`, `cullBaked(cam, dt, force)`;
`gfxWarm(scene, camera, draw)`, `begin()`, `Wind` (`gust`, `hold`), `TIME_SCALE.v`, `CAM_SHAKE.v`,
`UNDER_LIGHT`, `window.ENGINE` (= `window.REST`: `go(x,z,yaw,y,pitch)`, `sim(n)`, `hour(h)`, `pause(p)`,
`start()`, `season(autumn)`, `drone(on)`, `droneSet(...)`, `enterCar`, `exitCar`, `sit()`, `view(v)`,
`torch()`, `zoneAt`, `surf`, `probe`, `cols`, `colsDyn`, `seats`, `uses`, `doors`, `routes`, `warps`, ...).
