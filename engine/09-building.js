"use strict";
/* ENGINE · 09-building.js
   the standard material palette (buckets), the wall builders (runX/runZ,
   lineX/lineZ, floors, ceilings, frames), the world-coordinate wall kit
   (pieces/vslab/vliner/wall/liner), windows, roofs, and building(): a whole
   rectangular building with its doors, windows, rooms, roof, zone and lamps
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   9 · BUILDING

   THE PALETTE. Every static thing is pushed into a bucket by name (01).
   These are the engine's: a world adds its own with bucketOf(name, ()=>mat).
     solid   brick siding shingle block plaster concrete wood beam metal
             paintm steel chrome porcelain rubber rock cork ytile mosaic
             quarry roofmetal fabric
     glass   glass (clear), tint (dark); both are breakable panes (01's
             GLASS_PANES) if 8 cm or thinner and 12 cm or more each way
     lit     lamplens (warm, on after dark), tube (indoor, always on),
             winglow, winwarm (a window's glow at night), exitsign, ledgreen,
             ledamber, ledred
     flat    the polygon-offset ladder for layers lying on one another:
             road (-1) → asphalt, walkflat, gravelbed (-2) → lotpave, bed,
             mulchbed (-3) → paint (-4) → soot (-5) → lightpool (-6).
             Only ever for flat planes: a box's side seen edge-on jumps
             through walls metres in front of it.

   NO TWO FACES IN ONE PLANE. Nothing sits exactly on another surface (lift
   it 5 mm or more); a trim piece stands proud of the wall it meets or stops
   short of it; when two boxes butt, one is a few millimetres longer or sunk
   into the other. frameX/frameZ show how. Check with tools/zfight.js.
   ---------------------------------------------------------------------- */
const _po=(f)=>({polygonOffset:true, polygonOffsetFactor:f, polygonOffsetUnits:f*2});
bucketOf("road",     ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.road, roughness:0.96}, _po(-1))));
bucketOf("asphalt",  ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.asphalt, roughness:0.97}, _po(-2))));
bucketOf("lotpave",  ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.asphalt, roughness:0.97}, _po(-3))));
bucketOf("paint",    ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.enamel,  roughness:0.68}, _po(-4))));
bucketOf("walkflat", ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.concrete,roughness:0.95}, _po(-2))));
bucketOf("bed",      ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.riverRock,roughness:1.0}, _po(-3))));
bucketOf("mulchbed", ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.mulch,   roughness:1.0}, _po(-3))));
bucketOf("gravelbed",()=>new T.MeshStandardMaterial(Object.assign({map:TEX.crushed, roughness:1.0}, _po(-2))));
bucketOf("soot",     ()=>new T.MeshBasicMaterial(Object.assign({color:0xffffff, transparent:true, opacity:0.18,
                          map:TEX.soot, depthWrite:false}, _po(-5))));
bucketOf("concrete", ()=>new T.MeshStandardMaterial({map:TEX.concrete, roughness:0.94}));
bucketOf("metal",    ()=>new T.MeshStandardMaterial({map:TEX.galv,     roughness:0.42, metalness:0.55}));
bucketOf("paintm",   ()=>new T.MeshStandardMaterial({map:TEX.enamel,   roughness:0.62, metalness:0.15}));
bucketOf("rock",     ()=>new T.MeshStandardMaterial({map:TEX.rock, roughness:0.96}));          // (shaded round: rockGeo shares its vertices)
bucketOf("wood",     ()=>new T.MeshStandardMaterial({map:TEX.wood, roughness:0.86}));
bucketOf("rubber",   ()=>new T.MeshStandardMaterial({map:TEX.rubber, roughness:0.95}));
bucketOf("brick",    ()=>new T.MeshStandardMaterial({map:TEX.brick,   roughness:0.92}));
bucketOf("siding",   ()=>new T.MeshStandardMaterial({map:TEX.siding,  roughness:0.70}));
bucketOf("shingle",  ()=>new T.MeshStandardMaterial({map:TEX.shingle, roughness:0.90}));
bucketOf("block",    ()=>new T.MeshStandardMaterial({map:TEX.block,   roughness:0.80}));
bucketOf("ytile",    ()=>new T.MeshStandardMaterial({map:TEX.ytile,   roughness:0.30, metalness:0.02}));
bucketOf("mosaic",   ()=>new T.MeshStandardMaterial({map:TEX.mosaic,  roughness:0.55}));
bucketOf("quarry",   ()=>new T.MeshStandardMaterial({map:TEX.quarry,  roughness:0.50}));
bucketOf("plaster",  ()=>new T.MeshStandardMaterial({map:TEX.drywall, roughness:0.88}));
bucketOf("porcelain",()=>envIn(new T.MeshStandardMaterial({color:0xffffff,  roughness:0.16, metalness:0.02}), 0.8));
bucketOf("steel",    ()=>envIn(new T.MeshStandardMaterial({map:TEX.brushed, roughness:0.30, metalness:0.75}), 1.0));
bucketOf("chrome",   ()=>envIn(new T.MeshStandardMaterial({color:0xffffff,  roughness:0.12, metalness:0.92}), 1.0));
bucketOf("beam",     ()=>new T.MeshStandardMaterial({map:TEX.wood,    roughness:0.80}));
bucketOf("cork",     ()=>new T.MeshStandardMaterial({map:TEX.cork,    roughness:0.95}));
bucketOf("fabric",   ()=>new T.MeshStandardMaterial({color:0xffffff,  roughness:0.98}));
bucketOf("roofmetal",()=>new T.MeshStandardMaterial({map:TEX.galv,    roughness:0.55, metalness:0.45}));
bucketOf("mat",      ()=>new T.MeshStandardMaterial(Object.assign({map:TEX.rubber, roughness:1.0}, _po(-2))));
const BRICK="#d4cfc8", BRICK_IN="#bdb4aa", FASCIA="#3b2e26", BRONZE="#3e332b", CREAM="#e6e0cf",
      TILE="#ffffff", BLOCKC="#c9cac6", PART="#c7b998", PORC="#ebe9e3";
