"use strict";
/* ENGINE · 04-terrain.js
   the height field's toolkit (noise, signed distances, grading), the world's
   hooks into it, the nested LOD rings of ground, the lawn shader, groundAt
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   4 · TERRAIN
   The ground is a height field the WORLD supplies, drawn as nested rings of
   ever finer grids: 32 m out to the ground's edge, 16 m, 8 m, and 2 m (or
   finer) where you walk. Each finer ring is a hole in the one outside it,
   and its box lands on the outer ring's lattice at all four edges, so every
   coarse cell is wholly in a hole or wholly out and the border nodes are
   shared: no cracks. terrainRings() works the lattice out for you.

   THE WORLD'S PART. Call Terrain.define({...}) once, before buildTerrain():
     height(x,z)        the ground's height. Start from Terrain.natural(x,z)
                        (rolling country) and grade it with Terrain.toward()
                        to flat pads, roads, clearings.
     clear(x,z)         signed distance to the nearest clearing the world has
                        cut (negative inside one): woods grow where it is
                        positive, lawn where it is negative. Default: none,
                        all woods... so give it one.
     path(x,z)          the same for narrow ways that must stay open (a
                        trail, a camp). Default: 1e9.
     tint(x,z,y,slope,out)  the ground's colour (a THREE.Color to set).
                        Default: lawn in clearings, verge and litter
                        toward the woods, rock on steep slopes.
     lawn(x,z,slope)    [how much is lawn 0..1, how much of that is mown in
                        stripes 0..1]. Default: lawn where clear() < 0.
     water(x,z)         signed distance to open water's shore (negative
                        over it). Default: none.
   Then buildTerrain(rings) draws it. Never change what height() returns
   after the ground is built: groundAt remembers its corners (_GH).
   ---------------------------------------------------------------------- */
