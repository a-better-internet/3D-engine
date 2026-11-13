"use strict";
/* WORLD · 04-life.js
   who lives in Pine Hollow: people on the green (14q's crowds), the dogs and a
   cat (14t), butterflies and squirrels (14c), the sounds of the place, the dog
   you can call, the warp list and the routes the walk test takes */

/* ---- people on the green ---------------------------------------------------------------- */
const folk=(o)=>Object.assign({h:1.0, skin:SKINS[1], hair:HAIRS[1], shirt:"#4a6a8a", pants:"#3b4a66", shoes:"#f2f0ea"}, o);
const GREEN_FOLK=crowdGroup("the green", 0, 0, 190);
GREEN_FOLK.bounds={x0:GREEN.x0+1, x1:GREEN.x1-1, z0:GREEN.z0+1, z1:GREEN.z1-1};
// a man on the bench by the sign with the paper; two neighbours talking by the store
crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[3], hair:HAIRS[5], shirt:"#5d6a73", pants:"#24272c", long:true}), x:-6, z:24.32, yaw:Math.PI, mode:"sit", sitY:0.515, held:"paper", heldL:true, sway:0.3});
crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[0], hair:HAIRS[3], shirt:"#c86a8a", pants:"#2c3446", female:true, h:0.95}), x:-8.6, z:-17.6, yaw:Math.PI/2, mode:"stand", job:"talk", held:"cup", dayOnly:true});
crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[2], hair:HAIRS[0], shirt:"#3d6e44", pants:"#5c5a52", cap:"#1f3b6e"}), x:-7.4, z:-17.7, yaw:-Math.PI/2, mode:"stand", job:"talk", dayOnly:true});
// a jogger round the green, and a woman walking her dog the other way
crowdAdd(GREEN_FOLK, {look:folk({h:1.03, skin:SKINS[4], hair:HAIRS[0], shirt:"#e6531c", pants:"#1d1f22", shorts:true}), mode:"walk", run:true, loop:true, speed:2.8,
  path:crowdRound([[-50,-2],[-12,-3],[12,-3],[60,-10],[64,20],[48,54],[0,54],[-50,50],[-60,20]], 6, true)});
crowdAdd(GREEN_FOLK, {look:folk({female:true, h:0.96, skin:SKINS[0], hair:HAIRS[2], shirt:"#7a4f8a", pants:"#2c3446", long:true}), mode:"walk", loop:true, speed:1.1, dog:"#c8a060",
  path:crowdRound([[-48,50],[0,50],[44,52],[60,22],[58,-8],[14,-1],[-14,-1],[-56,18]], 5, true)});
// the fisherman at the end of the jetty, his rod out over the water
{ const J=WORLD_SPOTS.jetty;
  crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[1], hair:HAIRS[2], shirt:"#7a8a5a", pants:"#5c5a52", long:true, cap:"#7a6a3a", beard:"#6b4a2b"}),
    x:J.x-1.6, z:J.z+0.35, y:J.y, yaw:Math.PI/2, mode:"stand", job:"fish", held:"rod",
    tick:(p, dt)=>{ const c=(p.t/30+0.2)%1; p.jig=0.42*smoothstep(0.79, 0.805, c)*(1-smoothstep(0.86, 0.95, c));
      if(p.jig>0.3 && Math.random()<dt*3) WATER.wakeDrop(J.x+3.0, J.z+0.4, 0.3); } }); }
// a couple at the pavilion's first table, a drink each
crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[2], hair:HAIRS[4], shirt:"#b33a3a", pants:"#3b4a66", belly:true}), x:23.5, z:3.88, y:PAVE_T, yaw:0, mode:"sit", sitY:0.515, held:"can", drink:true, sway:0.25});
crowdAdd(GREEN_FOLK, {look:folk({female:true, h:0.95, skin:SKINS[1], hair:HAIRS[0], shirt:"#e8e4d8", pants:"#5c5a52"}), x:23.5, z:5.12, y:PAVE_T, yaw:Math.PI, mode:"sit", sitY:0.515, held:"cup", drink:true, sway:0.3});
// the shopkeeper behind the counter, on the phone
crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[0], hair:HAIRS[4], shirt:"#2f5f8a", pants:"#24272c", long:true, beard:"#8d8a86"}), x:-18.2, z:-23.4, y:STORE.floor, yaw:Math.PI, mode:"phone", sway:0.3});
// by the fire after dark: two on the logs, warming their hands
for(const [k, L] of [[0, {skin:SKINS[3], hair:HAIRS[0], shirt:"#2a2a2c", pants:"#3b4a66", hoodie:true}], [2, {female:true, h:0.95, skin:SKINS[1], hair:HAIRS[3], shirt:"#8aa86a", pants:"#2c3446", long:true, beanie:"#c42a1a"}]]){
  const a=k/5*Math.PI*2+0.3, x=-40+Math.cos(a)*2.4, z=30+Math.sin(a)*2.4;
  crowdAdd(GREEN_FOLK, {look:folk(L), x:x+Math.cos(a)*0.05, z:z+Math.sin(a)*0.05, yaw:Math.atan2(-40-x, 30-z), mode:"sit", sitY:0.42, when:()=>DayNight.state.dark>0.5, sway:0.2}); }

/* ---- the dogs and the cat ---------------------------------------------------------------------------
   Rufus follows you (K calls him to heel or sends him off to play); Bella fetches for the man in the red
   cap in the middle of the green; a little white terrier noses about and comes to say hello; a husky
   lies in the shade of the big maple; and the store cat wanders round the bothy. */
