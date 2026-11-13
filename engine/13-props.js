"use strict";
/* ENGINE · 13-props.js
   ready-made things to put down: a lamp post (a real lamp after dark, a
   pool of light on the ground, moths), a picnic table you can sit at, a
   park bench, a swing-top bin, a campfire (logs, coals, flame cards that
   turn to you, sparks, smoke, a halo and a fire lamp), a battery emergency
   light (dark until the power goes), and paving helpers
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. Every one of them pushes into the
   buckets (09's palette), adds its colliders and seats, and is baked with
   the rest. */
function lampPost(x, z, h, y0){
  const y=y0===undefined ? groundY(x, z) : y0;
  const big=h>6;
  if(big){ cyl("concrete", 0.32,0.36,0.6,12, x, y+0.25, z, "#a6a39b"); }
  cyl("paintm", big?0.075:0.06, big?0.11:0.08, h, 10, x, y+h/2, z, "#8a8f91");
  cyl("paintm", 0.10,0.10,0.10,10, x, y+h+0.02, z, "#7c8183");
  cyl("lamplens", 0.17,0.17,0.24,14, x, y+h+0.19, z, "#ffffff");
  cyl("paintm", 0.40,0.24,0.08,18, x, y+h+0.35, z, "#8d9294");          // the hat
  cyl("paintm", 0.10,0.22,0.06,14, x, y+h+0.42, z, "#868b8d");
  addCol(x-0.12, x+0.12, z-0.12, z+0.12, y-0.5, y+h);
  LAMPS.push({x:x, y:y+h+0.1, z:z, color: big?0xffc98a:0xffdcb0, intensity: big?1.25:0.95,
              dist: big?26:18, decay:1.5, mothy:true, circ:"main"});
  push("lightpool", discGeo(big?8.5:5.5, 24, 0), x, y+0.045, z, 0, big?"#ffc98a":"#ffe2b8");
}

const PICNIC=[];                       // the tables, for a plan or for ants
/* A classic A-frame table: three planks on two A-frames, the benches bolted
   to the cross-braces. Modelled facing its own +z; the benches are at ±0.62. */
function picnicTable(x, z, ry, color, y0){
  const y=y0||0, c=Math.cos(ry), s=Math.sin(ry);
  const P=(lx,lz)=>[x+lx*c+lz*s, z-lx*s+lz*c];
  const col=color||"#94573a";
  for(const pz of [-0.24,0,0.24]){                                  // the top, three planks, a finger's gap between
    const [px,qz]=P(0,pz); push("wood", boxGeo(1.86, 0.045, 0.222, 1.2), px, y+0.76, qz, ry, col);
  }
  for(const bz of [-0.62,0.62]){                                    // the benches
    const [px,qz]=P(0,bz); push("wood", boxGeo(1.86, 0.045, 0.26, 1.2), px, y+0.45, qz, ry, col);
  }
  for(const lx of [-0.62,0.62]){
    for(const sd of [-1,1]){                                        // the A, both legs
      const [px,qz]=P(lx, sd*0.47);
      push("wood", boxGeo(0.06, 0.86, 0.09, 1.2), px, y+0.37, qz, ry, col, -sd*0.58, 0);
    }
    // the bench brace thinner than the legs and short of the benches' edges, the
    // top cleat short of the planks': no two faces in one plane
    const [bxp,bzp]=P(lx,0); push("wood", boxGeo(0.05, 0.09, 1.44, 1.2), bxp, y+0.39, bzp, ry, col);
    const [tx2,tz2]=P(lx,0); push("wood", boxGeo(0.07, 0.06, 0.64, 1.2), tx2, y+0.71, tz2, ry, col);
  }
  const hx=Math.abs(c)*0.95+Math.abs(s)*0.78, hz=Math.abs(s)*0.95+Math.abs(c)*0.78;
  addCol(x-hx, x+hx, z-hz, z+hz, y-0.5, y+0.80);
  for(const [lx,lz,face] of [[-0.45,0.62,0],[0.45,0.62,0],[-0.45,-0.62,1],[0.45,-0.62,1]]){
    const [px,qz]=P(lx,lz);
    addSeat(px, qz, y, ry+(face?Math.PI:0), "A PICNIC TABLE", false, 0.66);
  }
  PICNIC.push({x:x, z:z, ry:ry});
}