const Terrain=(function(){
  const fract=x=>x-Math.floor(x);
  const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453123);
  function vnoise(x,y){
    const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
    const a=hash(xi,yi), b=hash(xi+1,yi), c=hash(xi,yi+1), d=hash(xi+1,yi+1);
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;
  }
  function fbm(x,y,o){ let f=0,a=0.5,fr=1; for(let i=0;i<(o||5);i++){ f+=a*vnoise(x*fr,y*fr); fr*=2; a*=0.5; } return f; }
  // ridged noise, 0..1, crests at 1: for hills with gullies
  function ridged(x,y,o){ const n=1-Math.abs(2*fbm(x,y,o)-1); return n*n; }

  /* Rolling country before anyone graded it: a dissected plateau, long ridges along `grain` (radians), broad valleys,
     nothing sharp, quieter within `calm` metres of (cx, cz) and wilder out toward `rim` where hills close the
     horizon. All in metres. o: {cx, cz, amp, calm, ridge, grain, rim, rimH} */
  function natural(x,z,o){
    o=o||NAT;
    const cx=o.cx||0, cz=o.cz||0, d=Math.hypot(x-cx, z-cz);
    const amp=(o.amp===undefined?1:o.amp)*(0.30+0.70*smoothstep(60, o.calm||900, d));
    let h=(fbm(x*0.0031+11, z*0.0031+5)-0.5)*74
         +(fbm(x*0.011+3,  z*0.011+9)-0.5)*15
         +(fbm(x*0.043,    z*0.043, 3)-0.5)*2.2;
    const g=o.grain===undefined ? 0.9 : o.grain, rq=(x*Math.cos(g)+z*Math.sin(g))*0.0042 + fbm(x*0.0021+4, z*0.0021+2, 3)*2.2;
    h += Math.sin(rq*6.283)*(o.ridge===undefined?17:o.ridge)*smoothstep(160,760,d);
    // and far out the ridges stand up into hills that close the horizon all round, coming down again over the last
    // couple of hundred metres before the ground's edge so the last crests, faded into the sky, do not stand up pale
    if(o.rim!==false){
      const e=Math.max(Math.abs(x-cx), Math.abs(z-cz)), G=GROUND_EDGE, ge=Math.min(x-G.x0, G.x1-x, z-G.z0, G.z1-z);
      const r0=o.rim||1300;
      let rim=smoothstep(r0, r0+850, e)*(1-0.6*(1-smoothstep(-20, 170, ge)));
      if(rim>0 && W.rimMask) rim*=W.rimMask(x,z);
      if(rim>0){ const rr=1-Math.abs(2*fbm(x*0.0016+31, z*0.0016+17, 4)-1), gl=1-Math.abs(2*fbm(x*0.0062+5, z*0.0062+13, 3)-1), sp=fbm(x*0.013+9, z*0.013+1, 2);
        h+=rim*(o.rimH===undefined?1:o.rimH)*(55+100*rr*rr+(gl-0.55)*62+(sp-0.5)*18)/Math.max(amp, 0.3); }
    }
    return h*amp;
  }
  const NAT={cx:0, cz:0};

  function boxDist(B,x,z){ return Math.hypot(Math.max(B.x0-x, 0, x-B.x1), Math.max(B.z0-z, 0, z-B.z1)); }
  // a signed distance to a box: negative inside
  function boxSD(B,x,z){
    const dx=Math.max(B.x0-x, x-B.x1), dz=Math.max(B.z0-z, z-B.z1);
    return dx>0||dz>0 ? Math.hypot(Math.max(dx,0),Math.max(dz,0)) : Math.max(dx,dz);
  }
  const pathBox=(P,pad)=>{
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const p of P){ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); z0=Math.min(z0,p.z); z1=Math.max(z1,p.z); }
    return {x0:x0-pad, x1:x1+pad, z0:z0-pad, z1:z1+pad};
  };
  // pull h towards level y with full weight inside `half` and none past half+blend
  const toward=(h,y,d,half,blend)=>{ const t=smoothstep(half, half+blend, d); return y+(h-y)*t; };
  /* grade along a smoothed path (01's smoothPath, with y on its points): level across it to `half`, blended out over
     `blend`. Cheap outside the path's box. */
  function gradePath(h, P, x, z, half, blend){
    const B=P._box||(P._box=pathBox(P, half+blend+2));
    if(x<B.x0 || x>B.x1 || z<B.z0 || z>B.z1) return h;
    const q=distToPath(P,x,z); return toward(h, q.y, q.d, half, blend);
  }
  // distance to a smoothed path, cheap outside its box
  function pathD(P, x, z, pad){
    const B=P._boxD||(P._boxD=pathBox(P, pad||40));
    if(x<B.x0 || x>B.x1 || z<B.z0 || z>B.z1) return 1e9;
    return distToPath(P,x,z).d;
  }

  /* ---- the world's hooks ---------------------------------------------- */
  const W={
    height:(x,z)=>natural(x,z),
    clear:(x,z)=>1e9, path:(x,z)=>1e9, water:(x,z)=>1e9,
    tint:null, lawn:null, rimMask:null, wander:9,
  };
  function define(o){ Object.assign(W, o); if(o.natural) Object.assign(NAT, o.natural); }

  function heightAt(x,z){ return W.height(x,z); }
  /* siteDist: the clearings the world cut (lawns, pads, roads), their edge left to wander a few metres the way a
     mown edge does (W.wander, metres). pathDist: narrow ways that must stay open. clearDist is the nearer. Everything
     that cares (the ground's colour, which trees grow where, the canopy) asks these, so the edge of the woods is the
     same edge for all of them. */
  function siteDist(x,z){ const d=W.clear(x,z); return d>=1e8 ? d : d+(fbm(x*0.045+7, z*0.045+3, 3)-0.5)*W.wander; }
  function pathDist(x,z){ return W.path(x,z); }
  function clearDist(x,z){ return Math.min(siteDist(x,z), pathDist(x,z)); }
  function lakeSD(x,z){ return W.water(x,z); }
  function mask(x,z){ return smoothstep(0, 5, clearDist(x,z)); }
  return {define:define, hooks:W, heightAt:heightAt, natural:natural, fbm:fbm, vnoise:vnoise, ridged:ridged, hash:hash,
          clearDist:clearDist, siteDist:siteDist, pathDist:pathDist, mask:mask, boxDist:boxDist, boxSD:boxSD,
          lakeSD:lakeSD, toward:toward, gradePath:gradePath, pathD:pathD, pathBox:pathBox};
})();

