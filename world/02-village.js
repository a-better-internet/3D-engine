"use strict";
/* WORLD · 02-village.js
   what stands on the green: the general store (brick, a gable, its lot), the
   cabin (siding), the pavilion with its picnic tables, the jetty, lamp posts,
   benches, a fire ring, signs, and the cars in the lot
   Everything here goes through the engine's kit (09-building, 13-props). */

/* ---- the general store -----------------------------------------------------------
   Brick, a shingled gable along its length, the front to the lot (its south
   side). A storefront door and two big windows on the front, a window at each
   end, a steel door at the back. Inside: a counter, shelves, a cooler that
   glows. */
const STORE=building({
  x0:-30, x1:-14, z0:-32, z1:-22, floor:0.15, height:3.4, t:0.3,
  outer:{bk:"brick", color:BRICK}, inner:{bk:"plaster", color:"#ece4d2"},
  floorMat:{bk:"quarry", color:"#ffffff"}, ceiling:{bk:"plaster", color:"#f2eee4"},
  openings:[
    {side:"s", at:8,   door:"store", label:"THE STORE'S DOOR", w:1.0, h:2.12},
    {side:"s", at:3.6, window:true, w:2.6, sill:0.7, head:2.4, trim:"#e8e4d8"},
    {side:"s", at:12.4, window:true, w:2.6, sill:0.7, head:2.4, trim:"#e8e4d8"},
    {side:"w", at:5,   window:true, w:1.2, sill:1.0, head:2.2, curtain:"#a8403a"},
    {side:"e", at:5,   window:true, w:1.2, sill:1.0, head:2.2, curtain:"#a8403a"},
    {side:"n", at:12,  door:"steel", label:"THE BACK DOOR", latch:true},
  ],
  roof:{kind:"gable", along:"x", ridge:6.4, over:0.5, bk:"shingle", color:"#ffffff", ends:{bk:"siding", color:CREAM}},
  name:"THE GENERAL STORE", lamps:3, lampColor:0xfff4e0,
});
{ const I=STORE.inner, F=STORE.floor;
  // the counter by the door, the till on it
  bx("wood", 3.2, 0.95, 0.7, -18.2, F+0.475, -24.6, 0.6, 0, "#8a5a3a");
  bx("paintm", 0.42, 0.26, 0.34, -17.4, F+1.08, -24.6, 0.5, 0, "#3a3c40");
  addCol(-19.85, -16.55, -25.0, -24.2, F-0.5, F+1.0);
  // shelves along the back wall and an island, cans and boxes on them
  for(const [x0,x1,z,d] of [[-29.5,-21,-31.35,0.5],[-27,-21,-27.6,0.9]]){
    for(const y of [0.1, 0.55, 1.0, 1.45]) bx("paintm", x1-x0, 0.03, d, (x0+x1)/2, F+y, z, 0.5, 0, "#c8ccc8");
    for(const x of [x0, x1]) bx("paintm", 0.05, 1.6, d+0.02, x, F+0.8, z, 0.5, 0, "#9aa0a0");     // (the uprights straddle the shelves' ends)
    addCol(x0, x1, z-d/2, z+d/2, F-0.5, F+1.6);
    for(let x=x0+0.25; x<x1-0.2; x+=0.32) for(const y of [0.55, 1.0, 1.45]){ const h=0.14+hash2(x,y)*0.14;
      bx("paintm", 0.22, h, d*0.6, x, F+y+0.016+h/2, z, 0, 0, ["#c83a2a","#e8c23a","#3a6aa8","#2e7a4a","#e8e4d8"][((x*7+y*3)|0)%5]); } }
  // the cooler: a glowing case at the east end
  bucketOf("coolerglow", ()=>glowMat({color:0xffffff, emissive:0xe8f2ff, emissiveIntensity:0.55}, "indoor"));
  bx("paintm", 0.8, 2.0, 2.4, I.x1-0.42, F+1.0, -28.6, 0.5, 0, "#e8e8e4");
  bx("coolerglow", 0.02, 1.6, 2.1, I.x1-0.83, F+1.05, -28.6, 0, 0, "#ffffff");
  push("glass", planeGeo(1.9, 1.5, 0), I.x1-0.85, F+1.05, -28.6, Math.PI/2, "#ffffff");
  addCol(I.x1-0.84, I.x1, -29.85, -27.35, F-0.5, F+2.0);
  // a stool behind the counter, and the shopkeeper's chair by the window
  addSeat(-18.2, -23.75, F, Math.PI, "A STOOL BY THE COUNTER", false, 0.34);
}
// its sign over the door, a centimetre proud of a board that stands proud of the brick
{ const tex=signTex(1024, 192, (c,W,H)=>{ c.fillStyle="#2b4a32"; rrect(c,0,0,W,H,18); c.fill();
    c.strokeStyle="#e8d8a8"; c.lineWidth=8; rrect(c,14,14,W-28,H-28,12); c.stroke();
    c.fillStyle="#f2e6c0"; fitText(c, "PINE HOLLOW GENERAL STORE", W*0.80, H*0.5, W/2, H/2, "700", "Georgia, serif"); });
  bx("wood", 6.2, 1.1, 0.08, -22, 3.0, -21.80, 0.5, 0, "#3a2a1e");
  signPanel(5.9, 1.04, tex, -22, 3.0, -21.745, 0); }