/* a park bench: two slats to sit on, two to lean on, cast-iron ends; facing ry (its local +z the way you face sitting) */
function parkBench(x, z, ry, y0, color){
  const y=y0===undefined ? groundY(x, z) : y0, f=XF(x, z, ry), W="#7a5236", IRON=color||"#2a2c2c";
  for(const [lz, ly] of [[0.10, 0.45],[-0.06, 0.45]]) lbx(f, "wood", 1.62, 0.04, 0.13, 0, y+ly, lz, 1.2, W);
  for(const [ly, lz] of [[0.66, -0.20],[0.82, -0.22]]) push("wood", boxGeo(1.62, 0.11, 0.035, 1.2), f.x(0, lz), y+ly, f.z(0, lz), ry, W, -0.18, 0);
  for(const lx of [-0.72, 0.72]){
    // (the legs stop inside the arm that carries the seat, and the arm is wider and runs past both legs: no face of one
    //  lies in a face of another)
    lbx(f, "paintm", 0.05, 0.40, 0.05, lx, y+0.20, 0.16, 0, IRON); lbx(f, "paintm", 0.05, 0.86, 0.05, lx, y+0.43, -0.19, 0, IRON);
    lbx(f, "paintm", 0.068, 0.04, 0.45, lx, y+0.41, -0.015, 0, IRON); lbx(f, "paintm", 0.05, 0.04, 0.30, lx, y+0.62, 0.02, 0, IRON);
  }
  lcol(f, 1.66, 0.44, 0, -0.03, y-0.5, y+0.5);
  for(const lx of [-0.4, 0.4]){ const sx=f.x(lx, 0.30), sz=f.z(lx, 0.30); addSeat(sx, sz, y, ry, "A BENCH"); }
}
/* a grey swing-top can: a square bin, a hood on it with a peaked lid, and the
   swinging door in the front of the hood, facing ry (local +z out) */
function swingCan(x, z, ry, y0){
  const f=XF(x, z, ry), Y=(y0===undefined?groundY(x, z):y0), G="#9aa0a3";
  lbx(f, "paintm", 0.44, 0.76, 0.44, 0, Y+0.38, 0, 0, G);
  lbx(f, "paintm", 0.47, 0.035, 0.47, 0, Y+0.775, 0, 0, "#868c8f");
  lbx(f, "paintm", 0.45, 0.20, 0.45, 0, Y+0.89, 0, 0, G);
  for(const s of [-1,1]) push("paintm", boxGeo(s<0?0.47:0.462, 0.03, 0.27, 0), f.x(0,s*0.11), Y+1.035, f.z(0,s*0.11), ry, "#8e9497", -s*0.42, 0);
  lbx(f, "paintm", 0.478, 0.025, 0.04, 0, Y+1.085, 0, 0, "#7f8588");
  // the door: a dark slot, the flap hanging in it, a push plate
  lbx(f, "paintm", 0.34, 0.15, 0.012, 0, Y+0.895, 0.226, 0, "#161616");
  push("paintm", boxGeo(0.32, 0.135, 0.014, 0), f.x(0,0.231), Y+0.90, f.z(0,0.231), ry, "#7a8084", -0.10, 0);
  lbx(f, "paintm", 0.12, 0.03, 0.01, 0, Y+0.85, 0.24, 0, "#5d6266");
  bx("rubber", 0.52, 0.02, 0.52, x, Y+0.01, z, 0, ry, "#2a2a2a");
  lcol(f, 0.48, 0.48, 0, 0, Y-0.5, Y+1.05);
}