/* ---- the rings ------------------------------------------------------
   Cell sizes are exact multiples of one another and each inner ring's box
   lands on the outer ring's lattice at all four edges, so every coarse cell
   is wholly in a hole or wholly out, and the border nodes are shared.
   A ring is {x0,x1,z0,z1, cell, holes:[boxes], name, skirt}. A hole is a box
   on that ring's own lattice: the next finer ring, or a basement dug under
   the ground (with bare:true, no apron is hung round it, because one would
   hang through the room below; the walls of what is dug there cover its
   edges). `skirt` hangs a single-wound apron that far down off the ring's
   border and its holes, so a crack can never show sky.

   terrainRings(spec) builds the usual set for you:
     spec = { cx, cz,                       the middle of the action
              levels:[{cell:2, half:240}, {cell:8, half:900}, {cell:16, half:2000}],
              extra:[{box, cell, holes, name}],   finer patches let into a ring, on its lattice
              holes:{2:[box...]} }                 holes in a level (by cell size), on its lattice
   The outermost ring is always 32 m to GROUND_EDGE. Boxes are snapped
   outward to the coarser lattice, so you can give rough numbers. */
const TERRAIN_RINGS=[];
let TERRAIN_MAT=null, TERRAIN_TINT=null;      // (the ground's colour at a point, for whatever lies on it)
function terrainRings(spec){
  const cx=spec.cx||0, cz=spec.cz||0, lv=(spec.levels||[{cell:2, half:240}, {cell:8, half:900}, {cell:16, half:2000}]).slice().sort((a,b)=>a.cell-b.cell);
  const snapOut=(v, c, up)=>up ? Math.ceil(v/c)*c : Math.floor(v/c)*c;
  const G=GROUND_EDGE;
  const outer={x0:snapOut(G.x0,32,false), x1:snapOut(G.x1,32,true), z0:snapOut(G.z0,32,false), z1:snapOut(G.z1,32,true), cell:32, name:"ground-outer", skirt:60, holes:[]};
  const rings=[];
  for(let i=0;i<lv.length;i++){
    const L=lv[i], coarse=i+1<lv.length ? lv[i+1].cell : 32;
    const b={x0:snapOut(cx-L.half, coarse, false), x1:snapOut(cx+L.half, coarse, true), z0:snapOut(cz-L.half, coarse, false), z1:snapOut(cz+L.half, coarse, true)};
    // never past the next ring out
    const P=i+1<lv.length ? null : outer;
    if(P){ b.x0=Math.max(b.x0, P.x0); b.x1=Math.min(b.x1, P.x1); b.z0=Math.max(b.z0, P.z0); b.z1=Math.min(b.z1, P.z1); }
    rings.push(Object.assign(b, {cell:L.cell, name:L.name||("ground-"+L.cell+"m"), skirt:L.skirt===undefined ? Math.max(6, L.cell*3) : L.skirt,
      holes:((spec.holes||{})[L.cell]||[]).slice()}));
  }
  for(let i=rings.length-1;i>0;i--){ const inner=rings[i-1], outerR=rings[i];
    inner.x0=Math.max(inner.x0, outerR.x0); inner.x1=Math.min(inner.x1, outerR.x1); inner.z0=Math.max(inner.z0, outerR.z0); inner.z1=Math.min(inner.z1, outerR.z1);
    outerR.holes.push(inner); }
  if(rings.length) outer.holes.push(rings[rings.length-1]);
  const all=[outer].concat(rings.slice().reverse());
  // finer patches let into a ring: each is a hole in the coarsest ring that wholly holds it
  for(const E of (spec.extra||[])){
    const R=Object.assign({holes:[], skirt:0, name:"ground-patch"}, E.box||E, {cell:E.cell, holes:E.holes||[], name:E.name||"ground-patch", skirt:E.skirt||0});
    let host=null;
    for(const r of all) if(r.cell>R.cell && R.x0>=r.x0 && R.x1<=r.x1 && R.z0>=r.z0 && R.z1<=r.z1 && !r.holes.some(h=>h!==R && R.x0>=h.x0 && R.x1<=h.x1 && R.z0>=h.z0 && R.z1<=h.z1)) host=r;
    if(host) host.holes.push(R); else console.warn("terrainRings: no ring holds the patch", R);
    all.push(R);
  }
  return all;
}
// a box is on a lattice of `cell` metres if all four of its edges are
function onLattice(b, cell){ const k=v=>Math.abs(v/cell-Math.round(v/cell))<1e-6; return k(b.x0)&&k(b.x1)&&k(b.z0)&&k(b.z1); }

const _TC={lawn:new T.Color(0x506f38), mow:new T.Color(0x5a713c), verge:new T.Color(0x67723f), dry:new T.Color(0x7c7848),
           lush:new T.Color(0x3f5a2e), litter:new T.Color(0x5f4d35), moss:new T.Color(0x4d5a30), deep:new T.Color(0x3d3729),
           rock:new T.Color(0x6f6a5c), shore:new T.Color(0x857a60)};
