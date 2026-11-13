"use strict";
/* ENGINE · 18-hud.js
   compass, clock, location, season, weather, the toast, and the painted plan
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   18 · HUD — small and quiet; the world is the interface
   ---------------------------------------------------------------------- */
(function compass(){
  const svg=document.getElementById("gaugeSvg"), NS="http://www.w3.org/2000/svg";
  const cx=100, cy=100, R=82, mk=(n,a)=>{const e=document.createElementNS(NS,n);
    for(const k in a) e.setAttribute(k,a[k]); svg.appendChild(e); return e;};
  mk("circle",{cx:cx,cy:cy,r:R+6,fill:"#14563a",stroke:"#f1f1ea","stroke-width":3});
  mk("circle",{cx:cx,cy:cy,r:R-26,fill:"none",stroke:"rgba(241,241,234,0.18)","stroke-width":1});
  for(let a=0;a<360;a+=15){
    const big=a%45===0, rad=(a-90)*Math.PI/180;
    mk("line",{x1:cx+Math.cos(rad)*(R-2), y1:cy+Math.sin(rad)*(R-2),
               x2:cx+Math.cos(rad)*(R-(big?13:7)), y2:cy+Math.sin(rad)*(R-(big?13:7)),
               stroke:big?"#f1f1ea":"rgba(241,241,234,0.5)","stroke-width":big?2:1});
  }
  const g=mk("g",{id:"rose"});
  ["N","E","S","W"].forEach((L,i)=>{
    const rad=(i*90-90)*Math.PI/180;
    const t=document.createElementNS(NS,"text");
    t.setAttribute("x",cx+Math.cos(rad)*(R-26)); t.setAttribute("y",cy+Math.sin(rad)*(R-26)+5);
    t.setAttribute("text-anchor","middle"); t.setAttribute("fill", L==="N"?"#f4c430":"#cfe0d4");
    t.setAttribute("font-family","Oswald, sans-serif"); t.setAttribute("font-size","16");
    t.textContent=L; g.appendChild(t);
  });
  mk("polygon",{id:"needle",points:"100,52 94,70 106,70",fill:"#f4c430"});
})();
const hud={ hdg:document.getElementById("hdgNum"), card:document.getElementById("hdgCard"), wx:document.getElementById("wx"),
            where:document.getElementById("where"), clock:document.getElementById("clock"),
            season:document.getElementById("season"), rose:document.getElementById("rose") };
const CARD=["N","NE","E","SE","S","SW","W","NW"];

let _toastT=null;
function toast(text,color){
  const el=document.getElementById("toast");
  el.textContent=text; el.style.color=color||"#f1f1ea"; el.classList.add("show");
  clearTimeout(_toastT); _toastT=setTimeout(()=>el.classList.remove("show"),1600);
}
// where you are when no zone says otherwise: a world's placeName hook first (00), then the woods or the world's name
function placeName(x,z){
  const h=runHookUntil("placeName", x, z); if(h) return h;
  if(Terrain.lakeSD(x,z)<0) return "ON THE WATER";
  if(Terrain.siteDist(x,z)>4) return "THE WOODS";
  return CFG.placeName||CFG.name;
}
function updateHUD(){
  let head=player.yaw;
  if(droneMode) head=droneYaw+Math.PI;
  else if(driving) head=carYaw(driving.veh.body.quaternion)+Math.PI;
  let deg=(-head*180/Math.PI)%360; if(deg<0) deg+=360;
  hud.hdg.textContent=Math.round(deg).toString().padStart(3,"0");
  hud.card.textContent=CARD[Math.round(deg/45)%8];
  hud.rose.setAttribute("transform","rotate("+(-deg)+" 100 100)");
  const h=DayNight.state.hour, hi=Math.floor(h), mi=Math.floor((h-hi)*60);
  const h12=((hi+11)%12)+1;
  hud.clock.textContent=h12+":"+(mi<10?"0":"")+mi+(hi<12?" AM":" PM");
  hud.season.textContent=FOREST.isAutumn() ? (CFG.autumnLabel||"AUTUMN") : (CFG.summerLabel||"SUMMER");
  const wx=WEATHER.label()+" · "+WEATHER.temp()+"°F", out=GRID.phase!=="normal";
  if(hud.wx._s!==wx+out){ hud.wx._s=wx+out; hud.wx.textContent=out ? "POWER OUT · "+WEATHER.temp()+"°F" : wx; hud.wx.style.color=out?"#ff8a6a":""; }
  const hx=droneMode?dronePos.x:player.pos.x, hz=droneMode?dronePos.z:player.pos.z;
  if(droneMode){ hud.where.textContent="DRONE · "+Math.round(dronePos.y-surfaceY(hx,hz,dronePos.y))+" M"; return; }
  const z=zoneAt(hx, hz, player.feetY+0.5);
  const name=z||placeName(hx,hz);
  hud.where.textContent = driving ? name+" · "+Math.round(driving.veh.speed*2.237)+" MPH" : name;
}