/* ---- a campfire ---------------------------------------------------------------
   campfire(x, z, scale, always, y0): logs leaned in a ring of stones, coals glowing on the ground, three flame cards
   that turn to face you (fireFlameMat), a halo, sparks and smoke, and a "fire" lamp in 16's pool (on by day too, a
   little). Lit always, or only after dark. updateFires (from the loop's frame hook below) flickers them. Keep it
   clear of tree crowns (FOREST: no tree within 8.5 m). Returns the fire; set F.on=false to put it out. */
function fireFlameMat(seed){ return new T.ShaderMaterial({
    uniforms:{time:{value:0}, seed:{value:seed}, k:{value:1}},
    vertexShader:"varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader:
`uniform float time, seed, k; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x), mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
void main(){
  float y=vUv.y, t=time*1.9;
  float q=fbm(vec2(vUv.x*3.0+seed, y*2.2-t));
  float q2=fbm(vec2(vUv.x*7.0-seed*1.7, y*4.6-t*1.5));
  float x=abs(vUv.x-0.5+(q-0.5)*0.42*y);
  float w=0.40*pow(max(0.0,1.0-y),0.7)*(0.72+0.56*q2);
  float body=smoothstep(w, w*0.25, x);
  float top=1.0-smoothstep(0.30, 0.95, y+(q-0.5)*0.55);
  float base=smoothstep(0.0, 0.06, y);
  float a=body*top*base*k;
  float heat=clamp(body*(1.2-y)*1.25, 0.0, 1.0);
  vec3 c=mix(vec3(0.85,0.16,0.02), vec3(1.0,0.50,0.07), smoothstep(0.08,0.5,heat));
  c=mix(c, vec3(1.0,0.90,0.58), smoothstep(0.62,0.98,heat));
  gl_FragColor=vec4(c*1.5, a);
}`,
    transparent:true, depthWrite:false, blending:T.AdditiveBlending, side:T.DoubleSide, toneMapped:false, fog:false}); }
const FIRES=[];
const COALS_TEX=(function(){ const c=cvs(128,128), x=c.getContext("2d"), r=_trng(77);
  for(let i=0;i<170;i++){ const a=r()*7, d=Math.pow(r(),0.7)*44, s=2+r()*7, px=64+Math.cos(a)*d, py=64+Math.sin(a)*d, g=x.createRadialGradient(px,py,0,px,py,s);
    g.addColorStop(0,"rgba(255,"+(120+r()*90|0)+",40,0.95)"); g.addColorStop(1,"rgba(255,60,10,0)"); x.fillStyle=g; x.fillRect(px-s,py-s,s*2,s*2); }
  return new T.CanvasTexture(c); })();
