"use strict";
/* WORLD · 01-land.js
   the lie of the land: rolling wooded hills, a village green graded level in
   a clearing, a pond on it, a track out east to the old quarry, the woods
   all round and the canopy beyond them
   Loaded after the engine's first half (index.html). */

/* ---- the plan, in metres (+x east, +z south) ------------------------------- */
const WORLD_SPOTS={};                                   // places the later files hand on (a jetty end, a dock)
const GREEN={x0:-72, x1:72, z0:-64, z1:62};            // graded level at y = 0
const POND={x:42, z:30, r:14, wy:-0.35};               // the pond and its water level
const QUARRY={x:178, z:-52, r:22, y:-1.2};             // the old quarry floor, out east at the track's end
const TRACK=smoothPath([{x:66,z:-30},{x:96,z:-38},{x:126,z:-34},{x:150,z:-44},{x:166,z:-50}], 2.0, true);
const TRAIL=smoothPath([{x:-70,z:44},{x:-96,z:60},{x:-118,z:92},{x:-112,z:130},{x:-92,z:156}], 2.0, true);
const WOODS={x0:-256, x1:256, z0:-256, z1:256};       // the walkable woods (on the 8 m lattice)
// the cellar under the bothy: a hole in the 2 m ground, on its lattice
const CELLAR={x0:-60, x1:-52, z0:-40, z1:-32, floor:-3.0};
const CELLAR_HOLE={x0:-60, x1:-52, z0:-40, z1:-32, bare:true};

// the track's grade: level with the green, then down to the quarry's floor over its last stretch
{ const L=TRACK.length; TRACK.forEach((p,i)=>{ p.y=lerp(0, QUARRY.y, smoothstep(0.55, 1, i/(L-1))); }); }

Terrain.define({
  natural:{cx:0, cz:0, calm:600, rim:1200, grain:0.7},
  height(x, z){
    let h=Terrain.natural(x, z);
    // the green, graded level, the hills easing down to it over forty metres
    h=Terrain.toward(h, 0, Terrain.boxDist(GREEN, x, z), 0, 46);
    // the pond: a bed shelving down to a metre and a half, the bank brought down to the water
    const pd=Math.hypot(x-POND.x, z-POND.z)-POND.r;
    if(pd<4) h=Math.min(h, lerp(POND.wy-0.55-Math.min(Math.max(-pd,0)*0.12, 1.2), 0, smoothstep(-1.5, 4, pd)));
    // the track out to the quarry, cut level across along its own grade; and the quarry's floor
    h=Terrain.gradePath(h, TRACK, x, z, 3.2, 9);
    const qd=Math.hypot(x-QUARRY.x, z-QUARRY.z);
    if(qd<QUARRY.r+30) h=Terrain.toward(h, QUARRY.y, qd, QUARRY.r, 10);
    return h;
  },
  // the clearings: the green, the track's verges, the quarry
  clear(x, z){
    let d=Terrain.boxSD({x0:GREEN.x0-2, x1:GREEN.x1+2, z0:GREEN.z0-2, z1:GREEN.z1+2}, x, z);
    d=Math.min(d, Terrain.pathD(TRACK, x, z, 30)-6, Math.hypot(x-QUARRY.x, z-QUARRY.z)-QUARRY.r-4);
    return d;
  },
  // the trail must stay open, but its edge is not mown
  path(x, z){ return Terrain.pathD(TRAIL, x, z, 20)-1.2; },
  water(x, z){ return Math.hypot(x-POND.x, z-POND.z)-POND.r-1.0; },
  wander:8,
});

/* ---- the ground: 2 m where you walk, 8 m round it, 16 m out to the hills, 32 m to the edge ---- */
const RINGS=terrainRings({cx:0, cz:0, levels:[{cell:2, half:272}, {cell:8, half:900}, {cell:16, half:1700}], holes:{2:[CELLAR_HOLE]}});
buildTerrain(RINGS);
const RING8=RINGS.find(r=>r.cell===8), RING32=RINGS.find(r=>r.cell===32);

