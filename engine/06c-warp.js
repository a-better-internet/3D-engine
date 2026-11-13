"use strict";
/* ENGINE · 06c-warp.js
   the warp list, for testing: a key to put you straight down anywhere that matters
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   06c · WARP
   ` (the key left of 1) opens a list of places; a digit or a letter puts you
   there, standing, looking at it. ` or Esc shuts it. You are got out of a
   car, out of the drone, up out of a seat and off a ladder first. It is not
   on the controls card: it is for checking things, not for playing.
   A world adds places with warpTo(name, x, z, yaw, floor): floor a number,
   a function returning one, or nothing (the highest floor within a metre
   over the ground). tools/walk.js (ONLY=warps) puts you down at every one
   and fails any that is in something or does not hold you.
   ---------------------------------------------------------------------- */
const WARPS=[];
function warpTo(name, x, z, yaw, floor){ WARPS.push([name, x, z, yaw||0, floor]); }
const WARP=(function(){
  const W={open:false};
  const g=(x, z, h)=>surfaceY(x, z, groundY(x, z)+(h===undefined ? 1.0 : h));
  const KEYS="1234567890ABCDFGHIJKLMNOPQRTUVWXYZ";            // (E and S left out: E is your hand, S is a step back)
  const box=document.createElement("div"); box.id="warp";
  const st=document.createElement("style"); st.textContent=`
    #warp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;z-index:40;pointer-events:none;
      background:rgba(14,20,18,.92);border:1px solid rgba(220,232,214,.35);border-radius:6px;padding:16px 22px 14px;
      font-family:"Oswald",Arial,sans-serif;color:#e4ecdf;letter-spacing:.08em;max-width:calc(100vw - 32px);box-sizing:border-box}
    #warp h4{margin:0 0 10px;font-size:15px;letter-spacing:.3em;color:#9fd36a;font-weight:600}
    #warp .g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 26px;font-size:13px;white-space:nowrap}
    #warp .g b{display:inline-block;width:1.6em;color:#f2d27a}
    #warp p{margin:10px 0 0;font-size:11px;opacity:.6;letter-spacing:.2em}`;
  document.head.appendChild(st); document.body.appendChild(box);
  const draw=()=>{ box.innerHTML="<h4>WARP</h4><div class='g'>"+WARPS.map((p, i)=>"<div><b>"+(KEYS[i]||"")+"</b>"+p[0]+"</div>").join("")+"</div><p>` OR ESC TO SHUT IT</p>"; };
  const show=(on)=>{ W.open=on; if(on) draw(); box.style.display=on ? "block" : "none"; };
  function go(i){
    const p=WARPS[i]; if(!p) return;
    if(driving) exitCar();
    if(droneMode) setDrone(false);
    if(seated) standUp();
    player.ladder=null;
    const [name, x, z, yaw, fl]=p;
    const y=typeof fl==="function" ? fl(p) : typeof fl==="number" ? surfaceY(x, z, fl+0.05) : g(x, z);
    player.pos.set(x, 0, z); player.feetY=y; player.yaw=yaw; player.pitch=-0.05;
    if(typeof toast==="function") toast(name, "#9fd36a");
  }
  W.go=go; W.places=WARPS;
  onHook("key", (e)=>{
    if(e.code==="Backquote"){ show(!W.open); return true; }
    if(!W.open) return false;
    if(e.code==="Escape"){ show(false); return true; }
    const k=e.key.toUpperCase(), i=KEYS.indexOf(k);
    if(i>=0 && i<WARPS.length){ show(false); go(i); }
    return true;
  }, -100);
  return W;
})();