/* --- the plan ----------------------------------------------------------
   Painted once over WORLD.plan's extent at one scale (the first time it is
   drawn, when everything is built), and shown through a window the size of
   the canvas that follows you. The engine paints the clearings, open water,
   paving, every indoor zone as a building, and then the world's own
   PLAN_LAYERS (02b). */
const planCv=document.getElementById("planCv"), planX=planCv.getContext("2d");
const PLAN_ALL={x0:CFG.plan.x0, x1:CFG.plan.x1, z0:CFG.plan.z0, z1:CFG.plan.z1}, PLAN_W=300*(CFG.plan.scale||1), PLAN_H=348*(CFG.plan.scale||1);
const PLAN_S=planCv.width/PLAN_W;                            // pixels to the metre
let planBase=null;
function _paintPlan(){
  const W=Math.max(2, Math.round((PLAN_ALL.x1-PLAN_ALL.x0)*PLAN_S)), H=Math.max(2, Math.round((PLAN_ALL.z1-PLAN_ALL.z0)*PLAN_S));
  const c=cvs(W, H), x=c.getContext("2d");
  const px=wx=>(wx-PLAN_ALL.x0)*PLAN_S, pz=wz=>(wz-PLAN_ALL.z0)*PLAN_S;
  x.fillStyle="#1d3a24"; x.fillRect(0,0,W,H);
  // the clearings lighter, the water blue (every other pixel: it is a small map)
  const step=Math.max(2, Math.round(Math.max(W,H)/300));
  for(let j=0;j<H;j+=step) for(let i=0;i<W;i+=step){
    const wx=PLAN_ALL.x0+i/PLAN_S, wz=PLAN_ALL.z0+j/PLAN_S;
    if(Terrain.lakeSD(wx,wz)<0){ x.fillStyle="#2c4f6e"; x.fillRect(i,j,step,step); }
    else if(Terrain.siteDist(wx,wz)<0){ x.fillStyle="#46663a"; x.fillRect(i,j,step,step); }
  }
  const R=(x0,x1,z0,z1,f)=>{ x.fillStyle=f; x.fillRect(px(x0),pz(z0),Math.max(1,px(x1)-px(x0)),Math.max(1,pz(z1)-pz(z0))); };
  for(const r of PAVED_RECTS) R(r.x0, r.x1, r.z0, r.z1, "#8a8b8d");
  for(const P of PRASTS){ x.fillStyle="#7d7e80";
    for(let j=0;j<P.nz;j++) for(let i=0;i<P.nx;i++){ const v=P.a[j*P.nx+i]; if(v===v) x.fillRect(px(P.x0+i), pz(P.z0+j), Math.max(1,PLAN_S), Math.max(1,PLAN_S)); } }
  for(const q of ZONES) if(q.indoor && !q.ob) R(q.x0, q.x1, q.z0, q.z1, "#a94a34");
  for(const f of PLAN_LAYERS) try{ f(x, px, pz, PLAN_S); }catch(e){ console.warn("plan layer", e); }
  return c;
}
function drawPlan(){
  if(!planBase) planBase=_paintPlan();
  const sx=droneMode?dronePos.x:player.pos.x, sz=droneMode?dronePos.z:player.pos.z;
  // the window: centred on you, kept inside the painted extent
  const keep=(s,W,lo,hi)=>clamp(s-W/2, lo, Math.max(lo, hi-W));
  const wx0=keep(sx, PLAN_W, PLAN_ALL.x0, PLAN_ALL.x1), wz0=keep(sz, PLAN_H, PLAN_ALL.z0, PLAN_ALL.z1);
  planX.clearRect(0,0,planCv.width,planCv.height);
  planX.drawImage(planBase, -(wx0-PLAN_ALL.x0)*PLAN_S, -(wz0-PLAN_ALL.z0)*PLAN_S);
  const X=clamp((sx-wx0)*PLAN_S,5,planCv.width-5), Z=clamp((sz-wz0)*PLAN_S,5,planCv.height-5);
  planX.save(); planX.translate(X,Z);
  let yaw=player.yaw; if(droneMode) yaw=droneYaw+Math.PI; else if(driving) yaw=carYaw(driving.veh.body.quaternion)+Math.PI;
  planX.rotate(-yaw);
  planX.beginPath(); planX.moveTo(0,-6); planX.lineTo(4.4,5); planX.lineTo(-4.4,5); planX.closePath();
  planX.fillStyle=droneMode?"#8fd0ff":"#f4c430"; planX.fill();
  planX.strokeStyle="#07120c"; planX.lineWidth=1; planX.stroke();
  planX.restore();
}