/* ---- the pond ---------------------------------------------------------------- */
waterPlane({x0:POND.x-POND.r-4, x1:POND.x+POND.r+4, z0:POND.z-POND.r-4, z1:POND.z+POND.r+4, y:POND.wy});
// the bank: a low wall of colliders a step short of the water, all the way round but where the jetty goes out
{ const N=48; for(let k=0;k<N;k++){ const a=k/N*Math.PI*2, a1=(k+1)/N*Math.PI*2, R=POND.r+1.4;
    if(a>Math.PI*0.92 && a<Math.PI*1.08) continue;                     // (the jetty, on the west side)
    const x0=POND.x+Math.cos(a)*R, z0=POND.z+Math.sin(a)*R, x1=POND.x+Math.cos(a1)*R, z1=POND.z+Math.sin(a1)*R;
    addCol(Math.min(x0,x1)-0.15, Math.max(x0,x1)+0.15, Math.min(z0,z1)-0.15, Math.max(z0,z1)+0.15, -2, 1.2); } }

/* ---- the woods ------------------------------------------------------------------ */
FOREST.setZone(WOODS);
FOREST.wild(WOODS);
FOREST.understory(WOODS, {density:0.7});
FOREST.floor(WOODS, {density:0.7});
// a few big trees left standing on the green for the shade (they get trunk colliders: col)
for(const [x,z,s] of [[-52,-48,1.15],[56,-44,1.05],[-58,8,1.1],[-12,48,1.0],[64,4,0.95],[8,-52,0.9]]) FOREST.plant("lawn", x, z, {scale:s, col:true});
// a hedge of shrubs round the back of the store's lot
FOREST.row(-40, -46, -6, -46, {sp:["shrub"], spacing:2.2, gap:0.1, shrubs:false, col:false, scale:0.9});
// the shell past the walkable woods, and the curtain at their edge; the walls you cannot pass
FOREST.canopy([{box:RING8, cell:8, holes:[WOODS]}, {box:RING32, cell:32, holes:[RING8]}], {curtain:WOODS});
FOREST.bounds(WOODS, {inset:22});

/* ---- the paving: the store's lot, the walk, the track ------------------------------- */
paveRect("lotpave", -38, -6, -19, -5, "#ffffff");
paveRect("walkflat", -32, -12, -21.9, -19, "#ffffff");
for(let x=-35; x<=-9; x+=3.2) stripe(x, -17.4, x, -12.4, 0.12, WHITE_LINE);
// the track: crushed stone along its line, a raster so you stand on it
addPaveRaster(56, -64, 180, -22);
layRibbon("gravelbed", TRACK, -2.6, 2.6, PAVE_T, 0.25, "#d8d2c6");
addPaveRibbon(TRACK, -2.6, 2.6);

/* ---- the map: the track and the trail on the plan ----------------------------------- */
PLAN_LAYERS.push((x, px, pz, S)=>{
  const L=(P, w, col, dash)=>{ x.beginPath(); x.moveTo(px(P[0].x), pz(P[0].z)); for(const p of P) x.lineTo(px(p.x), pz(p.z));
    x.strokeStyle=col; x.lineWidth=w; x.lineCap="round"; x.setLineDash(dash||[]); x.stroke(); x.setLineDash([]); };
  L(TRACK, 2.2, "#8c867a"); L(TRAIL, 1.2, "#b39a72", [3,2]);
  x.fillStyle="#6c6a64"; x.beginPath(); x.arc(px(QUARRY.x), pz(QUARRY.z), QUARRY.r*S, 0, 7); x.fill();
});
onHook("placeName", (x, z)=>{
  if(Math.hypot(x-QUARRY.x, z-QUARRY.z)<QUARRY.r+6) return "THE OLD QUARRY";
  if(Terrain.pathD(TRACK, x, z, 20)<4) return "THE QUARRY TRACK";
  if(Terrain.pathD(TRAIL, x, z, 20)<3) return "A PATH IN THE WOODS";
  if(Math.hypot(x-POND.x, z-POND.z)<POND.r+5) return "THE POND";
  if(Terrain.boxSD(GREEN, x, z)<0) return "THE GREEN";
  return null;
});
