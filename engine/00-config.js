"use strict";
/* ENGINE · 00-config.js
   the world's config merged over the engine's defaults, the global
   constants every other file reads, and the hook lists a world (or a game
   inside one) plugs into instead of editing engine files.
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html and docs/ARCHITECTURE.md. */
/* =========================================================================
   A hand-rolled first-person world engine on three.js r128: canvas-drawn
   textures, layered lighting (sky fill, one shadow-casting sun/moon key, a
   pool of real point lights moved onto the nearest lamps, glowing
   emissives for the rest), AABB colliders with walkable plates and ramps,
   and a fixed 1/60 s simulation step. No build step and no asset files.

   COORDINATES. Metres; +y up; +x east; +z SOUTH. Yaw 0 looks down -z,
   which the compass calls north. A group's rotation.y = t sends a local
   offset (dx, dz) to (dx·cos t + dz·sin t, −dx·sin t + dz·cos t): use 01's
   XF() frames rather than working that out by hand.
   ========================================================================= */

/* ----------------------------------------------------------------------
   0 · CONFIG
   A world declares `var WORLD = {...}` in a script loaded BEFORE this one
   (world/00-world.js in the demo). Anything it leaves out takes the value
   below. Only plain data goes in here; anything that needs the engine's
   helpers is built by the world's own files after the engine has loaded.
   ---------------------------------------------------------------------- */
const ENGINE_DEFAULTS={
  name:"UNTITLED WORLD",
  storageKey:"engine",                 // localStorage prefix: <key>.gfx, <key>.audio ...
  seed:1979,                           // the deterministic rng (01's rnd) starts here
  spawn:{x:0, z:0, yaw:0},             // where you start, and which way you face
  eye:1.66,                            // eye height over your feet
  playerR:0.34,                        // the walker's half-width (it is a square, not a circle)
  gaits:{walk:3.05, run:5.6, sprint:10.4},
  stepUp:0.62,                         // the highest step you climb without a stair
  // the ground's own outer edge: the last ring of terrain is drawn to it, and the haze
  // takes the world wholly into the sky over the last 200 m before it (03)
  groundEdge:{x0:-2400, x1:2400, z0:-2400, z1:2400},
  // the drone's box and ceiling
  droneBounds:{x0:-1500, x1:1500, z0:-1500, z1:1500, ceil:240},
  // the day: how long a whole one lasts in real seconds, sunrise and sunset
  // for each season, and the hour you arrive at
  day:{duration:1320, startHour:9.25, sun:{summer:[6.05,20.75], autumn:[7.45,18.75]}},
  latitudeTilt:0.96,                   // the star pole's tilt (≈ 35° above the horizon)
  // the sky's palette (hex) by day, at sunset and at night: see 05's DayNight
  sky:null,
  // fog distances by day (they stretch a little at night)
  fog:{near:150, far:1250},
  // degrees F by season: [low, high]
  climate:{summer:[61,81], autumn:[40,58]},
  weather:{auto:true},                 // false: the weather never changes by itself
  season:"summer",                     // "summer" | "autumn"
  // an outdoor equirectangular reflection painter for paint, glass and chrome (04b's ENV);
  // null takes the default (blue sky, a treeline, grey ground)
  envPainter:null,
  plan:{x0:-200, x1:200, z0:-200, z1:200, scale:1.0},   // the minimap's painted extent (18)
  hud:{title:null, subtitle:null},
  boot:{title:null, subtitle:null, hint:"the world is building · give it a moment"},
  edgeMessage:"YOU CAN'T GO ANY FURTHER THIS WAY",
  audio:{birds:true, insects:true, wind:true},
  images:{}, imageProxy:"",            // hosted pictures for image slots (01's artTex/hosted)
};
// a deep merge of plain objects; arrays and everything else are replaced whole
function _cfgMerge(a, b){
  const o=Array.isArray(a) ? a.slice() : Object.assign({}, a);
  if(!b) return o;
  for(const k in b){
    const v=b[k];
    if(v && typeof v==="object" && !Array.isArray(v) && a && a[k] && typeof a[k]==="object" && !Array.isArray(a[k])) o[k]=_cfgMerge(a[k], v);
    else o[k]=v;
  }
  return o;
}
const CFG=_cfgMerge(ENGINE_DEFAULTS, (typeof WORLD!=="undefined") ? WORLD : {});