/* ---- the cabin ---------------------------------------------------------------------
   Cream siding, its gable along z, a painted door in its south end and a window
   either side. Bunks inside, a table, a lamp. */
const CABIN=building({
  x0:10, x1:20, z0:-42, z1:-32, floor:0.25, height:2.7, t:0.22,
  outer:{bk:"siding", color:"#ffffff", uv:0.6}, inner:{bk:"wood", color:"#d8b890", uv:0.8},
  floorMat:{bk:"wood", color:"#b08a62", uv:0.9}, ceiling:{bk:"wood", color:"#c8a07a", uv:0.9},
  openings:[
    {side:"s", at:5, door:"closet", label:"THE CABIN DOOR", tint:0x6a3a2a},
    {side:"e", at:3, window:true, w:1.0, sill:0.95, head:1.95, curtain:"#e8d8b0"},
    {side:"w", at:7, window:true, w:1.0, sill:0.95, head:1.95, curtain:"#e8d8b0"},
  ],
  roof:{kind:"gable", along:"z", ridge:5.4, over:0.45, bk:"roofmetal", color:"#a84030", ends:{bk:"siding", color:"#ffffff"}},
  name:"THE CABIN", lamps:1, lampColor:0xffd8a0, lampIntensity:0.8,
});
{ const F=CABIN.floor;
  // a bunk against the north wall, a table and two chairs
  bx("wood", 2.0, 0.35, 0.95, 14, F+0.35, -41.28, 0.8, 0, "#7a5236"); bx("fabric", 1.9, 0.14, 0.88, 14, F+0.6, -41.28, 0, 0, "#3a5a8a");
  addCol(13, 15, -41.78, -40.8, F-0.5, F+0.7);
  addSeat(14, -40.4, F, Math.PI, "A BUNK", true);
  bx("wood", 1.0, 0.05, 0.7, 17.6, F+0.74, -36.5, 0.8, 0, "#8a5a3a");
  for(const [dx,dz] of [[-0.42,-0.28],[0.42,-0.28],[-0.42,0.28],[0.42,0.28]]) bx("wood", 0.05, 0.72, 0.05, 17.6+dx, F+0.36, -36.5+dz, 0.8, 0, "#6a4a2e");
  addCol(17.05, 18.15, -36.9, -36.1, F-0.5, F+0.77);
  for(const [z, ry] of [[-37.4, 0],[-35.6, Math.PI]]){ bx("wood", 0.44, 0.04, 0.42, 17.6, F+0.46, z, 0.8, 0, "#7a5236");
    addSeat(17.6, z, F, ry, "A CHAIR AT THE TABLE"); }
  // a step up to the door
  bx("wood", 1.4, 0.12, 0.62, 15, F-0.08, -31.64, 0.8, 0, "#7a5236"); addFlat(14.3, 15.7, -32.0, -31.33, F-0.02);
  emergencyLight(15, F+2.45, -41.7, 0, [10.2, 19.8, -41.8, -32.2, F-0.5, F+2.8]);
}