const WHITE_LINE="#e6e4dc", YELLOW_LINE="#d9a925";


/* ---- what glows -----------------------------------------------------------
   A material that ramps with the clock is registered in GLOW (19-loop drives it). kind:
     "warm"    off by day, full at night (outdoor lamps, lit windows)
     "indoor"  on all day, a little brighter at night (tubes, screens)
     "always"  always on, full (exit signs, LEDs)
   circ: the power circuit it is on (16b's GRID, "main" unless said; null for battery-backed): a power cut puts it out. */
function glowMat(opts, kind, circ){
  const m=new T.MeshStandardMaterial(Object.assign({roughness:0.5, metalness:0.0}, opts));
  GLOW.push({m:m, base:m.emissive?m.emissive.clone():new T.Color(0), kind:kind, baseInt:m.emissiveIntensity||1,
             circ:circ!==undefined ? circ : (kind==="always" ? null : "main")});
  return m;
}
/* A SURFACE THAT IS A LAMP: near-black diffuse, so the point light a few centimetres away cannot add its own light on
   top of the emissive and push the face past white. */
function emitMat(emissive, intensity, kind, circ){
  return glowMat({color:0x241f1a, emissive:emissive, emissiveIntensity:intensity, roughness:0.9, metalness:0.0}, kind, circ);
}
// an unlit glow (a halo, a pool of light on the ground): its opacity follows the clock. max caps it.
function basicGlowMat(color, kind, blend, max){
  const m=new T.MeshBasicMaterial({color:color, transparent:true, opacity:0.0, toneMapped:false,
    depthWrite:false, blending:blend||T.NormalBlending});
  GLOW.push({m:m, kind:kind, basic:true, max:max, circ:kind==="always"?null:"main"});
  return m;
}
bucketOf("glass",  ()=>envOut(new T.MeshStandardMaterial({color:0xffffff, transparent:true, opacity:0.30,
                          roughness:0.05, metalness:0.35, side:T.DoubleSide, depthWrite:false}), 0.8));
// dark tinted glass: from outside, by day, a dark reflective sheet with the sky in it, not a hole
bucketOf("tint",   ()=>envOut(new T.MeshStandardMaterial({color:0xffffff, transparent:true, opacity:0.55,
                          roughness:0.04, metalness:0.50, side:T.DoubleSide, depthWrite:false}), 0.9));
bucketOf("mirror", ()=>new T.MeshStandardMaterial({color:0xffffff, metalness:0.62, roughness:0.06, emissive:0x303a40, emissiveIntensity:0.35}));
bucketOf("tube",   ()=>emitMat(0xeef2f0, 0.85, "indoor"));
bucketOf("ceilfix",()=>glowMat({color:0x9c968c, emissive:0xf4f2ea, emissiveIntensity:0.30}, "indoor"));
bucketOf("winglow",()=>glowMat({color:0xffffff, emissive:0xffe6b8, emissiveIntensity:0.18}, "warm"));
/* a lit window: after dark the glass glows from the room behind it. A plane just inside each pane, facing out and only
   out, so from inside it is culled and you look through the glass at the night; additive, so by day it is nothing */
bucketOf("winwarm", ()=>basicGlowMat(0xffd7a0, "warm", T.AdditiveBlending, 0.42));
bucketOf("lamplens", ()=>emitMat(0xffd7a0, 0.9, "warm"));
bucketOf("exitsign",()=>emitMat(0xff2a1a, 0.9, "always"));
bucketOf("ledgreen",()=>emitMat(0x3cff6a, 0.9, "always"));
bucketOf("ledamber",()=>emitMat(0xffaa22, 0.9, "always"));
bucketOf("ledred",  ()=>emitMat(0xff3322, 0.9, "always"));
bucketOf("lightpool",()=>{ const m=new T.MeshBasicMaterial({color:0xffd9a8, map:TEX.soot, transparent:true,
                          opacity:0, depthWrite:false, blending:T.AdditiveBlending, polygonOffset:true, polygonOffsetFactor:-6, polygonOffsetUnits:-12});
                          GLOW.push({m:m, basic:true, max:0.30, circ:"main"}); return m; });

/* ---- wall builders ------------------------------------------------------
   runX / runZ: a structural wall along x (at z = c) or along z (at x = c),
   in solid pieces round its openings {a, b, sill, head}. lineX / lineZ: a
   finish on one face of it, a few millimetres proud, cut round the same
   openings, with its UVs anchored to the world so the courses run on
   across a doorway instead of restarting at each piece.                */
