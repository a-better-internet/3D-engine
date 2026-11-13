"use strict";
/* WORLD · 03-cellar.js
   the bothy and the root cellar under it: the engine's underground rules in
   one place (CLAUDE.md, rule 2)
   * the 2 m ground is holed over the cellar (01's CELLAR_HOLE, on its lattice),
     and the bothy's floor and walls cover the hole's edges;
   * a VOID over the cellar, so below its top you stand on its floor and not
     on the coarser ground the hole leaves showing to groundAt;
   * addBuried for the room (held at a fraction of the fixed underground fill)
     and a GRADED one down the stair, so the light changes as you go down;
   * its lamps are under:true, on at any hour, the only ones counted down there. */
const BOTHY=building({
  x0:-61, x1:-51, z0:-41, z1:-31, floor:0.15, height:2.6, t:0.3, noFloor:true,
  outer:{bk:"block", color:"#b8b2a4", uv:0.5}, inner:{bk:"plaster", color:"#d8d2c4"},
  ceiling:{bk:"wood", color:"#a8865e", uv:0.9},
  openings:[
    {side:"n", at:5, door:"vision", label:"THE BOTHY'S DOOR", tint:0x5a4a3a},
    {side:"w", at:4, window:true, w:0.9, sill:1.1, head:1.9},
  ],
  roof:{kind:"gable", along:"x", ridge:4.6, over:0.4, bk:"roofmetal", color:"#6a7a6a", ends:{bk:"block", color:"#b8b2a4"}},
  name:"THE BOTHY", lamps:[{x:-56, z:-37}], lampColor:0xffe2b0, lampIntensity:0.7,
});
{ const FL=BOTHY.floor, I=BOTHY.inner, C=CELLAR, CF=C.floor, CT=-0.11;    // the cellar's floor, the underside of the slab over it
  // the stairwell, in the bothy's floor along its south wall, going down west
  const S={x0:-58.6, x1:-52.6, z0:-33.6, z1:-32.2};
  // the floor round it: a slab 24 cm thick in four pieces, the boards 2 cm over it
  const pieces=[[I.x0, I.x1, I.z0, S.z0], [I.x0, S.x0, S.z0, I.z1], [S.x1, I.x1, S.z0, I.z1], [S.x0, S.x1, S.z1, I.z1]];
  for(const [x0,x1,z0,z1] of pieces){
    bx("concrete", x1-x0, 0.24, z1-z0, (x0+x1)/2, CT+0.12, (z0+z1)/2, 0.5, 0, "#a8a49a");
    floorAt("wood", x0, x1, z0, z1, FL, "#a07a56", 0.9);
    addFlat(x0, x1, z0, z1, FL);
    // and the cellar's ceiling under the slab, facing down, inside the cellar only
    const cx0=Math.max(x0, C.x0), cx1=Math.min(x1, C.x1), cz0=Math.max(z0, C.z0), cz1=Math.min(z1, C.z1);
    if(cx1>cx0 && cz1>cz0) ceilAt("plaster", cx0, cx1, cz0, cz1, CT-0.005, "#cfc8b8", 0.5);
  }
  // the bothy's foundation round the cellar: a concrete ring under its walls, down to the cellar's floor
  // the cellar's walls: block, from its floor to the slab, each a few millimetres short of the next
  const W=0.2;
  wallBox("block", C.x0-W, C.x0, C.z0-W, C.z1+W, CF-0.3, CT, "#a8a294", 0.5, CF);
  wallBox("block", C.x1, C.x1+W, C.z0-W, C.z1+W, CF-0.3, CT, "#a8a294", 0.5, CF);
  wallBox("block", C.x0+0.003, C.x1-0.003, C.z0-W, C.z0, CF-0.3, CT, "#a8a294", 0.5, CF);
  wallBox("block", C.x0+0.003, C.x1-0.003, C.z1, C.z1+W, CF-0.3, CT, "#a8a294", 0.5, CF);
  floorAt("concrete", C.x0, C.x1, C.z0, C.z1, CF, "#9a968c", 0.5);
  // the stair: fifteen treads, each a solid block to the floor, the rise 21 cm and the run 40
  const N=15, rise=(FL-CF)/N, run=(S.x1-S.x0)/N;
  // (each runs 4 mm on under the next one down, and every other one is 3 mm narrower each side, so no two treads' faces
  //  lie in one plane; the top one stops at the slab's edge)
  for(let k=0;k<N;k++){ const xa=S.x1-k*run, xb=xa-run-0.004, top=FL-(k+1)*rise, inz=k%2 ? 0.003 : 0, bot=CF-(k%2 ? 0.026 : 0.02);
    bx("wood", xa-xb, top-bot, S.z1-S.z0-2*inz, (xa+xb)/2, (top+bot)/2, (S.z0+S.z1)/2, 0.8, 0, k%2 ? "#8a6a4a" : "#946f4c"); }
  addRamp(S.x0, S.x1, S.z0, S.z1, "x", S.x0-run*0.5, S.x1, CF, FL);
  // the wall between the stair and the room, from the cellar floor to the slab, open at the stair's foot
  wallBox("block", S.x0, C.x1-0.003, S.z0-0.15, S.z0, CF-0.3, CT, "#a8a294", 0.5, CF);
  // a rail down the stair's open side in the bothy above
  for(const x of [S.x0+0.05, S.x1-0.05]) bx("steel", 0.04, 0.95, 0.04, x, FL+0.47, S.z0-0.05, 0, 0, "#9aa0a3");
  bx("steel", S.x1-S.x0, 0.04, 0.05, (S.x0+S.x1)/2, FL+0.95, S.z0-0.05, 0, 0, "#9aa0a3");
  addCol(S.x0, S.x1, S.z0-0.09, S.z0-0.01, FL, FL+1.0);
  // what is down there: shelves of jars, barrels, a bench, a radio that glows
  for(const z of [C.z0+0.25]){ for(const y of [0.4, 0.9, 1.4]) bx("wood", 6.0, 0.03, 0.4, -56, CF+y, z, 0.8, 0, "#7a5a3e");
    for(let x=-58.8; x<-53.2; x+=0.22) for(const y of [0.4, 0.9, 1.4]) cyl("glass", 0.06, 0.06, 0.16, 10, x, CF+y+0.095, z, "#ffffff");
    addCol(-59, -53, C.z0, C.z0+0.5, CF-0.5, CF+1.6); }
  for(const [x,z] of [[-59.3,-36],[-59.3,-37.2]]){ cyl("wood", 0.32, 0.28, 0.85, 18, x, CF+0.425, z, "#6a4a2e"); addCol(x-0.34, x+0.34, z-0.34, z+0.34, CF-0.5, CF+0.85); }
  bx("wood", 1.6, 0.06, 0.7, -54, CF+0.85, -36.4, 0.8, 0, "#8a6a4a"); addCol(-54.8, -53.2, -36.75, -36.05, CF-0.5, CF+0.88);
  bucketOf("radioglow", ()=>glowMat({color:0x221a10, emissive:0xffb050, emissiveIntensity:0.6}, "always"));
  bx("wood", 0.36, 0.24, 0.18, -54.2, CF+1.0, -36.5, 0.6, 0, "#5a3a22"); bx("radioglow", 0.16, 0.08, 0.01, -54.2, CF+1.02, -36.405, 0, 0, "#ffffff");
  addSeat(-54, -35.6, CF, Math.PI, "A CRATE BY THE BENCH", false, 0.76);
  // the rules: a void (stand on its floor), the room's indoor zone, the buried volumes, an under lamp
  addVoid(C.x0, C.x1, C.z0, C.z1, CF-0.5, FL-0.01, CF);
  addZone(C.x0, C.x1, C.z0, C.z1, CF-0.5, CT, "THE ROOT CELLAR", true);
  addBuried(C.x0, C.x1, S.z0, C.z1, -1.6, 2.2, 0.55, null, [FL+EYE, CF+EYE*0.6]);   // the stair: by degrees, as you go down
  addBuried(C.x0, C.x1, C.z0, C.z1, CF-1, CT+1.0, 0.5);                          // the room: held at half the fixed fill
  LAMPS.push({x:-56, y:CT-0.35, z:-36.5, color:0xffd8a0, intensity:0.9, dist:9, decay:1.5, under:true});
  LAMPS.push({x:-55.6, y:-1.2, z:-32.9, color:0xffd8a0, intensity:0.35, dist:5, decay:1.5, under:true});
  bucketOf("bulb", ()=>emitMat(0xffe0b0, 1.0, "always"));
  push("bulb", new T.SphereGeometry(0.05, 12, 8), -56, CT-0.2, -36.5, 0, "#ffffff"); cyl("metal", 0.008, 0.008, 0.08, 6, -56, CT-0.14, -36.5, "#3a3a3a");
  WORLD_SPOTS.cellar={x:-56, z:-35.5, y:CF};
  WORLD_SPOTS.stairTop={x:-52.2, z:-32.9, y:FL};
}