/* ---- the pavilion ------------------------------------------------------------------
   An open shelter on six timber posts: a gable roof, picnic tables under it.
   addRoof keeps the rain off what is under it. */
{ const P={x0:20, x1:32, z0:0, z1:9}, top=2.8, ridge=4.4;
  for(const x of [P.x0+0.15, (P.x0+P.x1)/2, P.x1-0.15]) for(const z of [P.z0+0.15, P.z1-0.15]){
    bx("beam", 0.24, top, 0.24, x, top/2, z, 0.7, 0, "#7a5236"); addCol(x-0.13, x+0.13, z-0.13, z+0.13, -0.5, top); }
  for(const z of [P.z0+0.15, P.z1-0.15]) bx("beam", P.x1-P.x0+0.1, 0.24, 0.20, (P.x0+P.x1)/2, top+0.12, z, 0.7, 0, "#7a5236");
  gableRoof("shingle", P, top+0.24, ridge, "x", 0.5, 0.14, "#ffffff");
  addRoof(P.x0-0.5, P.x1+0.5, P.z0-0.5, P.z1+0.5, top);
  addZone(P.x0, P.x1, P.z0, P.z1, -0.5, ridge, "THE PAVILION", false);
  paveRect("walkflat", P.x0-0.6, P.x1+0.6, P.z0-0.6, P.z1+0.6, "#ffffff");
  picnicTable(23.5, 4.5, Math.PI/2, "#94573a", PAVE_T);
  picnicTable(28.5, 4.5, Math.PI/2, "#8a5a3a", PAVE_T);
  LAMPS.push({x:26, y:top-0.2, z:4.5, color:0xffe0b0, intensity:0.7, dist:10, decay:1.5, mothy:true});
  bx("lamplens", 0.30, 0.10, 0.30, 26, top+0.04-0.06, 4.5, 0, 0, "#ffffff"); }

/* ---- the jetty ------------------------------------------------------------------------
   Boards on posts out over the pond from its west bank, where the bank's wall is
   open (01). A bench at its end. */
{ const x0=POND.x-POND.r-2.4, x1=POND.x-POND.r+6.5, z0=POND.z-1.0, z1=POND.z+1.0, y=0.12;
  for(let x=x0; x<x1; x+=0.16) bx("wood", 0.145, 0.04, z1-z0, x+0.08, y-0.02, (z0+z1)/2, 0.9, 0, ["#8a8070","#7d7466","#948a7a"][((x*31)|0)%3]);
  for(const x of [x0+0.6, (x0+x1)/2, x1-0.15]) for(const z of [z0+0.08, z1-0.08]) cyl("wood", 0.08, 0.08, 1.6, 10, x, y-0.8, z, "#5a4632");
  addFlat(x0, x1, z0, z1, y);
  // its rails along the sides, solid; open at the bank
  for(const z of [z0, z1]){ addCol(x0+1.6, x1, z-0.05, z+0.05, y-0.5, y+1.0); bx("wood", x1-x0-1.6, 0.06, 0.06, (x0+1.6+x1)/2, y+0.9, z, 0.9, 0, "#7a5a3e"); }
  addCol(x1-0.05, x1+0.05, z0, z1, y-0.5, y+1.0);
  parkBench(x1-1.1, POND.z, -Math.PI/2, y);
  WORLD_SPOTS.jetty={x:x1-0.6, z:POND.z, y:y};
}

