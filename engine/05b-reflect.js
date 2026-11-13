"use strict";
/* ENGINE · 05b-reflect.js
   the two little painted worlds that paint, glass, chrome and porcelain
   reflect: one outdoors, one a lit room
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ---- reflections -------------------------------------------------------
   Two equirectangular canvases, prefiltered once: the outdoors (sky, a line
   of trees, grey ground) for paint, glass and chrome outside, and a lit
   room for the stainless and porcelain indoors. Without them a metal is
   black. WORLD.envPainter(x, W, H) can paint the outdoor one instead (a
   desert, a city), and WORLD.envRoomPainter the room.
   envOut(m, k) gives a material the outdoor one at strength k, and 19-loop
   turns it down with the daylight; envIn(m, k) the room, which never
   changes. */
const ENV=(function(){
  const pm=new T.PMREMGenerator(renderer);
  const equi=(draw)=>{ const c=cvs(512,256), x=c.getContext("2d"); draw(x,512,256);
    const t=new T.CanvasTexture(c); t.mapping=T.EquirectangularReflectionMapping; return t; };
  const out=equi(CFG.envPainter || ((x,W,H)=>{
    let g=x.createLinearGradient(0,0,0,H/2);
    g.addColorStop(0,"#4a78b0"); g.addColorStop(0.65,"#9fbad2"); g.addColorStop(1,"#dce4e8");
    x.fillStyle=g; x.fillRect(0,0,W,H/2);
    for(let i=0;i<16;i++){
      const cx=rnd()*W, cy=H*(0.10+rnd()*0.28), r=24+rnd()*34;
      const rg=x.createRadialGradient(cx,cy,0,cx,cy,r);
      rg.addColorStop(0,"rgba(255,255,255,0.8)"); rg.addColorStop(1,"rgba(255,255,255,0)");
      x.fillStyle=rg; x.fillRect(cx-r*1.6,cy-r,r*3.2,r*2);
    }
    g=x.createLinearGradient(0,H/2,0,H);
    g.addColorStop(0,"#5d6352"); g.addColorStop(0.12,"#76756d"); g.addColorStop(1,"#4b4a46");
    x.fillStyle=g; x.fillRect(0,H/2,W,H/2);
    x.fillStyle="#26321f";
    for(let i=0;i<W;i+=2){ const h=3+Math.abs(Math.sin(i*0.045))*5+rnd()*4; x.fillRect(i,H/2-h,2,h+1); }
  }));
  const inn=equi(CFG.envRoomPainter || ((x,W,H)=>{
    x.fillStyle="#cdc6b6"; x.fillRect(0,0,W,H);
    x.fillStyle="#e9e8e2"; x.fillRect(0,0,W,H*0.30);
    x.fillStyle="#fffef6"; for(let i=0;i<6;i++) x.fillRect(i*W/6+18,H*0.07,46,H*0.07);
    x.fillStyle="#d8d2c0"; x.fillRect(0,H*0.40,W,H*0.24);
    x.fillStyle="#8c8274"; x.fillRect(0,H*0.64,W,H*0.36);
    x.fillStyle="#b9ab8c"; for(let i=0;i<8;i++) x.fillRect(i*W/8,H*0.32,W/18,H*0.32);
  }));
  const r={out:pm.fromEquirectangular(out).texture, in:pm.fromEquirectangular(inn).texture};
  pm.dispose(); out.dispose(); inn.dispose();
  return r;
})();
// the outdoor ones go dark with the sky; 19-loop scales them each frame
const ENV_OUT_MATS=[];
function envOut(m, k){ m.envMap=ENV.out; m.envMapIntensity=k; ENV_OUT_MATS.push({m:m, k:k}); return m; }
function envIn(m, k){ m.envMap=ENV.in; m.envMapIntensity=k; return m; }