function _spans(a,b,open){
  const ops=(open||[]).filter(o=>o.b>a && o.a<b).sort((p,q)=>p.a-q.a), out=[];
  let x=a;
  for(const o of ops){
    if(o.a>x) out.push({a:x, b:o.a, o:null});
    out.push({a:Math.max(o.a,a), b:Math.min(o.b,b), o:o});
    x=o.b;
  }
  if(b>x) out.push({a:x, b:b, o:null});
  return out;
}
function runX(bk, c, t, a, b, y0, y1, open, color, uv){
  for(const s of _spans(a,b,open)){
    if(!s.o){ wallBox(bk, s.a, s.b, c-t/2, c+t/2, y0, y1, color, uv, y0); continue; }
    if(s.o.sill>y0+0.01) wallBox(bk, s.a, s.b, c-t/2, c+t/2, y0, s.o.sill, color, uv, y0);
    if(s.o.head<y1-0.01) wallBox(bk, s.a, s.b, c-t/2, c+t/2, s.o.head, y1, color, uv, y0);
  }
}
function runZ(bk, c, t, a, b, y0, y1, open, color, uv){
  for(const s of _spans(a,b,open)){
    if(!s.o){ wallBox(bk, c-t/2, c+t/2, s.a, s.b, y0, y1, color, uv, y0); continue; }
    if(s.o.sill>y0+0.01) wallBox(bk, c-t/2, c+t/2, s.a, s.b, y0, s.o.sill, color, uv, y0);
    if(s.o.head<y1-0.01) wallBox(bk, c-t/2, c+t/2, s.a, s.b, s.o.head, y1, color, uv, y0);
  }
}
function _liner(bk, axis, f, dir, a, b, y0, y1, open, color, uv, inset){
  const s=uv||0.5, off=inset===undefined?0.006:inset;
  const piece=(pa,pb,qa,qb)=>{
    if(pb-pa<0.005||qb-qa<0.005) return;
    const g=new T.PlaneGeometry(pb-pa, qb-qa), U=g.attributes.uv;
    const flip = axis==="x" ? dir<0 : dir>0;
    for(let i=0;i<U.count;i++)
      U.setXY(i, ((flip?-pb:pa)+U.getX(i)*(pb-pa))*s, (qa+U.getY(i)*(qb-qa))*s);
    U.needsUpdate=true;
    if(axis==="x") push(bk, g, (pa+pb)/2, (qa+qb)/2, f+dir*off, dir>0?0:Math.PI, color);
    else           push(bk, g, f+dir*off, (qa+qb)/2, (pa+pb)/2, dir>0?Math.PI/2:-Math.PI/2, color);
  };
  // every piece cut at every opening's sill and head, so where two meet along a vertical edge they share its corners
  // (a corner of one partway along the other's edge leaves a hairline crack down it, with the wall behind showing)
  const cuts=(open||[]).flatMap(o=>[o.sill, o.head]).filter(y=>y>y0+0.005 && y<y1-0.005).sort((p,q)=>p-q);
  const band=(pa,pb,qa,qb)=>{ let q=qa; for(const c of cuts) if(c>q+0.005 && c<qb-0.005){ piece(pa,pb,q,c); q=c; } piece(pa,pb,q,qb); };
  for(const sp of _spans(a,b,open)){
    if(!sp.o){ band(sp.a, sp.b, y0, y1); continue; }
    if(sp.o.sill>y0) band(sp.a, sp.b, y0, Math.min(y1, sp.o.sill));
    if(sp.o.head<y1) band(sp.a, sp.b, Math.max(y0, sp.o.head), y1);
  }
}
const lineX=(bk,f,dir,a,b,y0,y1,open,color,uv,inset)=>_liner(bk,"x",f,dir,a,b,y0,y1,open,color,uv,inset);
const lineZ=(bk,f,dir,a,b,y0,y1,open,color,uv,inset)=>_liner(bk,"z",f,dir,a,b,y0,y1,open,color,uv,inset);
function floorAt(bk, x0,x1,z0,z1, y, color, uv){
  const s=uv||0.5, g=new T.PlaneGeometry(x1-x0, z1-z0), U=g.attributes.uv;
  for(let i=0;i<U.count;i++) U.setXY(i, (x0+U.getX(i)*(x1-x0))*s, (-z1+U.getY(i)*(z1-z0))*s);
  U.needsUpdate=true;
  push(bk, g, (x0+x1)/2, y, (z0+z1)/2, 0, color, -Math.PI/2, 0);
}
function ceilAt(bk, x0,x1,z0,z1, y, color, uv){
  push(bk, planeGeo(x1-x0, z1-z0, uv||0.5), (x0+x1)/2, y, (z0+z1)/2, 0, color, Math.PI/2, 0);
}
// a door frame: two posts and a head, proud of both faces of a wall t thick
// The posts stop under the head, and the head is half a centimetre longer
// and deeper than they span, so no face of one lies in a face of the other.
// fl: the floor the posts stand on (0 unless given)
function frameX(c, t, a, b, head, color, fl){
  const FL=fl||0;
  for(const x of [a-0.035, b+0.035]) bx("paintm", 0.07, head-FL, t+0.12, x, FL+(head-FL)/2, c, 0, 0, color||BRONZE);
  bx("paintm", b-a+0.15, 0.07, t+0.13, (a+b)/2, head+0.035, c, 0, 0, color||BRONZE);
}
function frameZ(c, t, a, b, head, color, fl){
  const FL=fl||0;
  for(const z of [a-0.035, b+0.035]) bx("paintm", t+0.12, head-FL, 0.07, c, FL+(head-FL)/2, z, 0, 0, color||BRONZE);
  bx("paintm", t+0.13, 0.07, b-a+0.15, c, head+0.035, (a+b)/2, 0, 0, color||BRONZE);
}
// a small printed sign on a wall face: lit=false, a centimetre proud
function wallSign(w,h,draw,x,y,z,ry){
  return signPanel(w,h, signTex(Math.round(w*300),Math.round(h*300),draw), x,y,z, ry);
}
// a small printed sign on a wall face: lit=false, a centimetre proud

