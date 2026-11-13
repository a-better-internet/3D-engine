"use strict";
/* ENGINE · 16-lighting.js
   the pool of real lights that follows the camera
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   16 · NIGHT LIGHTING — a pool of point lights (GFX.lights of them, 12 by
   default) moved every frame onto the registered lamps nearest the camera;
   everything else glows (GLOW materials, 09).

   A LAMP is a plain object pushed into LAMPS (01):
     {x, y, z, color:0xffe0b0, intensity:1, dist:18, decay:1.5,
      indoor   on all day (at least 0.8), and weighted as nearer
      fire     on by day too, a little (a campfire)
      under    underground: only considered while the camera is (06 addBuried)
      circ     its power circuit ("main" unless said; null: battery): off in a cut
      mod      {v:0..1}: as bright as mod.v says (a TV that is on, a flame)
      vol      [x0,x1,z0,z1,y0,y1]: behind a wall unless you are inside it
      ob       a turned box (06's _ob): only when you are in it
      flicker  rides FLICKER (a tube with a bad ballast)
      mothy    moths circle it after dark (05)}
   The pool's size never changes while the game runs (a light coming or
   going rebuilds every lit shader): only the settings menu changes it.
   ---------------------------------------------------------------------- */
const LIGHT_POOL=[];
/* How many there are is a graphics setting. Every pixel of every lit
   surface pays for every light in the pool, lit or not, so fewer is
   cheaper; changing the number rebuilds the shaders once. */
function setLightCount(n){
  n=Math.max(2, Math.min(32, n|0));
  while(LIGHT_POOL.length<n){
    const L=new T.PointLight(0xffe9c4, 0, 10, 1.4); L.castShadow=false;
    scene.add(L); LIGHT_POOL.push(L);
  }
  while(LIGHT_POOL.length>n){ const L=LIGHT_POOL.pop(); scene.remove(L); if(L.dispose) L.dispose(); }
}
setLightCount(GFX.lights);
const _lampSort=[];
// one bad ballast for anything with `flicker`
const FLICKER={v:1, t:0};
function tickFlicker(dt){
  FLICKER.t+=dt;
  const n=Math.sin(FLICKER.t*37.1)*Math.sin(FLICKER.t*11.3)*Math.sin(FLICKER.t*2.7);
  FLICKER.v = n>0.34 ? 0.18+Math.random()*0.25 : (n>0.18 ? 0.72 : 1.0);
}
function updateLights(dark, camPos){
  _lampSort.length=0;
  // underground only the lamps down there count, and they are on as they are
  // at any hour; above ground those lamps are behind rock (19-loop, 06 BURIED)
  // (in a graded stairwell, the lamps below take over a third of the way down: 06's buriedShare)
  const _bq=buriedVolAt(camPos.x, camPos.z, camPos.y), down=!!_bq && buriedShare(_bq, camPos.y)>0.33;
  for(const l of LAMPS){
    if(!!l.under!==down) continue;
    // on a circuit that is off (a power cut) it is not a light at all
    if(l.circ && circLevel(l.circ)<0.02) continue;
    if(l.mod && l.mod.v<0.02) continue;
    // (and one inside a turned box only when you are in that)
    if(l.ob && !(obIn(l.ob, camPos.x, camPos.z) && camPos.y<l.y+0.5)) continue;
    // a lamp with a volume is behind a wall unless you are inside that volume
    if(l.vol && !(camPos.x>l.vol[0] && camPos.x<l.vol[1] &&
                  camPos.z>l.vol[2] && camPos.z<l.vol[3] &&
                  camPos.y>l.vol[4] && camPos.y<l.vol[5])) continue;
    const d2=(l.x-camPos.x)*(l.x-camPos.x)+(l.y-camPos.y)*(l.y-camPos.y)+(l.z-camPos.z)*(l.z-camPos.z);
    if(d2 < 52*52) _lampSort.push({l:l, d2:d2*(l.indoor?0.5:1)});
  }
  _lampSort.sort((a,b)=>a.d2-b.d2);
  for(let i=0;i<LIGHT_POOL.length;i++){
    const L=LIGHT_POOL[i], e=_lampSort[i];
    // indoors the tubes are on all day; the lot lights only after dusk
    // and a fire is a fire by day too, if a weak one
    // (a lamp with a mod, a TV that is on, is as bright as its mod's v says)
    const mult=e ? (e.l.under ? 1 : e.l.indoor ? Math.max(dark,0.80) : e.l.fire ? Math.max(dark,0.30) : dark)*(e.l.circ ? circLevel(e.l.circ) : 1)*(e.l.mod ? e.l.mod.v : 1) : 0;
    if(!e || mult<0.02){ L.intensity=0; continue; }
    L.position.set(e.l.x, e.l.y, e.l.z);
    L.color.setHex(e.l.color);
    L.distance=e.l.dist;
    L.decay=e.l.decay||1.5;
    L.intensity=e.l.intensity*mult;
    L.userData.mothy=!!e.l.mothy;
    if(e.l.flicker) L.intensity *= FLICKER.v;
  }
}