function campfire(fx, fz, sc, always, y0){
  sc=sc||1; const Y=y0===undefined ? groundY(fx, fz) : y0, g0=Y+0.04, fy=g0+0.03, flames=[];
  // the ring of stones
  for(let k=0;k<11;k++){ const a=k/11*Math.PI*2, s=0.16+hash2(fx+k, fz)*0.06; push("rock", rockGeo(s*sc, k+3), fx+Math.cos(a)*0.62*sc, Y+s*0.25*sc, fz+Math.sin(a)*0.62*sc, a, "#8a857a"); }
  addCol(fx-0.7*sc, fx+0.7*sc, fz-0.7*sc, fz+0.7*sc, Y-0.5, Y+0.25*sc);
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+0.4+fx; push("logbark", FOREST.barkCyl(0.055*sc, 0.045*sc, 0.6*sc, 7), fx+Math.cos(a)*0.15*sc, fy+0.18*sc, fz+Math.sin(a)*0.15*sc, -a, "#4a3e34", 0, 0.95); }
  for(const a of [0.3, 1.8]) push("logbark", FOREST.barkCyl(0.065*sc, 0.06*sc, 0.7*sc, 7), fx, fy+0.065*sc, fz, a+fz, "#3a312a", 0, Math.PI/2);
  const coals=new T.Mesh(new T.CircleGeometry(0.36*sc, 20), new T.MeshBasicMaterial({map:COALS_TEX, transparent:true, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false,
    polygonOffset:true, polygonOffsetFactor:-6, polygonOffsetUnits:-12}));
  coals.rotation.x=-Math.PI/2; coals.position.set(fx, Y+0.045, fz); scene.add(coals);
  for(const [w,h,dx,dz,sd] of [[0.74,1.08,0,0,2.3+fx%3],[0.56,0.84,0.08,-0.05,5.1],[0.44,0.66,-0.09,0.07,8.7]]){
    const gg=new T.PlaneGeometry(w*sc, h*sc); gg.translate(0, h*sc/2, 0);
    const m=new T.Mesh(gg, fireFlameMat(sd)); m.position.set(fx+dx*sc, fy+0.05, fz+dz*sc); m.renderOrder=4; m.frustumCulled=false; scene.add(m); flames.push(m); }
  const halo=new T.Sprite(new T.SpriteMaterial({map:GLOW_TEX, color:0xff7a2a, transparent:true, depthWrite:false, blending:T.AdditiveBlending, opacity:0.4, toneMapped:false}));
  halo.scale.set(2.4*sc, 1.9*sc, 1); halo.position.set(fx, fy+0.55*sc, fz); scene.add(halo);
  const F={flames:flames, halo:halo, coals:coals, x:fx, y:fy, z:fz, sc:sc, always:always, on:true, sparkT:0, smokeT:0, pop:3+Math.random()*5,
           l:{x:fx, y:g0+0.9, z:fz, color:0xff8a3c, intensity:1.0, dist:10*sc, decay:1.5, fire:true, mod:{v:1}}};
  LAMPS.push(F.l); FIRES.push(F);
  if(typeof AUDIO!=="undefined") F.snd=AUDIO.source({x:fx, y:fy, z:fz, kind:"fire", vol:0.12*sc, reach:7*sc});
  return F;
}
function updateFires(dt, now, dark){
  const cam=camera.position, t=now;
  for(const F of FIRES){
    const on=F.on && (F.always || dark>0.3), d=Math.hypot(cam.x-F.x, cam.z-F.z), vis=on && d<150;
    if(vis!==F.vis){ F.vis=vis; for(const m of F.flames) m.visible=vis; F.halo.visible=vis; F.coals.visible=vis; }
    if(F.snd) F.snd.on=on;
    if(!on){ F.l.mod.v=0; continue; }
    const n=0.5+0.5*Math.sin(t*7.3+F.x)*Math.sin(t*3.1+1.3)+0.25*Math.sin(t*17.9+F.z), fl=0.78+0.22*clamp(n, 0, 1);
    F.l.mod.v=(F.always ? 1.3 : 0.9)*fl*(0.4+0.6*smoothstep(0.1, 0.6, dark));
    F.halo.material.opacity=(0.12+0.40*dark)*fl; F.coals.material.opacity=0.65+0.35*Math.sin(t*2.1+F.x)*Math.sin(t*0.7);
    if(!vis) continue;
    for(let i=0;i<F.flames.length;i++){ const m=F.flames[i];
      m.rotation.y=Math.atan2(cam.x-m.position.x, cam.z-m.position.z)+(i-1)*0.5; m.material.uniforms.time.value=t+i*3.7+F.x; m.material.uniforms.k.value=0.85+0.15*fl; }
    if(d>60) continue;
    F.sparkT-=dt; F.pop-=dt; F.smokeT-=dt; const s=F.sc;
    if(F.sparkT<=0){ F.sparkT=(0.08+Math.random()*0.14)/s;
      SPARKS.emit(F.x+(Math.random()-0.5)*0.3*s, F.y+0.3*s, F.z+(Math.random()-0.5)*0.3*s, (Math.random()-0.5)*0.4, 1.2+Math.random()*1.4, (Math.random()-0.5)*0.4, 0.03+Math.random()*0.02, 0.8+Math.random()*1.2); }
    if(F.pop<=0){ F.pop=3+Math.random()*8;
      for(let k=0;k<5+Math.random()*6;k++) SPARKS.emit(F.x+(Math.random()-0.5)*0.25*s, F.y+0.25*s, F.z+(Math.random()-0.5)*0.25*s, (Math.random()-0.5)*1.2, 1.8+Math.random()*2.0, (Math.random()-0.5)*1.2, 0.035+Math.random()*0.025, 0.9+Math.random()*1.0); }
    if(F.smokeT<=0){ F.smokeT=(0.14+Math.random()*0.08)/s;
      PUFFS.emit(F.x+(Math.random()-0.5)*0.25*s, F.y+0.85*s, F.z+(Math.random()-0.5)*0.25*s, (Math.random()-0.5)*0.1, 0.6+Math.random()*0.3, (Math.random()-0.5)*0.1, 0.18*s, 1.3+Math.random()*0.7, 4.5+Math.random()*2, 0.20, 0.62, 0.9*dark+0.2); }
  }
}
onFrame(updateFires);
bucketOf("logbark", ()=>new T.MeshStandardMaterial({map:FOREST.atlas, roughness:0.95}));