/* ---- the world-coordinate wall kit ------------------------------------------
   Far from the origin a float has a tenth of a millimetre of play, and two
   pieces of one wall, each built as a box centred and turned into place,
   open hairline cracks where they meet. So a wall is built as ONE outline
   less its openings, cut into a grid at every opening's sides, sill and
   head (pieces), and put straight into world coordinates:
     pieces(a, b, y0, y1, holes)       the wall's face as polygons [[s,y]...]
     vslab(bk, ax, c, pcs, t, dir, col, uvs)   a slab t thick from the plane at c, toward dir
     vliner(bk, ax, c, pcs, dir, col, uvs)     a finish 6 mm proud of the plane at c, facing dir
     wall(bk, ax, c, t, a, b, y0, y1, ops, col, uvs, floorY)
                                       a wall t thick centred on c, its colliders round the openings
     liner(bk, ax, fc, dir, a, b, y0, y1, ops, col, uvs)   a finish on a wall's face at fc
     face(bk, pts, n, col, uvs)        one flat polygon (Vector3s), its normal n
   ax "x": the wall runs along x at z = c; "z": along z at x = c. An opening
   is {a, b, sill, head}: from a to b along the wall, sill to head up it.
   Build anything a long way from the origin this way. */

/* ---- walls: outlines less their openings, in a grid (14o's pieces / vslab / vliner, built in world terms) ---- */
const clip=(Pp, k, v, keepHi)=>{ const out=[];
  for(let i=0;i<Pp.length;i++){ const A=Pp[i], Bq=Pp[(i+1)%Pp.length], ia=keepHi ? A[k]>=v-1e-9 : A[k]<=v+1e-9, ib=keepHi ? Bq[k]>=v-1e-9 : Bq[k]<=v+1e-9;
    if(ia) out.push(A); if(ia!==ib){ const t=(v-A[k])/(Bq[k]-A[k]); out.push([A[0]+(Bq[0]-A[0])*t, A[1]+(Bq[1]-A[1])*t]); } }
  return out; };
const area=Pp=>{ let s=0; for(let i=0;i<Pp.length;i++){ const a=Pp[i], b=Pp[(i+1)%Pp.length]; s+=a[0]*b[1]-b[0]*a[1]; } return s/2; };
function pieces(a, b, y0, y1, holes){ const H=holes||[], poly=[[a,y0],[b,y0],[b,y1],[a,y1]];
  const ys=[...new Set([y0,y1].concat(H.flatMap(o=>[o.sill, o.head])).map(v=>+v.toFixed(5)))].sort((p,r)=>p-r);
  const ss=[-1e9].concat([...new Set(H.flatMap(o=>[o.a, o.b]).map(v=>+v.toFixed(5)))].sort((p,r)=>p-r), [1e9]), out=[];
  for(let i=0;i<ys.length-1;i++){ const ya=ys[i], yb=ys[i+1]; if(yb-ya<0.003) continue;
    const band=clip(clip(poly, 1, ya, true), 1, yb, false); if(band.length<3) continue;
    for(let j=0;j<ss.length-1;j++){ const s0=ss[j], s1=ss[j+1]; if(s1-s0<0.003) continue;
      if(H.some(o=>o.a<=s0+1e-4 && o.b>=s1-1e-4 && o.sill<=ya+1e-4 && o.head>=yb-1e-4)) continue;
      const pc=clip(clip(band, 0, s0, true), 0, s1, false); if(pc.length>=3 && Math.abs(area(pc))>1e-5) out.push(pc); } }
  return out; }
const newell=Pp=>{ const n=V3(0,0,0); for(let i=0;i<Pp.length;i++){ const a=Pp[i], b=Pp[(i+1)%Pp.length];
    n.x+=(a.y-b.y)*(a.z+b.z); n.y+=(a.z-b.z)*(a.x+b.x); n.z+=(a.x-b.x)*(a.y+b.y); } return n; };
function addFace(Gm, Pp, n, uvf){ const Q=newell(Pp).dot(n)<0 ? Pp.slice().reverse() : Pp;
  for(let i=1;i<Q.length-1;i++) for(const p of [Q[0],Q[i],Q[i+1]]){ Gm.P.push(p.x,p.y,p.z); Gm.N.push(n.x,n.y,n.z); const u=uvf(p); Gm.U.push(u[0],u[1]); } }
function flush(Gm, bk, col){ if(!Gm.P.length) return; const g=new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(Gm.P,3)); g.setAttribute("normal", new T.Float32BufferAttribute(Gm.N,3)); g.setAttribute("uv", new T.Float32BufferAttribute(Gm.U,2));
  push(bk, g, 0,0,0, 0, col); }