/* the default colour of the ground at (x,z): lawn in the clearings, never one green (clumps at a couple of scales,
   drier on the rises, lusher where it is low), litter and moss under the trees going darker further in, wet sand at
   a shore, rock on a steep face */
function defaultTint(x,z,y,slope,out){
  const sd=Terrain.siteDist(x,z), m=smoothstep(1.5, 10, sd), C=_TC;
  out.copy(C.lawn);
  out.lerp(C.verge, smoothstep(-10, 0, sd)*0.5);
  const g1=Terrain.fbm(x*0.045+3.1, z*0.045+7.7, 3), g2=Terrain.fbm(x*0.23+11.0, z*0.23+2.0, 2);
  out.lerp(C.dry, smoothstep(0.52,0.74,g1)*0.38);
  out.lerp(C.lush, smoothstep(0.44,0.22,g2)*0.28);
  const patch=Terrain.fbm(x*0.07+5,z*0.07+1,3);
  _TC._c=_TC._c||new T.Color();
  const c2=_TC._c.copy(C.litter).lerp(C.moss, smoothstep(0.42,0.62,patch));
  c2.lerp(C.deep, smoothstep(8,40,sd)*0.7);
  out.lerp(c2, m);
  const ls=Terrain.lakeSD(x,z);
  if(ls<4.5) out.lerp(C.shore, (1-smoothstep(0.4, 4.5, ls))*0.85);
  out.lerp(C.rock, smoothstep(0.35,0.8,slope)*0.6);
}
function defaultLawn(x,z,slope){
  const sd=Terrain.siteDist(x,z);
  let w=1-smoothstep(1.5, 10, sd);
  w*=1-smoothstep(0.35, 0.8, slope)*0.7;
  const ls=Terrain.lakeSD(x,z); if(ls<3) w*=smoothstep(0.5, 3, ls);
  return [w, w*(1-smoothstep(-8, 0, sd))];
}
function buildTerrain(rings){
  const tint=Terrain.hooks.tint||defaultTint, lawnAt=Terrain.hooks.lawn||defaultLawn;
  function grid(R,cell,holes,name,skirt){
    const x0=R.x0, x1=R.x1, z0=R.z0, z1=R.z1;
    const nx=Math.round((x1-x0)/cell), nz=Math.round((z1-z0)/cell);
    TERRAIN_RINGS.push({x0:x0, x1:x1, z0:z0, z1:z1, cell:cell, holes:holes||[], name:name});
    const H=new Float32Array((nx+1)*(nz+1));
    for(let j=0;j<=nz;j++) for(let i=0;i<=nx;i++) H[j*(nx+1)+i]=Terrain.heightAt(x0+i*cell, z0+j*cell);
    const P=[], C=[], U=[], G2=[], IDX=[], c=new T.Color();
    for(let j=0;j<=nz;j++) for(let i=0;i<=nx;i++){
      const k=j*(nx+1)+i, x=x0+i*cell, z=z0+j*cell, y=H[k];
      const hx=H[j*(nx+1)+Math.min(nx,i+1)]-H[j*(nx+1)+Math.max(0,i-1)];
      const hz=H[Math.min(nz,j+1)*(nx+1)+i]-H[Math.max(0,j-1)*(nx+1)+i];
      const slope=Math.min(1, Math.hypot(hx,hz)/(cell*2));
      tint(x,z,y,slope,c);
      const g=0.94+(hash2(x*0.37,z*0.37)-0.5)*0.10;
      P.push(x,y,z); U.push(x*0.25, z*0.25); C.push(c.r*g, c.g*g, c.b*g);
      const lw=lawnAt(x,z,slope); G2.push(lw[0], lw[1]);
    }
    const inHole=(cx0,cx1,cz0,cz1)=>{
      for(const h of holes||[]) if(cx0>=h.x0 && cx1<=h.x1 && cz0>=h.z0 && cz1<=h.z1) return true;
      return false;
    };
    for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){
      const cx0=x0+i*cell, cz0=z0+j*cell;
      if(inHole(cx0, cx0+cell, cz0, cz0+cell)) continue;
      const a=j*(nx+1)+i, b=a+1, d=a+nx+1, e=d+1;
      IDX.push(a,d,b, b,d,e);
    }
    // a single-wound apron off every border and round every hole: two windings sum their normals to zero and shade black
    const hangSkirt=(ring,drop)=>{
      const base=P.length/3;
      for(let pass=0;pass<2;pass++) for(const v of ring){
        P.push(P[v*3], P[v*3+1]-(pass?drop:0), P[v*3+2]);
        C.push(C[v*3]*(pass?0.8:1), C[v*3+1]*(pass?0.8:1), C[v*3+2]*(pass?0.8:1));
        U.push(U[v*2], U[v*2+1]+(pass?drop*0.25:0)); G2.push(G2[v*2]*(pass?0:1), 0);
      }
      const n=ring.length;
      for(let k=0;k<n-1;k++){ const a1=base+k, b1=base+k+1, a2=base+n+k, b2=base+n+k+1; IDX.push(a1,a2,b1, b1,a2,b2); }
    };
    if(skirt){
      const border=[];
      for(let i=0;i<=nx;i++) border.push(i);
      for(let j=1;j<=nz;j++) border.push(j*(nx+1)+nx);
      for(let i=nx-1;i>=0;i--) border.push(nz*(nx+1)+i);
      for(let j=nz-1;j>=1;j--) border.push(j*(nx+1));
      border.push(0);
      hangSkirt(border, skirt);
      for(const h of holes||[]){
        if(h.bare) continue;
        const i0=Math.round((h.x0-x0)/cell), i1=Math.round((h.x1-x0)/cell);
        const j0=Math.round((h.z0-z0)/cell), j1=Math.round((h.z1-z0)/cell);
        if(i0<0 || j0<0 || i1>nx || j1>nz || i1-i0<1 || j1-j0<1) continue;
        const ring=[];
        for(let i=i0;i<=i1;i++) ring.push(j0*(nx+1)+i);
        for(let j=j0+1;j<=j1;j++) ring.push(j*(nx+1)+i1);
        for(let i=i1-1;i>=i0;i--) ring.push(j1*(nx+1)+i);
        for(let j=j1-1;j>=j0;j--) ring.push(j*(nx+1)+i0);
        hangSkirt(ring, skirt);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(P,3));
    g.setAttribute("color",    new T.Float32BufferAttribute(C,3));
    g.setAttribute("uv",       new T.Float32BufferAttribute(U,2));
    g.setAttribute("grass",    new T.Float32BufferAttribute(G2,2));
    g.setIndex(IDX); g.computeVertexNormals();
    const mesh=new T.Mesh(g,terrainMaterial()); mesh.receiveShadow=true; mesh.name=name;
    scene.add(mesh); return mesh;
  }
  TERRAIN_TINT=tint;
  for(const R of rings){
    for(const h of R.holes||[]) if(!onLattice(h, R.cell)) console.warn("terrain: a hole in "+R.name+" is not on its "+R.cell+" m lattice", h);
    grid(R, R.cell, R.holes||[], R.name||"ground", R.skirt===undefined ? 6 : R.skirt);
  }
  TERRAIN_RINGS.sort((a,b)=>a.cell-b.cell);        // finest ring wins
  return TERRAIN_RINGS;
}
/* THE GROUND'S MATERIAL. One map (TEX.ground) carries the grain; the vertex colour says what it is. The lawn is
   TEX.lawn at 1.6 m, multiplied with itself at 7.3 m (more of that further off) so no repeat shows near or far; and
   where it is mown, bands along z that go light and dark as you look along them one way or the other, the way grass
   laid over by a mower does, and fade side on. And the ground is never as smooth as its grid: the normal takes a
   little roll from a few long crossing swells and finer hummocks, fainter on what is walked on close to, fading where
   a pixel is wider than a hummock so far fields do not shimmer. Grass is never modelled as blades. */
