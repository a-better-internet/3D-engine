"use strict";
/* ENGINE · 16d-glass.js
   breakable glass: every pane baked into the "glass" or "tint" bucket can be
   cracked and shattered, and mended again
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   16d · GLASS
   01's GLASS_PANES is every pane baked (a window, a door's light, a case):
   its middle, normal, half sizes and its run of vertices in the merged
   mesh. A hit cracks it (a decal on your side of it, bigger as they join);
   a few more (GLASS.hit's damage against its hp, 3) and it goes in a
   shower of pieces, its run of vertices pulled to a point so the opening is
   open; GLASS.mend() puts every pane back.
     GLASS.ray(origin, dir, tmax)   the first pane along a ray: {P, t} or null
     GLASS.hit(P, origin, dir, t, damage)
     GLASS.shatter(P, dir)
     GLASS.blast(x, y, z, r)        every pane within r goes
     GLASS.mend()
   Its decals and shards are built at load (so the warm-up compiles them)
   and updated by the loop.
   ---------------------------------------------------------------------- */
const GLASS=(function(){
  let _gGrid=null; const BROKEN=[], _gp=new T.Vector3(), _gq=new T.Vector3();
  function glassGrid(){ if(_gGrid) return _gGrid; _gGrid=new Map();
    for(const P of GLASS_PANES){ const r=Math.max(P.hu, P.hv);
      for(let gx=Math.floor((P.c.x-r)/8); gx<=Math.floor((P.c.x+r)/8); gx++) for(let gz=Math.floor((P.c.z-r)/8); gz<=Math.floor((P.c.z+r)/8); gz++){
        const k=gx+":"+gz; let L=_gGrid.get(k); if(!L) _gGrid.set(k, L=[]); L.push(P); } }
    return _gGrid; }
  function ray(o, d, tmax){
    const Gd=glassGrid(); let best=null, bt=tmax; const seen=new Set();
    for(let t=0; t<=bt+8; t+=4){ const L=Gd.get(Math.floor((o.x+d.x*t)/8)+":"+Math.floor((o.z+d.z*t)/8)); if(!L) continue;
      for(const P of L){ if(seen.has(P) || P.broke) continue; seen.add(P);
        const dn=d.dot(P.n); if(Math.abs(dn)<1e-4) continue;
        const tt=_gp.copy(P.c).sub(o).dot(P.n)/dn; if(tt<0.05 || tt>=bt) continue;
        _gp.copy(o).addScaledVector(d, tt).sub(P.c);
        if(Math.abs(_gp.dot(P.u))>P.hu || Math.abs(_gp.dot(P.v))>P.hv) continue;
        bt=tt; best=P; } }
    return best ? {P:best, t:bt} : null;
  }
  const FX={cracks:[], ci:0, shards:[], si:0, mat:null};
  function crackTex(seed){
    return signTex(256, 256, (c, W, H)=>{ const r=_trng(seed); c.clearRect(0, 0, W, H); c.strokeStyle="rgba(236,246,250,0.9)"; c.lineCap="round";
      const cx=W/2, cy=H/2, n=9+((r()*6)|0), ang=[];
      for(let k=0;k<n;k++) ang.push(k/n*Math.PI*2+(r()-0.5)*0.5);
      for(const a0 of ang){ let x=cx, y=cy, a=a0; c.lineWidth=1.6; c.beginPath(); c.moveTo(x, y);
        const L=W*(0.30+r()*0.18); for(let s=0;s<L;s+=8){ a+=(r()-0.5)*0.35; x+=Math.cos(a)*8; y+=Math.sin(a)*8; c.lineTo(x, y); } c.stroke(); }
      c.lineWidth=1.1;
      for(const R of [W*0.07, W*0.16, W*0.27]) for(let k=0;k<n;k++){ if(r()<0.35) continue; const a=ang[k], b=ang[(k+1)%n]+(k+1===n ? Math.PI*2 : 0), rr=R*(0.85+r()*0.3);
        c.beginPath(); c.moveTo(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); c.lineTo(cx+Math.cos((a+b)/2)*rr*1.06, cy+Math.sin((a+b)/2)*rr*1.06); c.lineTo(cx+Math.cos(b)*rr, cy+Math.sin(b)*rr); c.stroke(); }
      c.fillStyle="rgba(240,248,252,0.95)"; c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI*2); c.fill(); });
  }
  (function build(){
    const texs=[crackTex(11), crackTex(29), crackTex(47)];
    const mats=texs.map(t=>new T.MeshStandardMaterial({map:t, transparent:true, depthWrite:false, side:T.DoubleSide, roughness:0.25, metalness:0.2,
      polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2}));
    for(let k=0;k<48;k++){ const m=new T.Mesh(new T.PlaneGeometry(1, 1), mats[k%3]); m.visible=false; scene.add(m); FX.cracks.push(m); }
    FX.mat=new T.MeshStandardMaterial({color:0xd6ecf2, transparent:true, opacity:0.6, roughness:0.05, metalness:0.55, side:T.DoubleSide});
    for(let k=0;k<140;k++){ const g=new T.BufferGeometry(), a=0.03+Math.random()*0.07, b=0.02+Math.random()*0.06;
      g.setAttribute("position", new T.BufferAttribute(new Float32Array([0,0,0, a,0.004,b*0.3, b*0.4,-0.003,a]), 3)); g.computeVertexNormals();
      const m=new T.Mesh(g, FX.mat); m.visible=false; scene.add(m); FX.shards.push({m:m, vx:0, vy:0, vz:0, w:new T.Vector3(), t:0, rest:false}); }
  })();
  const snd=(k, x, z, v)=>{ if(typeof AUDIO!=="undefined" && AUDIO.blip) AUDIO.blip(k, x, z, v); };
  function hit(P, o, d, t, dmg){
    _gp.copy(o).addScaledVector(d, t);
    P.hp-=dmg===undefined ? 1 : dmg;
    if(P.hp<=0){ shatter(P, d); return true; }
    snd("tink", _gp.x, _gp.z);
    const side=d.dot(P.n)<0 ? 1 : -1, m=FX.cracks[FX.ci++%FX.cracks.length];
    if(m.userData.pane){ const L=m.userData.pane.cracks, j=L.indexOf(m); if(j>=0) L.splice(j, 1); }
    const sz=clamp(Math.min(P.hu, P.hv)*1.5, 0.22, 0.85)*(1+0.3*P.cracks.length);
    m.position.copy(_gp).addScaledVector(P.n, side*0.007); _gq.copy(m.position).addScaledVector(P.n, side); m.lookAt(_gq);
    m.rotateZ(Math.random()*6.28); m.scale.setScalar(sz); m.visible=true; m.userData.pane=P; P.cracks.push(m);
    for(let k=0;k<3;k++) shard(_gp.x, _gp.y, _gp.z, d.x*1.2+(Math.random()-0.5), 0.6+Math.random(), d.z*1.2+(Math.random()-0.5));
    return false;
  }
  function shard(x, y, z, vx, vy, vz){
    const s=FX.shards[FX.si++%FX.shards.length]; s.m.position.set(x, y, z); s.vx=vx; s.vy=vy; s.vz=vz;
    s.w.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20); s.t=0; s.rest=false; s.m.visible=true;
  }
  function shatter(P, d){
    if(P.broke) return;
    P.broke=true; for(const m of P.cracks){ m.visible=false; m.userData.pane=null; } P.cracks=[];
    const A=P.mesh.geometry.attributes.position;
    if(!P.orig){ P.orig=new Float32Array(P.nv*3); for(let i=0;i<P.nv;i++){ P.orig[i*3]=A.getX(P.v0+i); P.orig[i*3+1]=A.getY(P.v0+i); P.orig[i*3+2]=A.getZ(P.v0+i); } }
    const x0=A.getX(P.v0), y0=A.getY(P.v0), z0=A.getZ(P.v0); for(let i=0;i<P.nv;i++) A.setXYZ(P.v0+i, x0, y0, z0); A.needsUpdate=true;
    BROKEN.push(P);
    const dd=d||P.n;
    const n=clamp(Math.round(P.hu*P.hv*70), 10, 40);
    for(let k=0;k<n;k++){ const a=(Math.random()*2-1)*P.hu, b=(Math.random()*2-1)*P.hv;
      _gp.copy(P.c).addScaledVector(P.u, a).addScaledVector(P.v, b); const f=Math.random()<0.7 ? 1.5+Math.random()*2.5 : 0.2;
      shard(_gp.x, _gp.y, _gp.z, dd.x*f+(Math.random()-0.5)*0.8, dd.y*f+Math.random()*0.8, dd.z*f+(Math.random()-0.5)*0.8); }
    snd("shatter", P.c.x, P.c.z, Math.min(1, P.hu*P.hv*2.5+0.35));
  }
  function blast(x, y, z, R){
    for(const P of GLASS_PANES){ if(P.broke) continue; const dx=P.c.x-x, dy=P.c.y-y, dz=P.c.z-z, q=Math.hypot(dx, dy, dz);
      if(q<R) shatter(P, _gq.set(dx, dy, dz).normalize().clone()); }
  }
  function update(dt){
    for(const s of FX.shards){ if(!s.m.visible) continue; s.t+=dt;
      if(!s.rest){ s.vy-=9.8*dt; s.m.position.x+=s.vx*dt; s.m.position.y+=s.vy*dt; s.m.position.z+=s.vz*dt;
        s.m.rotation.x+=s.w.x*dt; s.m.rotation.y+=s.w.y*dt; s.m.rotation.z+=s.w.z*dt;
        const g=surfaceY(s.m.position.x, s.m.position.z, s.m.position.y+0.3);
        if(s.m.position.y<=g+0.004){ s.m.position.y=g+0.004; if(s.vy<-2 && Math.random()<0.5){ s.vy*=-0.2; s.vx*=0.4; s.vz*=0.4; } else { s.rest=true; s.m.rotation.x=0; s.m.rotation.z=0; } } }
      if(s.t>40) s.m.visible=false; }
  }
  function mend(){
    for(const P of BROKEN){ const A=P.mesh.geometry.attributes.position; for(let i=0;i<P.nv;i++) A.setXYZ(P.v0+i, P.orig[i*3], P.orig[i*3+1], P.orig[i*3+2]); A.needsUpdate=true; P.broke=false; }
    BROKEN.length=0;
    for(const P of GLASS_PANES){ P.hp=3; P.cracks=[]; }
    for(const m of FX.cracks){ m.visible=false; m.userData.pane=null; }
    for(const s of FX.shards) s.m.visible=false;
  }
  return {ray:ray, hit:hit, shatter:shatter, blast:blast, update:update, mend:mend, broken:BROKEN};
})();