const P3=(ax, c, s, y)=>ax==="x" ? V3(s, y, c) : V3(c, y, s);
const NRM=ax=>ax==="x" ? V3(0,0,1) : V3(1,0,0);
function vslab(bk, ax, c, pcs, t, dir, col, uvs){
  const Gm={P:[],N:[],U:[]}, Nn=NRM(ax), s=uvs||0.5, key=(a,b)=>a[0].toFixed(4)+","+a[1].toFixed(4)+">"+b[0].toFixed(4)+","+b[1].toFixed(4);
  const edges=new Set(); for(const pc of pcs) for(let i=0;i<pc.length;i++) edges.add(key(pc[i], pc[(i+1)%pc.length]));
  for(const pc of pcs){ const front=pc.map(p=>P3(ax, c, p[0], p[1])), back=pc.map(p=>P3(ax, c+dir*t, p[0], p[1]));
    addFace(Gm, front, Nn.clone().multiplyScalar(-dir), p=>[(ax==="x" ? p.x : p.z)*s*-dir, p.y*s]);
    addFace(Gm, back, Nn.clone().multiplyScalar(dir), p=>[(ax==="x" ? p.x : p.z)*s*dir, p.y*s]);
    const cx=pc.reduce((a,p)=>a+p[0],0)/pc.length, cy=pc.reduce((a,p)=>a+p[1],0)/pc.length;
    for(let i=0;i<pc.length;i++){ const a=pc[i], b=pc[(i+1)%pc.length], es=b[0]-a[0], ey=b[1]-a[1], L=Math.hypot(es,ey); if(L<1e-5 || edges.has(key(b, a))) continue;
      let ns=ey/L, ny=-es/L; if((a[0]-cx)*ns+(a[1]-cy)*ny<0){ ns=-ns; ny=-ny; }
      const n=ax==="x" ? V3(ns, ny, 0) : V3(0, ny, ns), dq=p=>ax==="x" ? p.z : p.x, sq=p=>ax==="x" ? p.x : p.z;
      addFace(Gm, [front[i], front[(i+1)%pc.length], back[(i+1)%pc.length], back[i]], n, Math.abs(ns)>Math.abs(ny) ? p=>[dq(p)*s, p.y*s] : p=>[sq(p)*s, dq(p)*s]); } }
  flush(Gm, bk, col); }
function vliner(bk, ax, c, pcs, dir, col, uvs){ const Gm={P:[],N:[],U:[]}, n=NRM(ax).multiplyScalar(dir), s=uvs||0.5;
  for(const pc of pcs) addFace(Gm, pc.map(p=>P3(ax, c+dir*0.006, p[0], p[1])), n, p=>[(ax==="x" ? p.x : p.z)*s*(ax==="x" ? dir : -dir), p.y*s]);
  flush(Gm, bk, col); }
// (its uvs in the face's own plane, in metres: x/z on a floor or a roof, along-and-up on a wall)
function face(bk, Pp, n, col, uvs){ const Gm={P:[],N:[],U:[]}, s=uvs||0.5, nn=n.clone().normalize(), ux=-nn.z, uz=nn.x, L=Math.hypot(ux,uz)||1;
  addFace(Gm, Pp, nn, Math.abs(nn.y)>0.9 ? p=>[p.x*s, p.z*s] : p=>[(p.x*ux+p.z*uz)/L*s, p.y*s]); flush(Gm, bk, col); }
const holesIn=(ops, a, b, y0, y1)=>ops.filter(o=>o.b>a+1e-4 && o.a<b-1e-4 && o.head>y0+1e-4 && o.sill<y1-1e-4)
  .map(o=>({a:Math.max(o.a, a), b:Math.min(o.b, b), sill:Math.max(o.sill, y0), head:Math.min(o.head, y1)}));
// a wall t thick, its centre on the plane at c: the slab, its colliders round the openings; and a liner on either face
function wall(bk, ax, c, t, a, b, y0, y1, ops, col, uvs, floorY){
  vslab(bk, ax, c-t/2, pieces(a, b, y0, y1, holesIn(ops, a, b, y0, y1)), t, 1, col, uvs);
  const sunk=floorY!==undefined && y0<=floorY+0.3 ? y0-0.5 : y0, cl=(p0, p1, q0, q1)=>ax==="x" ? addCol(p0, p1, c-t/2, c+t/2, q0, q1) : addCol(c-t/2, c+t/2, p0, p1, q0, q1);
  for(const sp of _spans(a, b, ops)){ if(!sp.o){ cl(sp.a, sp.b, sunk, y1); continue; }
    if(sp.o.sill>y0+0.01) cl(sp.a, sp.b, sunk, sp.o.sill); if(sp.o.head<y1-0.01) cl(sp.a, sp.b, sp.o.head, y1); } }
const liner=(bk, ax, fc, dir, a, b, y0, y1, ops, col, uvs)=>vliner(bk, ax, fc, pieces(a, b, y0, y1, holesIn(ops, a, b, y0, y1)), dir, col, uvs||0.5);

const _BX=(w,h,d,x,y,z,col)=>bx("paintm", w,h,d, x,y,z, 0.5, 0, col);
/* a window's glass (a breakable pane), its trim outside, its sill inside and, if you like, a pair of curtains; and
   unless lit is false, its glow after dark (a colour string tints it). ax: the wall's axis; c its centre plane; t its
   thickness; o the opening; out: +1/-1 the outside */
