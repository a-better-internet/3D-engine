"use strict";
/* WORLD · 00-world.js — PINE HOLLOW, the engine's demo world
   The world's config: loaded BEFORE the engine (index.html), so it is plain
   data. Anything left out takes engine/00-config.js's default. */
var WORLD={
  name:"PINE HOLLOW",
  storageKey:"pinehollow",
  seed:4242,
  spawn:{x:0, z:14, yaw:0},                    // on the green, the store ahead (yaw 0 looks north, down −z)
  groundEdge:{x0:-2400, x1:2400, z0:-2400, z1:2400},
  droneBounds:{x0:-900, x1:900, z0:-900, z1:900, ceil:260},
  day:{duration:1200, startHour:9.5, sun:{summer:[6.0,20.6], autumn:[7.3,18.6]}},
  fog:{near:160, far:1300},
  climate:{summer:[58,79], autumn:[38,56]},
  plan:{x0:-260, x1:260, z0:-260, z1:260, scale:0.8},
  planLabel:"PINE HOLLOW",
  hud:{title:"PINE HOLLOW", subtitle:"a demo world · 3D engine"},
  boot:{title:"PINE HOLLOW", subtitle:"a demo world for the engine", go:"CLICK TO WALK IN",
        hint:"the woods are growing · give it a moment", toast:"Y FOR AUTUMN  ·  N FOR NIGHTFALL  ·  K TO CALL THE DOG"},
  edgeMessage:"THE WOODS ARE TOO THICK TO GO ON. YOU CAN'T WALK ANY FURTHER THIS WAY",
  extraKeys:[["Call the dog","<kbd>K</kbd>"],["Warp (testing)","<kbd>`</kbd>"]],
};