/* ---- round the green: lamp posts, benches, bins, a fire ring, a flower bed -------------- */
for(const [x,z] of [[-10,-6],[10,-6],[-36,6],[36,-12],[0,36],[-30,40],[60,30],[22,50]]) lampPost(x, z, 4.6);
for(const [x,z,ry] of [[-6,24,Math.PI],[6,24,Math.PI],[30,46,-0.6],[54,12,-2.4]]) parkBench(x, z, ry);
for(const [x,z,ry] of [[-9.5,24,Math.PI],[-13,-18.6,0]]) swingCan(x, z, ry);
const FIRE=campfire(-40, 30, 1, false);
for(let k=0;k<5;k++){ const a=k/5*Math.PI*2+0.3, x=-40+Math.cos(a)*2.4, z=30+Math.sin(a)*2.4;
  push("logbark", FOREST.barkCyl(0.22, 0.2, 1.3, 9), x, groundY(x,z)+0.2, z, -a+Math.PI/2, "#6a5a48", 0, Math.PI/2);
  addSeat(x, z, groundY(x,z), Math.atan2(x+40, z-30), "A LOG BY THE FIRE", false, 0.86); }
// a bed of river rock with clipped shrubs and the butterflies, in front of the store
bx("block", 6.0, 0.18, 0.12, -22, 0.09, -18.2, 0.5, 0, "#b8b4aa");
paveRect("mulchbed", -25, -19, -18.9, -18.26, "#ffffff");
for(const x of [-24.2, -22.6, -21.0, -19.6]) FOREST.plant("bush", x, -18.6, {scale:0.55, solid:false, y:0.03});
KEEP_OFF.push({x0:-25, x1:-19, z0:-18.9, z1:-18.2});

/* ---- the village sign on the green ------------------------------------------------------ */
{ const tex=signTex(768, 384, (c,W,H)=>{ c.fillStyle="#6a4a2e"; rrect(c,0,0,W,H,26); c.fill();
    c.strokeStyle="#e8d8b0"; c.lineWidth=10; rrect(c,18,18,W-36,H-36,16); c.stroke();
    c.fillStyle="#f2e6c8"; const lines=["PINE HOLLOW","EST. 1887"], sz=[H*0.30, H*0.15];
    fitText(c, lines[0], W*0.78, sz[0], W/2, H*0.42, "700", "Georgia, serif"); fitText(c, lines[1], W*0.5, sz[1], W/2, H*0.70, "500", "Georgia, serif"); });
  for(const dx of [-1.15, 1.15]) bx("beam", 0.16, 2.4, 0.16, 2+dx, 1.2, 4, 0.7, 0, "#5a4632");
  bx("wood", 2.2, 1.12, 0.08, 2, 1.7, 4, 0.5, 0, "#4a3424");
  signPanel(2.1, 1.05, tex, 2, 1.7, 4.051, 0);
  signPanel(2.1, 1.05, tex, 2, 1.7, 3.949, Math.PI);
  addCol(0.75, 3.25, 3.9, 4.1, -0.5, 2.4); }

/* ---- the cars in the lot: any of them you can drive (E) ------------------------------------ */
parkCar(-33.4, -11.2, 0, 1, CAR_PAINTS[4], PAVE_T);
parkCar(-27.0, -11.4, 0.04, 0, CAR_PAINTS[5], PAVE_T);
parkCar(-17.4, -11.0, -0.03, 2, CAR_PAINTS[2], PAVE_T);
// a box truck at the store's side door: scenery, with a collider
{ const m=buildVehicleMesh(4, "#e8e7e2", null, 0); const S=m.spec; m.g.position.set(-8.2, 0, -28); m.g.rotation.y=Math.PI; scene.add(m.g);
  WHEEL_POOL.register({g:m.g, lod:m.lod, spin:0}, S);
  addColOB(-8.2, -28+(S.nose+S.tail)/2*-1, Math.PI, S.hw+0.03, (S.nose-S.tail)/2, 0, S.ht); }