function windowAt(ax, c, t, o, out, trim, curtain, lit){
  const w=o.b-o.a, h=o.head-o.sill, m=(o.a+o.b)/2, ym=(o.sill+o.head)/2, B=_BX;
  push("glass", planeGeo(w-0.02, h-0.02, 0), ax==="x" ? m : c, ym, ax==="x" ? c : m, ax==="x" ? 0 : Math.PI/2, "#ffffff");
  if(lit!==false){ const gi=c-out*0.035, ry=ax==="x" ? (out>0 ? 0 : Math.PI) : (out>0 ? Math.PI/2 : -Math.PI/2);
    push("winwarm", planeGeo(w-0.04, h-0.04, 0), ax==="x" ? m : gi, ym, ax==="x" ? gi : m, ry, typeof lit==="string" ? lit : "#ffffff"); }
  const fo=c+out*(t/2+0.032), fi=c-out*(t/2+0.02);
  // (the jambs a centimetre deeper than the head and sill they meet, so no face of one lies in a face of the other)
  for(const [ww, hh, ds, dy, dp] of [[w+0.16, 0.07, 0, h/2+0.035, 0.04],[w+0.16, 0.07, 0, -h/2-0.035, 0.04],[0.07, h, -w/2-0.035, 0, 0.052],[0.07, h, w/2+0.035, 0, 0.052]]){
    if(ax==="x") B(ww, hh, dp, m+ds, ym+dy, fo, trim||"#e8e4d8"); else B(dp, hh, ww, fo, ym+dy, m+ds, trim||"#e8e4d8"); }
  if(ax==="x") B(w+0.06, 0.03, 0.10, m, o.sill-0.015, fi-out*0.03, "#e8e4d8"); else B(0.10, 0.03, w+0.06, fi-out*0.03, o.sill-0.015, m, "#e8e4d8");
  if(curtain) for(const sd of [-1,1]){ const cx2=m+sd*(w/2-0.05);
    if(ax==="x") B(0.22, h+0.12, 0.02, cx2, ym+0.02, fi-out*0.05, curtain); else B(0.02, h+0.12, 0.22, fi-out*0.05, ym+0.02, cx2, curtain); }
}

/* ---- roofs -----------------------------------------------------------------
   FaceGeo().slab(pts, t) treats pts as a face and hangs the slab t below it, so a roof's points are its TOP and its
   underside is t lower.
   gableRoof(bk, box, eave, ridge, along, over, t, color): two planes from the eaves (eave, over metres past the box)
     to a ridge running along "x" or "z"; returns the gable triangles' outline so the ends can be filled (gableEnds).
   hipRoof is a gable with sloped ends. flatRoof is a slab with a parapet if asked. */
function gableRoof(bk, B, eave, ridge, along, over, t, color){
  const o=over===undefined ? 0.45 : over, th=t||0.16, f=new FaceGeo();
  const run=along==="x" ? (B.z1-B.z0)/2 : (B.x1-B.x0)/2, slope=(ridge-eave)/run, drop=o*slope;
  if(along==="x"){
    const zm=(B.z0+B.z1)/2, x0=B.x0-o, x1=B.x1+o;
    for(const s of [-1,1]){ const ze=s<0 ? B.z0-o : B.z1+o;
      f.slab([V3(x0, eave-drop, ze), V3(x1, eave-drop, ze), V3(x1, ridge, zm), V3(x0, ridge, zm)], th, 0.5); }
  }else{
    const xm=(B.x0+B.x1)/2, z0=B.z0-o, z1=B.z1+o;
    for(const s of [-1,1]){ const xe=s<0 ? B.x0-o : B.x1+o;
      f.slab([V3(xe, eave-drop, z0), V3(xe, eave-drop, z1), V3(xm, ridge, z1), V3(xm, ridge, z0)], th, 0.5); }
  }
  push(bk, f.geo(), 0,0,0, 0, color);
  return {along:along, eave:eave, ridge:ridge};
}
// the triangles under a gable roof, filled as slabs t thick on each end wall's plane (the wall's outer face at c)
function gableEnds(bk, B, eave, ridge, along, t, color, uvs){
  const th=t||0.2;
  if(along==="x"){ const zm=(B.z0+B.z1)/2;
    for(const [c, dir] of [[B.x0, 1],[B.x1, -1]]){
      const pts=[V3(c, eave, B.z0), V3(c, eave, B.z1), V3(c, ridge-0.02, zm)];
      face(bk, pts, V3(-dir,0,0), color, uvs); face(bk, pts.map(p=>V3(c+dir*th, p.y, p.z)), V3(dir,0,0), color, uvs); } }
  else { const xm=(B.x0+B.x1)/2;
    for(const [c, dir] of [[B.z0, 1],[B.z1, -1]]){
      const pts=[V3(B.x0, eave, c), V3(B.x1, eave, c), V3(xm, ridge-0.02, c)];
      face(bk, pts, V3(0,0,-dir), color, uvs); face(bk, pts.map(p=>V3(p.x, p.y, c+dir*th)), V3(0,0,dir), color, uvs); } }
}
function flatRoof(bk, B, top, t, over, color, parapet){
  const o=over||0, th=t||0.25;
  bx(bk, B.x1-B.x0+2*o, th, B.z1-B.z0+2*o, (B.x0+B.x1)/2, top-th/2, (B.z0+B.z1)/2, 0.5, 0, color);
  if(parapet){ const h=parapet, pt=0.2;
    for(const [x0,x1,z0,z1] of [[B.x0-o, B.x1+o, B.z0-o, B.z0-o+pt],[B.x0-o, B.x1+o, B.z1+o-pt, B.z1+o],
                                [B.x0-o, B.x0-o+pt, B.z0-o+pt+0.003, B.z1+o-pt-0.003],[B.x1+o-pt, B.x1+o, B.z0-o+pt+0.003, B.z1+o-pt-0.003]])
      wallBox(bk, x0, x1, z0, z1, top-0.01, top+h, color, 0.5, top); }
}


