"use strict";
/* ENGINE · 14u-water.js
   open water: a pond, a lake, a pool. One sheet, dark, with the sky in it; its
   ripples are wind on the water, and anything moving on it leaves a wake
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   14u · WATER
   waterPlane({x0, x1, z0, z1, y, color, tile, ripple}) lays a sheet over a basin
   (the terrain's height function carves the bed: keep the ground under the
   water everywhere inside it, and above it everywhere outside), sets
   WATER_Y (14q's walkers keep out of it), and returns the mesh. Give the
   world's Terrain.define a `water(x,z)` signed distance to the shore
   (negative over the water): the ground's colour, the mist, the HUD and
   the crowds read it.
   Ripples: a tiling field of long and short wavelets mostly downwind, read
   twice (fine wavelets over a broad slow swell) and drifting two ways, so
   nothing repeats where you can see it. Wakes: WATER.wakeDrop(x, z, s)
   starts a ring of waves at a point, of strength 0..1; the newest 40 are
   kept, and something moving drops one every metre or so behind it (ring
   on ring from a moving boat is the V of a wake). WATER.focus(x, z) is
   where to look for wakes (past 70 m from it the shader skips them).
   Nothing flat and pale goes on the water: it would not be lit like it and
   shows up white at night. You cannot walk on water: the shore is a wall of
   colliders a step short of it, open where a dock goes out (the world's).
   ---------------------------------------------------------------------- */
const WAKE_N=40;
const WATER={sheets:[], t:0, wake:{pts:[], n:0, T:new T.Vector3(0, 1e6, 1e6), flow:new T.Vector4()}};
for(let i=0;i<WAKE_N;i++) WATER.wake.pts.push(new T.Vector4(0, 0, -100, 0));
WATER.wakeDrop=(x, z, s)=>{ const W=WATER.wake; W.pts[W.n%WAKE_N].set(x, z, W.T.x, s); W.n++; };
WATER.focus=(x, z)=>{ WATER.wake.T.y=x; WATER.wake.T.z=z; };
const WATER_NRM=(()=>{ const S=256, c=cvs(S,S), x=c.getContext("2d"), q=_trng(1357), img=x.createImageData(S,S);
      // wavelets on whole-number frequencies, so the sheet tiles: most within forty degrees of the wind, a few across it
      const waves=[]; for(let k=0;k<30;k++){ const f=3+q()*q()*22, th=0.6+(q()-0.5)*(k<24 ? 1.4 : 3.6);
        const fx=Math.round(f*Math.cos(th)), fy=Math.round(f*Math.sin(th)); if(!fx && !fy) continue;
        waves.push([fx, fy, Math.pow(Math.hypot(fx, fy), -1.25)*(0.7+q()*0.6), q()*Math.PI*2]); }
      for(let j=0;j<S;j++) for(let i=0;i<S;i++){ let gx=0, gy2=0;
        for(const [fx, fy, a, ph] of waves){ const w=Math.PI*2/S, cc=Math.cos(w*(fx*i+fy*j)+ph)*a*w; gx+=cc*fx; gy2+=cc*fy; }
        const sc=8, n=Math.hypot(gx*sc, gy2*sc, 1), o=(j*S+i)*4;
        img.data[o]=128-(gx*sc/n)*127; img.data[o+1]=128-(gy2*sc/n)*127; img.data[o+2]=128+(1/n)*127; img.data[o+3]=255; }
      x.putImageData(img,0,0); const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; return t; })();;