function terrainMaterial(){
  if(TERRAIN_MAT) return TERRAIN_MAT;
  TERRAIN_MAT=new T.MeshStandardMaterial({vertexColors:true, map:TEX.ground, roughness:0.97, metalness:0, side:T.DoubleSide});
  TERRAIN_MAT.onBeforeCompile=(sh)=>{
    sh.uniforms.lawnMap={value:TEX.lawn};
    sh.vertexShader=sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 grass;\nvarying vec2 vGrass;\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGrass=grass; vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;");
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D lawnMap;\nvarying vec2 vGrass;\nvarying vec3 vWPos;")
      .replace("#include <map_fragment>", `
        vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );
        if(vGrass.x > 0.003){
          float fd = smoothstep(6.0, 60.0, distance(vWPos, cameraPosition));
          vec3 l1 = mapTexelToLinear(texture2D(lawnMap, vWPos.xz*0.625)).rgb;
          vec3 l2 = mapTexelToLinear(texture2D(lawnMap, vWPos.xz*0.137 + vec2(0.37, 0.71))).rgb;
          vec3 lw = mix(l1, l1*l2*1.32, 0.35 + 0.45*fd);
          texelColor.rgb = mix(texelColor.rgb, lw*1.06, vGrass.x);
          float band = smoothstep(0.38, 0.62, abs(fract(vWPos.x/2.6) - 0.5)*2.0) - 0.5;
          vec3 vd = normalize(vWPos - cameraPosition);
          texelColor.rgb *= 1.0 + band*vd.z*0.20*vGrass.y*(1.0 - 0.6*fd);
        }
        diffuseColor *= texelColor;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec2 p=vWPos.xz; float fw=length(fwidth(p)); vec2 gr=vec2(0.0);
          const vec2 D0=vec2(0.83, 0.56), D1=vec2(-0.41, 0.91), D2=vec2(0.97, -0.24), D3=vec2(-0.71, -0.70);
          gr+=0.050*cos(dot(p, D0)*0.157+1.3)*D0+0.045*cos(dot(p, D1)*0.149+4.1)*D1;
          gr+=0.060*cos(dot(p, D2)*0.311+2.2)*D2*(1.0-smoothstep(4.0, 10.0, fw));
          gr+=0.055*cos(dot(p, D3)*0.73+0.4)*D3*(1.0-smoothstep(1.5, 4.0, fw));
          gr*=0.35+0.65*smoothstep(25.0, 90.0, distance(vWPos, cameraPosition));
          normal=normalize(normal-mat3(viewMatrix)*vec3(gr.x, 0.0, gr.y)*2.2); }`);
  };
  TERRAIN_MAT.extensions={derivatives:true};
  TERRAIN_MAT.customProgramCacheKey=()=>"terrain-lawn";
  return TERRAIN_MAT;
}