/* the handful of constants the whole engine reads by name */
const SPAWN   = CFG.spawn;
const EYE     = CFG.eye;
const PLAYER_R= CFG.playerR;
const GROUND_EDGE=CFG.groundEdge;
const STEP_UP = CFG.stepUp;

/* ----------------------------------------------------------------------
   0b · IMAGE SLOTS
   Printed surfaces are drawn on canvases at build time. Any slot can be
   replaced by a hosted picture: put a URL against the key in
   WORLD.images and it is loaded at run time, if the host allows
   cross-origin reads, with the canvas art as the fallback. Each slot has a
   FIXED aspect ratio (w:h); a world may add its own to SLOT.
   ---------------------------------------------------------------------- */
const SLOT = { brochure:[4,9], poster:[3,4], map:[3,2], vend:[1,2], tv:[4,3], square:[1,1], wide:[16,9] };
const IMAGE_PROXY=CFG.imageProxy||"";
const IMAGES = CFG.images||{};

/* ----------------------------------------------------------------------
   0c · HOOKS
   The engine never names a world's systems. A world, a game or a mode adds
   itself to these lists and the engine calls them at the right moment.
   onHook(name, fn, order): lower `order` runs first (default 0).

     key(e)          keydown, before the engine's own keys. Return true to
                     take the key (a game that owns the keyboard while it
                     is on). The chain stops at the first true.
     keyup(e)        every keyup.
     look(dx,dy)     mouse/touch look. Return true to take it (a game that
                     uses the mouse as a paddle, a chase camera).
     lookScale()     a multiplier on look speed (a scope, a sight). All
                     are multiplied together.
     fixed(dt)       the start of every 1/60 s step. Return true and the
                     player does not move this step (you are down, at a
                     game's controls, on a boat).
     camera(dt)      after the engine has placed the camera. Return true
                     if this hook has placed it itself (a chase view).
     interact()      E, before cars, doors and uses. True takes it.
     prompt()        a string to show as the centre prompt instead of the
                     engine's, "-" to hide it, or null/undefined to pass.
     frame(dt, now, dark, dn)   every drawn frame, after the lights.
     atmos(dt, dn, under)       after the haze is set: a mode's own fog.
     render()        after the main draw (an overlay scene, a gun).
     build()         once, after everything is baked, before the warm-up.
     start()         once, when the player clicks in.
     placeName(x,z)  the HUD's location when no zone holds you. First
                     non-empty string wins.
     sky(img, day, set, night)  repaint the sky's four stops (a mode's own
                     sky); img.top/mid/low/hz are THREE.Colors.
     wheel(e)        the mouse wheel. True takes it (a mode that changes
                     guns with it); otherwise it zooms.
   ---------------------------------------------------------------------- */
const HOOKS={key:[], keyup:[], look:[], lookScale:[], fixed:[], camera:[], interact:[], prompt:[],
             frame:[], atmos:[], render:[], build:[], start:[], placeName:[], sky:[], wheel:[]};
function onHook(name, fn, order){
  const L=HOOKS[name];
  if(!L) throw new Error("onHook: no hook called "+name);
  L.push({fn:fn, o:order||0}); L.sort((a,b)=>a.o-b.o);
  return fn;
}
// the first hook that returns something truthy wins; its value is returned
function runHookUntil(name, a, b, c, d){
  const L=HOOKS[name];
  for(let i=0;i<L.length;i++){ const r=L[i].fn(a, b, c, d); if(r) return r; }
  return null;
}
function runHooks(name, a, b, c, d){
  const L=HOOKS[name];
  for(let i=0;i<L.length;i++) L[i].fn(a, b, c, d);
}
// a frame hook with its own name, so a world can find it again (and an error in one never stops the rest)
function onFrame(fn, order){ return onHook("frame", fn, order); }