/* ---- building(): a whole rectangular building ------------------------------
   The footprint is the OUTSIDE of the walls. Openings are on a side ("n" the
   wall at z0, "s" at z1, "w" at x0, "e" at x1), `at` metres along it from its
   start (x0 for n and s, z0 for w and e) to the opening's middle.
     B = building({
       x0, x1, z0, z1,                 the outside of the walls
       floor,                          the finished floor (default: the ground at the middle + 0.15)
       height:3.0, t:0.3,              floor to ceiling; wall thickness
       outer:{bk:"brick", color, uv},  the walls and their outside face
       inner:{bk:"plaster", color},    the liner inside (null: none)
       floorMat:{bk:"quarry", color}, ceiling:{bk:"plaster", color},
       openings:[
         {side:"s", at:4, door:"store", label:"THE DOOR", opensIn:false, w, h, tint, latch},
         {side:"n", at:2, window:true, w:1.2, sill:0.9, head:2.1, curtain:"#a03a2a", lit:true},   (lit:false: dark at night)
         {side:"e", at:3, w:1.0, h:2.1}            (an open doorway)
       ],
       roof:{kind:"gable", along:"x", ridge, over, bk:"shingle", color, ends:{bk, color}}
          | {kind:"flat", t, over, parapet, bk:"concrete", color},
       noFloor:true,                   lay the floor yourself (round a stairwell)
       name:"THE HALL",                the indoor zone's name (HUD), and it keeps the rain off
       lamps:2,                        ceiling fixtures down the middle (or [{x,z}...])
       lampColor, lampIntensity
     })
   Returns {inner:{x0,x1,z0,z1}, floor, ceil, doors:[DOORS entries], zone}.
   Grade the ground under it to the floor (Terrain.toward in the world's height function) or the terrain shows
   through the floor: it warns if it does. A doorway gets a walkable flat across the wall's thickness. */