/* ---- emergency lights: battery twin-heads by the exits ------------------
   emergencyLight(x, y, z, ry, vol): a unit on a wall (its back at x,y,z, facing local +z by ry), dark until the power
   goes, then lit with its lamp on the "emerg" circuit. vol is the room it lights (a lamp's vol). */
const EMERG_LENS=new T.MeshBasicMaterial({color:0x2a2a28, toneMapped:false});
const EMERG_HALO=[];
const _EMERG_BODY=new T.MeshStandardMaterial({color:0xe9e6dc, roughness:0.6});
function emergencyLight(x, y, z, ry, vol){
  const body=_EMERG_BODY;
  const g=new T.Group(); g.position.set(x,y,z); g.rotation.y=ry; scene.add(g);
  const b=new T.Mesh(new T.BoxGeometry(0.30,0.12,0.08), body); b.position.z=0.04; g.add(b);
  for(const s of [-1,1]){
    const hd=new T.Mesh(new T.SphereGeometry(0.045,10,8,0,Math.PI*2,0,Math.PI*0.6), body);
    hd.position.set(s*0.11,-0.08,0.10); hd.rotation.x=Math.PI*0.62; g.add(hd);
    const ln=new T.Mesh(new T.CircleGeometry(0.03,12), EMERG_LENS); ln.position.set(s*0.11,-0.105,0.125); ln.rotation.x=0.95; g.add(ln);
    const h=new T.Sprite(new T.SpriteMaterial({map:GLOW_TEX, color:0xf4f6ff, transparent:true, opacity:0, depthWrite:false,
                                               blending:T.AdditiveBlending, toneMapped:false}));
    h.scale.set(0.35,0.35,1); h.position.set(s*0.11,-0.11,0.14); g.add(h); EMERG_HALO.push(h);
  }
  const wp=new T.Vector3(0,-0.3,0.9).applyAxisAngle(V3(0,1,0), ry).add(V3(x,y,z));
  LAMPS.push({x:wp.x, y:wp.y, z:wp.z, color:0xf0f3ff, intensity:0.55, dist:8, decay:1.5, indoor:true, circ:"emerg", vol:vol});
  return g;
}

/* ---- paving -------------------------------------------------------------------
   paveRect(bk, x0,x1,z0,z1, color, y): an asphalt rectangle laid as 7.4 m tiles, each with its own uv offset and a
     quarter turn (one map over a hundred metres reads as a pattern otherwise), registered as a surface you stand on.
   layRibbon(bk, P, o0, o1, yOff, uv, color): a strip along a smoothed path (a road, a drive), built in world space
     and re-centred so the bake tiles it by where it is. Pave it with addPaveRibbon(P, o0, o1) after an addPaveRaster
     over its region, so you stand on it.
   stripe(x0,z0,x1,z1,w,color,y): a painted line on flat paving. */
