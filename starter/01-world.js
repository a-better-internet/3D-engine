"use strict";
/* STARTER · 01-world.js — the ground, some woods round a clearing, one building, a lamp, a bench, a person and a dog.
   Everything is inside this block, so none of its names can collide with the engine's (tools/globals.js). */
{
  const CLEAR={x0:-40, x1:40, z0:-40, z1:40};
  const WOODS={x0:-160, x1:160, z0:-160, z1:160};

  // the ground: rolling country, graded level in the clearing
  Terrain.define({
    height:(x, z)=>Terrain.toward(Terrain.natural(x, z), 0, Terrain.boxDist(CLEAR, x, z), 0, 40),
    clear:(x, z)=>Terrain.boxSD(CLEAR, x, z),
  });
  const rings=terrainRings({cx:0, cz:0, levels:[{cell:2, half:176}, {cell:8, half:800}, {cell:16, half:1700}]});
  buildTerrain(rings);

  // woods all round, the canopy beyond them, and the edge of the world
  FOREST.setZone(WOODS);
  FOREST.wild(WOODS); FOREST.understory(WOODS, {density:0.6});
  const r8=rings.find(r=>r.cell===8), r32=rings.find(r=>r.cell===32);
  FOREST.canopy([{box:r8, cell:8, holes:[WOODS]}, {box:r32, cell:32, holes:[r8]}], {curtain:WOODS});
  FOREST.bounds(WOODS, {inset:22});

  // a building with a door and two windows, a lamp post and a bench
  const hut=building({x0:-6, x1:6, z0:-14, z1:-6, floor:0.15, height:3.0,
    outer:{bk:"siding", color:"#ffffff"}, inner:{bk:"plaster"},
    openings:[{side:"s", at:6, door:"closet", label:"THE DOOR"},
              {side:"s", at:2.5, window:true}, {side:"s", at:9.5, window:true}],
    roof:{kind:"gable", along:"x", bk:"shingle"}, name:"THE HUT"});
  lampPost(-4, 0, 4.6);
  parkBench(4, 2, Math.PI);

  // somebody on the bench, and a dog that follows you
  const G=crowdGroup("the clearing", 0, 0, 160);
  crowdAdd(G, {seed:7, x:4, z:2.32, yaw:Math.PI, mode:"sit", sitY:0.515, held:"cup", drink:true});
  PETS.add(makeDog("#c8a060", 0.9, 1.5, 17), {mode:"follow"});

  // for testing: a warp to the hut, and a route through its door for tools/walk.js
  warpTo("THE HUT", 0, -10, 0, hut.floor);
  window.WORLD_ROUTES={"into the hut":[[0,16],[0,-4],[0,-5.6],[0,-6.6],[0,-9]]};
}