const THROWER=crowdAdd(GREEN_FOLK, {look:folk({skin:SKINS[2], hair:HAIRS[5], shirt:"#3d6e44", pants:"#5c5a52", cap:"#b3151b", beard:"#3a2a1a"}), x:18, z:24, yaw:Math.PI*0.75, mode:"stand", job:"throw", dayOnly:true});
const BELLA=makeDog("#d8b070", 1.0, 19, 23);
PETS.add(BELLA, {mode:"fetch", thrower:THROWER, box:{x0:-4, x1:44, z0:10, z1:54}, dayOnly:true});
const RUFUS=makeDog("#7a4a2a", 0.95, SPAWN.x+1.5, SPAWN.z+1.0);
const RUFUS_E=PETS.add(RUFUS, {mode:"follow"});
PETS.add(makeDog("#f2ece0", 0.56, -10, 36), {mode:"wander", box:{x0:-30, x1:10, z0:26, z1:52}, greet:11});
PETS.add(makeDog("#9a9a9a", 1.05, -51.2, -46.4), {mode:"lie"});
PETS.add(makeCat("#7a6a5a", -48, -36, "#e8e0d4"), {mode:"wander", box:{x0:-50, x1:-44, z0:-44, z1:-28}, greet:5});
onHook("key", (e)=>{
  if(e.code!=="KeyK" || e.repeat || !started) return false;
  RUFUS_E.mode = RUFUS_E.mode==="follow" ? "wander" : "follow";
  if(RUFUS_E.mode==="wander"){ RUFUS_E.box={x0:player.pos.x-12, x1:player.pos.x+12, z0:player.pos.z-12, z1:player.pos.z+12}; RUFUS_E.hx0=undefined; RUFUS_E.st=null; RUFUS_E.tgt=null; }
  toast(RUFUS_E.mode==="follow" ? "RUFUS · HEEL" : "RUFUS · GO PLAY", "#ffd48a");
  AUDIO.blip("bark", RUFUS.x, RUFUS.z);
  return true;
});

/* ---- butterflies over the flower bed and the green's edge; squirrels in the big trees ---------------- */
CRITTERS.addButterflies([[-22,-18.6],[-24,-18.4],[-52,-44],[56,-40],[-56,8],[64,6],[-12,46],[30,48],[-30,-40],[40,-50]], 14);
CRITTERS.addSquirrels([[-52,-48,1.15],[56,-44,1.05],[-58,8,1.1],[-12,48,1.0],[64,4,0.95],[8,-52,0.9]], 4);

/* ---- the sounds of the place: the pond's trickle at its outfall, the store's cooler humming ----------- */
AUDIO.source({x:POND.x+POND.r, z:POND.z, kind:"water", vol:0.05, reach:9});
AUDIO.source({x:-15.6, z:-28.6, y:1, kind:"hum", vol:0.025, reach:6, pitch:1.0, outdoor:false});

/* ---- the warp list (` to open it): every place worth checking ---------------------------------------- */
warpTo("THE GREEN", SPAWN.x, SPAWN.z, SPAWN.yaw);
warpTo("THE STORE", -22, -25.5, Math.PI, STORE.floor);
warpTo("THE CABIN", 15, -34, 0, CABIN.floor);
warpTo("THE PAVILION", 26, 7.6, 0, PAVE_T);
warpTo("THE JETTY", WORLD_SPOTS.jetty.x-2, WORLD_SPOTS.jetty.z, -Math.PI/2, WORLD_SPOTS.jetty.y);
warpTo("THE FIRE RING", -36.2, 30, Math.PI/2);
warpTo("THE BOTHY", -56, -38.5, Math.PI, BOTHY.floor);
warpTo("THE ROOT CELLAR", WORLD_SPOTS.cellar.x, WORLD_SPOTS.cellar.z, 0, WORLD_SPOTS.cellar.y);
warpTo("THE QUARRY", QUARRY.x-6, QUARRY.z, -Math.PI/2);
warpTo("THE WOODS", -120, -120, 0.8);

/* ---- the routes tools/walk.js walks: every doorway is on one ------------------------------------------- */
const WORLD_ROUTES={
  "green to the store":   [[0,14],[-10,-4],[-22,-16],[-22,-20.5],[-22,-22.8],[-22,-25.2],[-26,-26.4]],
  "round the store":      [[-22,-25.2],[-20.4,-26.2],[-20.4,-29.6],[-26,-29.6]],
  "the store's back door":{gate:true, pts:[[-18,-29.6],[-18,-31.4],[-18,-32.4],[-18,-34]]},
  "green to the cabin":   [[0,14],[10,-10],[15,-26],[15,-31.6],[15,-32.6],[15,-34.4],[17,-38.6]],
  "to the pavilion":      [[0,14],[18,8],[26,7.6],[26,1.6]],
  "out on the jetty":     [[10,30],[22,30.2],[25.6,30.2],[28.6,30.2],[31,30.2]],
  "into the bothy":       [[-40,-20],[-56,-44],[-56,-41.6],[-56,-40.6],[-56,-38],[-52.2,-37],[-52.2,-32.9]],
  "down to the cellar":   {y0:BOTHY.floor, pts:[[-52.2,-32.9],[-55,-32.9],[-58.6,-32.9],[-59.4,-32.9],[-59.4,-34.6],[-56,-35.6],[-54,-37.4]]},
  "the quarry track":     [[60,-30],[70,-31],[96,-38],[126,-34],[150,-44],[168,-52],[176,-52]],
  "to the fire":          [[0,14],[-20,22],[-36.2,30]],
};
const WORLD_STAIRS=[
  {name:"cellar stair", up:[[-59.4,-32.9],[-58.4,-32.9],[-52.4,-32.9],[-51.8,-32.9]], lo:CELLAR.floor, hi:BOTHY.floor},
];