function building(o){
  const t=o.t||0.3, H=o.height||3.0;
  const fl=o.floor!==undefined ? o.floor : Terrain.groundAt((o.x0+o.x1)/2, (o.z0+o.z1)/2)+0.15;
  const top=fl+H, OB=Object.assign({bk:"brick", color:BRICK, uv:0.35}, o.outer||{});
  const IN=o.inner===null ? null : Object.assign({bk:"plaster", color:"#e8e2d4", uv:0.5}, o.inner||{});
  const I={x0:o.x0+t, x1:o.x1-t, z0:o.z0+t, z1:o.z1-t};
  // the ground must be under the floor everywhere inside
  for(const [x,z] of [[I.x0,I.z0],[I.x1,I.z0],[I.x0,I.z1],[I.x1,I.z1],[(I.x0+I.x1)/2,(I.z0+I.z1)/2]])
    if(Terrain.groundAt(x,z)>fl-0.02) { console.warn("building "+(o.name||"")+": the ground is above the floor at", x.toFixed(1), z.toFixed(1)); break; }
  const SIDES={
    n:{ax:"x", c:o.z0+t/2, a:o.x0, b:o.x1, out:-1, fc:I.z0, ia:I.x0, ib:I.x1},
    s:{ax:"x", c:o.z1-t/2, a:o.x0, b:o.x1, out: 1, fc:I.z1, ia:I.x0, ib:I.x1},
    w:{ax:"z", c:o.x0+t/2, a:o.z0+t, b:o.z1-t, out:-1, fc:I.x0, ia:I.z0, ib:I.z1},
    e:{ax:"z", c:o.x1-t/2, a:o.z0+t, b:o.z1-t, out: 1, fc:I.x1, ia:I.z0, ib:I.z1}};
  const ops={n:[], s:[], w:[], e:[]}, doors=[];
  for(const q of (o.openings||[])){
    const S=SIDES[q.side], start=(S.ax==="x" ? o.x0 : o.z0), m=start+q.at;
    const isWin=!!q.window, w=q.w||(isWin ? 1.2 : 1.0);
    // (a doorway is cut right down through the wall's foot, below the slab: no sill of wall is left under it to stand
    //  in the way of a foot coming up from lower ground, and the slab's edge is the threshold)
    const op={a:m-w/2, b:m+w/2, sill:isWin ? fl+(q.sill||0.9) : fl-0.45, head:fl+(q.head||q.h||(isWin ? 2.1 : 2.12)), q:q};
    ops[q.side].push(op);
  }
  // the walls, their liners, the openings' trim
  for(const k in SIDES){
    const S=SIDES[k], O=ops[k];
    wall(OB.bk, S.ax, S.c, t, S.a, S.b, fl-0.4, top, O, OB.color, OB.uv, fl);
    if(IN) liner(IN.bk, S.ax, S.fc, -S.out, S.ia, S.ib, fl, top, O, IN.color, IN.uv);
    for(const op of O){
      const q=op.q, mid=(op.a+op.b)/2;
      if(q.window){ windowAt(S.ax, S.c, t, op, S.out, q.trim, q.curtain, q.lit); continue; }
      // a doorway: a walkable flat across the wall, the frame, and a leaf if it has one
      if(S.ax==="x") addFlat(op.a, op.b, S.c-t/2-0.05, S.c+t/2+0.05, fl); else addFlat(S.c-t/2-0.05, S.c+t/2+0.05, op.a, op.b, fl);
      if(q.frame!==false){ if(S.ax==="x") frameX(S.c, t, op.a, op.b, op.head, q.frameColor, fl); else frameZ(S.c, t, op.a, op.b, op.head, q.frameColor, fl); }
      if(q.door){
        // the leaf's frame: its local +z into the building, its +x along the wall from the hinge
        const ry={n:0, s:Math.PI, w:Math.PI/2, e:-Math.PI/2}[k];
        const hinge={n:[op.a, S.c], s:[op.b, S.c], w:[S.c, op.b], e:[S.c, op.a]}[k];
        makeDoor(XF(hinge[0], hinge[1], ry), 0, fl, 0, q.label||"THE DOOR", !!q.opensIn, q.ajar||0, q.door, q.tint);
        const D=DOORS[DOORS.length-1];
        if(q.latch){ const L=S.ax==="x" ? {x0:op.a, x1:op.b, z0:S.c-0.06, z1:S.c+0.06, y0:fl, y1:op.head} : {x0:S.c-0.06, x1:S.c+0.06, z0:op.a, z1:op.b, y0:fl, y1:op.head};
          latchDoor(L); }
        doors.push(D);
      }
    }
  }
  // the floor, a slab under it, the ceiling
  const FM=Object.assign({bk:"quarry", color:"#ffffff", uv:0.5}, o.floorMat||{}), CM=Object.assign({bk:"plaster", color:"#f0ece2", uv:0.5}, o.ceiling||{});
  if(!o.noFloor){                                   // (noFloor: the world lays its own, round a stairwell say)
    floorAt(FM.bk, I.x0, I.x1, I.z0, I.z1, fl, FM.color, FM.uv);
    bx("concrete", o.x1-o.x0+0.1, 0.5, o.z1-o.z0+0.1, (o.x0+o.x1)/2, fl-0.26, (o.z0+o.z1)/2, 0.5, 0, "#a8a49a");
    addFlat(I.x0, I.x1, I.z0, I.z1, fl); }
  ceilAt(CM.bk, I.x0, I.x1, I.z0, I.z1, top-0.004, CM.color, CM.uv);
  // the roof
  const R=Object.assign({kind:"flat"}, o.roof||{}), FP={x0:o.x0, x1:o.x1, z0:o.z0, z1:o.z1};
  let roofTop=top+0.3;
  if(R.kind==="gable"){
    const along=R.along||((o.x1-o.x0)>=(o.z1-o.z0) ? "x" : "z"), run=along==="x" ? (o.z1-o.z0)/2 : (o.x1-o.x0)/2;
    const ridge=R.ridge||top+run*0.75;
    gableRoof(R.bk||"shingle", FP, top, ridge, along, R.over, R.t, R.color||"#ffffff");
    const E=Object.assign({bk:OB.bk, color:OB.color}, R.ends||{});
    gableEnds(E.bk, FP, top, ridge, along, t, E.color, OB.uv);
    // a fascia along each eave, proud of the roof's edge
    roofTop=ridge;
  }else{
    flatRoof(R.bk||"concrete", FP, top+(R.t||0.25), R.t||0.25, R.over||0.08, R.color||"#9a978f", R.parapet);
    roofTop=top+(R.t||0.25)+(R.parapet||0);
  }
  // the room: an indoor zone (dims the sky's light, keeps the rain off), and the lamps
  const zone=o.name||"INDOORS";
  addZone(o.x0, o.x1, o.z0, o.z1, fl-0.5, top+0.2, zone, true);
  const LC=o.lampColor||0xfff1dc, LI=o.lampIntensity||0.9;
  let lamps=o.lamps===undefined ? Math.max(1, Math.round(Math.max(I.x1-I.x0, I.z1-I.z0)/5)) : o.lamps;
  if(typeof lamps==="number"){ const n=lamps, along=(I.x1-I.x0)>=(I.z1-I.z0); lamps=[];
    for(let i=0;i<n;i++){ const f=(i+0.5)/n; lamps.push(along ? {x:lerp(I.x0, I.x1, f), z:(I.z0+I.z1)/2} : {x:(I.x0+I.x1)/2, z:lerp(I.z0, I.z1, f)}); } }
  for(const L of lamps){
    bx("paintm", 1.24, 0.05, 0.30, L.x, top-0.03, L.z, 0, 0, "#d8d6d0");
    bx("tube", 1.18, 0.02, 0.24, L.x, top-0.064, L.z, 0, 0, "#ffffff");
    LAMPS.push({x:L.x, y:top-0.25, z:L.z, color:LC, intensity:LI, dist:Math.max(8, (I.x1-I.x0)+(I.z1-I.z0)), decay:1.5, indoor:true, circ:"main",
                vol:[o.x0-0.6, o.x1+0.6, o.z0-0.6, o.z1+0.6, fl-1, top+0.5]});
  }
  return {inner:I, floor:fl, ceil:top, roofTop:roofTop, doors:doors, zone:zone, ops:ops};
}