// a ribbon, built in world space and then re-centred, so the bake can tile
// it by where it actually is rather than lumping it in at the origin
function layRibbon(bk, P, o0, o1, yOff, uv, color){
  const g=ribbonGeo(P, o0, o1, yOff, uv);
  g.computeBoundingBox();
  const c=new T.Vector3(); g.boundingBox.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  push(bk, g, c.x, c.y, c.z, 0, color);
}
// a ribbon whose edges are worked out at each point: f0(i,p,n) and f1(i,p,n) are its two offsets
// (left positive, as ribbonGeo's); it faces up whichever way they run, and a point can pinch to nothing
function ribbonGeoVar(P, f0, f1, yOff, uv){
  const pos=[], uvs=[], idx=[], s=uv||0.35;
  for(let i=0;i<P.length;i++){
    const n=pathSide(P,i), p=P[i], o0=f0(i,p,n), o1=f1(i,p,n);
    pos.push(p.x+n.x*o0, (p.y||0)+yOff, p.z+n.z*o0,  p.x+n.x*o1, (p.y||0)+yOff, p.z+n.z*o1);
    uvs.push(o0*s, p.s*s,  o1*s, p.s*s);
    if(i){ const a=(i-1)*2, b=a+1, c=a+2, d=a+3; idx.push(a,c,b, b,c,d); }
  }
  const g=new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos,3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs,2));
  g.setIndex(idx); g.computeVertexNormals();
  let up=0; const nr=g.attributes.normal; for(let k=0;k<nr.count;k++) up+=nr.getY(k);
  if(up<0){ const ix=g.index.array; for(let k=0;k<ix.length;k+=3){ const t=ix[k+1]; ix[k+1]=ix[k+2]; ix[k+2]=t; } g.computeVertexNormals(); }
  return g;
}
function layRibbonVar(bk, P, f0, f1, yOff, uv, color){
  const g=ribbonGeoVar(P, f0, f1, yOff, uv);
  g.computeBoundingBox(); const c=new T.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, -c.z);
  push(bk, g, c.x, c.y, c.z, 0, color);
}
// an asphalt rectangle laid as 7.4 m tiles, each with its own UV offset and
// a quarter turn: one map over a hundred metres reads as a pattern otherwise
function paveRect(bk, x0,x1,z0,z1, color, y){
  const Y=y||0;
  const TL=7.4, UVS=0.62;
  let sd=(Math.round(Math.abs(x0)*131+Math.abs(z0)*77)|0)*7919 % 2147483647;
  const r2=()=>{ sd=(sd*1103515245+12345)&0x7fffffff; return sd/0x7fffffff; };
  for(let x=x0; x<x1-0.02; x+=TL) for(let z=z0; z<z1-0.02; z+=TL){
    const w=Math.min(TL, x1-x), d=Math.min(TL, z1-z);
    if(w<0.06||d<0.06) continue;
    const g=new T.PlaneGeometry(w,d), a=g.attributes.uv;
    const ou=r2()*97, ov=r2()*97, rot=(r2()*4)|0;
    for(let i=0;i<a.count;i++){
      let u=a.getX(i)*w*UVS, v=a.getY(i)*d*UVS;
      for(let k=0;k<rot;k++){ const t=u; u=v; v=-t; }
      a.setXY(i, u+ou, v+ov);
    }
    a.needsUpdate=true;
    push(bk, g, x+w/2, Y+PAVE_T, z+d/2, 0, color||"#ffffff", -Math.PI/2, 0);
  }
  addPaveRect(x0,x1,z0,z1,Y);
}
// a painted line from (x0,z0) to (x1,z1) on flat paving
function stripe(x0,z0,x1,z1,w,color,y){
  const L=Math.hypot(x1-x0,z1-z0);
  push("paint", planeGeo(w, L, 0), (x0+x1)/2, (y===undefined?PAVE_T:y)+0.002, (z0+z1)/2,
       Math.atan2(x1-x0, z1-z0), color||WHITE_LINE, -Math.PI/2, 0);
}