function waterPlane(o){
  const w=o.x1-o.x0, d=o.z1-o.z0, g=new T.PlaneGeometry(w, d, 1, 1), tile=o.tile||3.5;
  const U=g.attributes.uv; for(let i=0;i<U.count;i++) U.setXY(i, U.getX(i)*w/tile, U.getY(i)*d/tile);
  const nrm=WATER_NRM;
  const rs=o.ripple===undefined ? 0.20 : o.ripple;          // (how hard the ripples are: a lake's 0.2, a sheltered pond's less)
  const m=envOut(new T.MeshStandardMaterial({color:o.color||0x34505c, roughness:0.10, metalness:0.55, normalMap:nrm, normalScale:new T.Vector2(rs, rs)}), 1.0);
  const W=WATER.wake;
    m.onBeforeCompile=(sh)=>{
      sh.uniforms.uWake={value:W.pts}; sh.uniforms.uWakeT={value:W.T}; sh.uniforms.uFlow={value:W.flow};
      sh.vertexShader=sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWPos;
uniform vec4 uWake[${WAKE_N}];
uniform vec3 uWakeT;
uniform vec4 uFlow;
// the wake where p is: xy the slope of the surface (its height's gradient), z how churned it is
vec3 wakeField(vec2 p){
  vec3 o=vec3(0.0);
  if(distance(p, uWakeT.yz)>70.0) return o;
  for(int i=0;i<${WAKE_N};i++){
    vec4 w=uWake[i]; float age=uWakeT.x-w.z;
    if(w.w<=0.0 || age<0.0 || age>7.0) continue;
    vec2 d=p-w.xy; float r=length(d)+1e-4;
    float c=0.30+2.5*w.w, R=0.85+c*age, wd=0.40+0.20*age, u=r-R;
    if(abs(u)<3.0*wd){
      float A=w.w*0.16*exp(-age*0.42)/(1.0+0.07*R), env=exp(-u*u/(wd*wd)), k=5.6, sk=sin(k*u);
      o.xy+=A*env*(k*cos(k*u)-2.0*u/(wd*wd)*sk)*d/r;
      // (and the young crests break white along the arms of the V, dying off as the rings spread)
      float cr=max(sk, 0.0); o.z+=w.w*0.30*exp(-age*0.9)*env*cr*cr*cr; }
    float rr=0.35+age*0.55;
    o.z+=w.w*0.7*exp(-age*2.1)*exp(-r*r/(rr*rr));
  }
  o.z=clamp(o.z, 0.0, 1.0);
  o.xy+=o.z*0.35*vec2(sin(p.x*6.3+p.y*2.1+uWakeT.x*5.0), cos(p.y*5.7-p.x*1.9-uWakeT.x*4.3));
  return o; }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
vec3 wk=wakeField(vWPos.xz);
diffuseColor.rgb=mix(diffuseColor.rgb, vec3(0.62, 0.70, 0.72), wk.z*0.45);`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor, 0.55, wk.z);")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor, 0.05, wk.z);")
        .replace("#include <normal_fragment_maps>", `{ vec3 nA=texture2D(normalMap, vUv+uFlow.xy).xyz*2.0-1.0, nB=texture2D(normalMap, vUv*0.29+uFlow.zw).xyz*2.0-1.0;
  vec3 mapN=normalize(vec3(nA.xy+nB.xy, nA.z*nB.z)); mapN.xy*=normalScale;
  normal=perturbNormal2Arb(-vViewPosition, normal, mapN, faceDirection); }
normal=normalize(normal+(viewMatrix*vec4(-wk.x, 0.0, -wk.y, 0.0)).xyz);`); };
  m.customProgramCacheKey=()=>"water";
  const mesh=new T.Mesh(g, m); mesh.rotation.x=-Math.PI/2; mesh.position.set((o.x0+o.x1)/2, o.y, (o.z0+o.z1)/2); mesh.receiveShadow=true; mesh.name="water";
  scene.add(mesh); WATER.sheets.push(mesh);
  WATER_Y=o.y;
  return mesh;
}
// the ripples drift two ways with the wind; the wake's clock
onFrame((dt)=>{ if(!WATER.sheets.length) return; WATER.t+=dt;
  const W=WATER.wake, f=W.flow; const k=0.6+Wind.gust*0.8;
  f.x=(f.x+dt*0.11*k)%1; f.y=(f.y+dt*0.06*k)%1; f.z=(f.z-dt*0.012*k+1)%1; f.w=(f.w+dt*0.019*k)%1;
  W.T.x=WATER.t; if(W.T.y>1e5){ W.T.y=camera.position.x; W.T.z=camera.position.z; } });