/* The height of the ground you can SEE: find the finest ring that actually draws a triangle here and interpolate it.
   On a slope the drawn triangle and the field it was sampled from differ, and you stand on what is drawn. The rings'
   corners are remembered: the field is fixed once the ground is built, and every foot, wheel and walker asks after the
   same few corners frame after frame. Cleared when it grows past a quarter of a million. */
const _GH=new Map();
function _gh(x, z){
  const k=Math.round(x*16+100000)*400009+Math.round(z*16+100000);       // (to a sixteenth of a metre)
  let h=_GH.get(k);
  if(h===undefined){ if(_GH.size>250000) _GH.clear(); h=Terrain.heightAt(x, z); _GH.set(k, h); }
  return h;
}
function groundAt(x,z){
  for(let r=0;r<TERRAIN_RINGS.length;r++){
    const R=TERRAIN_RINGS[r];
    if(x<R.x0 || x>R.x1 || z<R.z0 || z>R.z1) continue;
    const c=R.cell;
    let i=Math.floor((x-R.x0)/c), j=Math.floor((z-R.z0)/c);
    const nx=Math.round((R.x1-R.x0)/c), nz=Math.round((R.z1-R.z0)/c);
    if(i<0) i=0; if(j<0) j=0; if(i>=nx) i=nx-1; if(j>=nz) j=nz-1;
    const cx0=R.x0+i*c, cz0=R.z0+j*c;
    let holed=false;
    for(let k=0;k<R.holes.length;k++){
      const h=R.holes[k];
      if(cx0>=h.x0 && cx0+c<=h.x1 && cz0>=h.z0 && cz0+c<=h.z1){ holed=true; break; }
    }
    if(holed) continue;
    const u=Math.min(1,Math.max(0,(x-cx0)/c)), v=Math.min(1,Math.max(0,(z-cz0)/c));
    const hb=_gh(cx0+c, cz0), hd=_gh(cx0, cz0+c);
    if(u+v<=1){ const ha=_gh(cx0, cz0); return ha + (hb-ha)*u + (hd-ha)*v; }
    const he=_gh(cx0+c, cz0+c);
    return he + (hd-he)*(1-u) + (hb-he)*(1-v);
  }
  return Terrain.heightAt(x,z);
}
Terrain.groundAt=groundAt;
