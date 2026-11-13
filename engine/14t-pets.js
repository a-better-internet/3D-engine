"use strict";
/* ENGINE · 14t-pets.js
   pets: dogs (14b's lab in any coat and size) and cats, their gaits, how
   they steer, and what they do: follow you, wander and sniff, come to
   greet you, lie in the shade, chase one another, and play fetch with a
   person of a crowd or with you
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   14t · PETS
   A pet is {g, B, head, tail, legs, x, z, yaw, sp (speed), ph (stride
   phase), t, hx/hy (head pitch and turn), wf/wa (tail wag rate and size),
   gait}. poseDog sets its bones for a gait ("stand", "trot", "run", "bow"
   (a play bow), "lie", "sit") every frame; petSteer turns it toward a point
   no faster than a dog turns, slows it into a sharp turn and to a stop.

     D = makeDog("#d8b070", 1.0, x, z)        a yellow lab; scale 0.55 a little one
     C = makeCat("#7a6a5a", x, z)              a tabby
     PETS.add(D, {mode:"follow"})              walks at your heel, sits when you stop
     PETS.add(D, {mode:"wander", box:{x0,x1,z0,z1}, greet:11})   noses about; comes to see you within 11 m
     PETS.add(D, {mode:"lie"})                 flat out, the head up now and then
     PETS.add(D, {mode:"chase", with:D2, box})  two that chase each other round and square up
     PETS.add(D, {mode:"fetch", thrower:p})    p a crowd person with job:"throw": he throws, she fetches
   A pet with `box` keeps inside it; any pet steps round colliders (14b's
   _hitAt). PETS.update runs from the loop. A sound is AUDIO.blip("bark"|"yip"
   |"meow", x, z) if the audio has it.
   ---------------------------------------------------------------------- */
function makeDog(coat, s, x, z){
  const D=buildDog(coat); D.g.scale.setScalar(s||1); D.s=s||1; D.x=x||0; D.z=z||0; D.yaw=Math.random()*6.28; D.sp=0; D.ph=Math.random(); D.t=Math.random()*10;
  D.hx=0; D.hy=0; D.wf=6; D.wa=0.35; D.gait="stand"; D.kind="dog"; D.H=0.44; D.y0=groundY(D.x, D.z); return D; }
/* ---- a cat: the dog's seven bones, a cat's shape on them ------------------ */
function buildCat(coat, belly){
  const B=[], parts=[];
  const bone=(par,x,y,z)=>{ const b=new T.Bone(); b.position.set(x,y,z); if(par>=0) B[par].add(b); B.push(b); return B.length-1; };
  const root=bone(-1,0,0.24,0), head=bone(root,0,0.07,0.17), tail=bone(root,0,0.04,-0.19);
  const legs=[bone(root,-0.045,-0.02,0.12), bone(root,0.045,-0.02,0.12), bone(root,-0.05,-0.01,-0.13), bone(root,0.05,-0.01,-0.13)];
  const add=(geo,m,c,b)=>parts.push({geo:geo, matrix:m, color:c, bone:b});
  const bl=belly||coat;
  add(new T.SphereGeometry(0.5,12,8), _pm(0,0.25,0, 0.15,0.15,0.40), coat, root);
  add(new T.SphereGeometry(0.5,10,8), _pm(0,0.225,0.01, 0.13,0.10,0.34), bl, root);
  add(new T.SphereGeometry(0.068,12,9), _pm(0,0.335,0.21, 1,0.92,1), coat, head);
  add(new T.SphereGeometry(0.034,8,6), _pm(0,0.315,0.265, 1.1,0.8,0.9), bl, head);
  add(new T.SphereGeometry(0.009,6,5), _pm(0,0.325,0.298), "#c87a7a", head);
  for(const sd of [-1,1]){
    add(new T.ConeGeometry(0.026,0.055,4), _pm(sd*0.036,0.392,0.205), coat, head);
    add(new T.SphereGeometry(0.011,6,5), _pm(sd*0.026,0.348,0.266), "#b8c43a", head);
    add(new T.SphereGeometry(0.0055,5,4), _pm(sd*0.026,0.348,0.276), "#141210", head);
  }
  add(new T.CylinderGeometry(0.014,0.010,0.30,6), _pm(0,0.36,-0.30, 1,1,1, -0.55), coat, tail);
  legs.forEach((b,k)=>{ const x=(k%2?0.045:-0.045), z=k<2?0.12:-0.13;
    add(new T.CylinderGeometry(0.020,0.015,0.22,7), _pm(x,0.12,z), coat, b);
    add(new T.SphereGeometry(0.018,6,5), _pm(x,0.014,z+0.01, 1,0.7,1.3), bl, b); });
  const mesh=skinned(parts, B);
  const g=new T.Group(); g.add(mesh); scene.add(g);
  return {g:g, B:B, head:head, tail:tail, legs:legs};
}
function makeCat(coat, x, z, belly){
  const C=buildCat(coat, belly); C.s=1; C.x=x||0; C.z=z||0; C.yaw=Math.random()*6.28; C.sp=0; C.ph=Math.random(); C.t=Math.random()*10;
  C.hx=0; C.hy=0; C.wf=2; C.wa=0.25; C.gait="stand"; C.kind="cat"; C.H=0.24; C.y0=groundY(C.x, C.z); return C; }

/* ---- gaits ------------------------------------------------------------------ */
function poseDog(D, gait){
  const Bn=D.B, root=Bn[0], a=D.ph*Math.PI*2, H=D.H||0.44, k0=H/0.44;
  root.position.set(0, H, 0); root.rotation.set(0, 0, 0);
  D.legs.forEach(b=>{ Bn[b].rotation.set(0, 0, 0); Bn[b].scale.set(1, 1, 1); });
  if(gait==="run"){ D.legs.forEach((b,k)=>{ Bn[b].rotation.x=Math.sin(a+(k<2 ? 0 : 2.5)+(k%2)*0.4)*0.9; });
    root.position.y=H+Math.abs(Math.sin(a))*0.05*k0; root.rotation.x=Math.sin(a+0.7)*0.09; }
  else if(gait==="trot"){ D.legs.forEach((b,k)=>{ Bn[b].rotation.x=Math.sin(a+(k===0||k===3 ? 0 : Math.PI))*0.5; }); root.position.y=H+Math.abs(Math.sin(a*2))*0.012*k0; }
  else if(gait==="bow"){ root.rotation.x=0.26; root.position.y=H*0.86; Bn[D.legs[0]].rotation.x=Bn[D.legs[1]].rotation.x=-0.55; Bn[D.legs[2]].rotation.x=Bn[D.legs[3]].rotation.x=-0.2; }
  else if(gait==="sit"){ root.rotation.x=-0.55; root.position.y=H*0.80; Bn[D.legs[0]].rotation.x=Bn[D.legs[1]].rotation.x=0.50;
    Bn[D.legs[2]].rotation.x=Bn[D.legs[3]].rotation.x=-0.95; Bn[D.legs[2]].scale.y=Bn[D.legs[3]].scale.y=0.7; }
  else if(gait==="lie"){ root.position.y=H*0.41;
    D.legs.forEach((b,k)=>{ Bn[b].rotation.set(k<2 ? -1.38 : -1.42, 0, k<2 ? 0 : (k===2 ? -0.22 : 0.22)); Bn[b].scale.set(1, k<2 ? 1 : 0.55, k<2 ? 1 : 1.25); }); }
  Bn[D.head].rotation.set(D.hx+(gait==="sit" ? 0.45 : 0), D.hy, 0);
  if(D.kind==="cat") Bn[D.tail].rotation.set((gait==="lie" ? -0.9 : gait==="sit" ? -0.2 : 0.15)+Math.sin(D.t*0.9)*0.08, Math.sin(D.t*D.wf)*D.wa, 0);
  else Bn[D.tail].rotation.set(gait==="lie" ? -0.62 : gait==="sit" ? -0.3 : 0.25, Math.sin(D.t*D.wf)*D.wa, 0);
  D.g.position.set(D.x, D.y!==undefined ? D.y : surfaceY(D.x, D.z, (D.y0||0)+0.4), D.z); D.g.rotation.y=D.yaw;
}
const _petAng=(a)=>{ while(a>Math.PI) a-=Math.PI*2; while(a<-Math.PI) a+=Math.PI*2; return a; };
// steer for a point; kept inside box if given and out of anything solid. Returns how far it still is
function petSteer(D, tx, tz, vmax, dt, stopAt, box){
  const dx=tx-D.x, dz=tz-D.z, d=Math.hypot(dx,dz);
  const dy=_petAng((d>0.05 ? Math.atan2(dx,dz) : D.yaw)-D.yaw); D.yaw+=clamp(dy, -dt*5.0, dt*5.0);
  const v=Math.max(0, Math.min(vmax, (d-(stopAt||0))*2.4))*Math.max(0, Math.cos(dy));
  D.sp+=(v-D.sp)*Math.min(1, dt*3.2);
  let nx=D.x+Math.sin(D.yaw)*D.sp*dt, nz=D.z+Math.cos(D.yaw)*D.sp*dt;
  if(box){ nx=clamp(nx, box.x0, box.x1); nz=clamp(nz, box.z0, box.z1); }
  const y=D.y0||0;
  if(!_hitAt(nx, nz, y, 0.22*D.s, null)){ D.x=nx; D.z=nz; }
  else if(!_hitAt(nx, D.z, y, 0.22*D.s, null)) D.x=nx;
  else if(!_hitAt(D.x, nz, y, 0.22*D.s, null)) D.z=nz;
  else D.sp*=0.5;
  D.y0=surfaceY(D.x, D.z, y+0.4);
  D.ph=(D.ph+dt*D.sp/(D.sp>3.2 ? 1.9 : 0.85)*(1/D.s)*(D.kind==="cat" ? 1.6 : 1))%1;
  return d; }
const petGait=(D)=>D.sp>3.2 ? "run" : D.sp>0.15 ? "trot" : "stand";
function petLook(D, x, z, up){ D.hy=clamp(_petAng(Math.atan2(x-D.x, z-D.z)-D.yaw), -0.9, 0.9); D.hx=-(up||0); }

/* ---- what they do ------------------------------------------------------------- */
const PETS=(function(){
  const L=[];
  const bark=(D, k)=>{ if(typeof AUDIO!=="undefined" && AUDIO.blip) AUDIO.blip(k||(D.kind==="cat" ? "meow" : D.s<0.7 ? "yip" : "bark"), D.x, D.z); };
  const you=()=>({x:player.pos.x, z:player.pos.z, y:player.feetY, away:driving || droneMode});
  const B={
    follow(e, dt){ const D=e.D, P=you();
      if(P.away){ petSteer(D, D.x, D.z, 0, dt); D.gait="sit"; return; }
      // at heel, on your left and a little behind, whichever side is clear
      const a=player.yaw, sx=-Math.cos(a), sz=Math.sin(a), bx=Math.sin(a), bz=Math.cos(a);
      let tx=P.x+sx*0.9+bx*0.6, tz=P.z+sz*0.9+bz*0.6;
      if(_hitAt(tx, tz, P.y, 0.25, null)){ tx=P.x-sx*0.9+bx*0.6; tz=P.z-sz*0.9+bz*0.6; }
      const far=Math.hypot(P.x-D.x, P.z-D.z);
      if(far>40){ D.x=tx; D.z=tz; D.y0=P.y; }                                  // (left behind: it catches up out of sight)
      const d=petSteer(D, tx, tz, far>6 ? 7.5 : player.moving ? 4.2 : 2.0, dt, 0.15);
      e.still=(d<0.6 && !player.moving) ? (e.still||0)+dt : 0;
      D.gait=e.still>1.2 ? "sit" : petGait(D);
      if(D.gait==="sit"){ D.yaw+=_petAng(player.yaw+Math.PI-D.yaw)*Math.min(1, dt*2); petLook(D, P.x, P.z, 0.35); D.wf=8; D.wa=0.35; }
      else { D.hx=0; D.hy=0; D.wf=7; D.wa=0.3; }
      if(e.still>1.2 && Math.random()<dt*0.02) bark(D); },
    wander(e, dt){ const D=e.D, P=you(), box=e.box, pd=Math.hypot(P.x-D.x, P.z-D.z);
      e.cool=(e.cool||0)-dt; e.t=(e.t||0)-dt;
      if(e.st!=="greet" && e.greet && e.cool<=0 && !P.away && pd<e.greet && (!box || (P.x>box.x0 && P.x<box.x1 && P.z>box.z0 && P.z<box.z1))){ e.st="greet"; e.t=10; bark(D); }
      if(e.st==="greet"){ const d=petSteer(D, P.x, P.z, D.kind==="cat" ? 1.2 : 2.8, dt, 0.85, box); D.gait=petGait(D); D.wf=16; D.wa=0.6;
        if(d<1.3){ petLook(D, P.x, P.z, 0.55); if(Math.random()<dt*0.3) bark(D); } else { D.hx=0; D.hy=0; }
        if(e.t<=0 || pd>(e.greet||11)+2){ e.st="go"; e.cool=30; e.tgt=null; } return; }
      const pickT=()=>{ const b=box||{x0:e.hx0-8, x1:e.hx0+8, z0:e.hz0-8, z1:e.hz0+8}; return [b.x0+Math.random()*(b.x1-b.x0), b.z0+Math.random()*(b.z1-b.z0)]; };
      if(e.hx0===undefined){ e.hx0=D.x; e.hz0=D.z; }
      if(!e.tgt) e.tgt=pickT();
      if(e.st!=="sniff"){ const d=petSteer(D, e.tgt[0], e.tgt[1], D.kind==="cat" ? 0.7 : 1.0, dt, 0.05, box); D.gait=petGait(D); D.hx=0.25; D.hy=Math.sin(D.t*1.3)*0.25; D.wf=6; D.wa=0.25;
        if(d<0.3){ e.st="sniff"; e.t=2+Math.random()*4; } }
      else { petSteer(D, D.x, D.z, 0, dt); D.gait=D.kind==="cat" && e.t>2.5 ? "sit" : "stand"; D.hx=D.kind==="cat" ? 0.1 : 0.75; D.hy=Math.sin(D.t*2.1)*0.3; D.wf=5; D.wa=0.2;
        if(e.t<=0){ e.st="go"; e.tgt=pickT(); } } },
    lie(e, dt){ const D=e.D, t=D.t, rest=smoothstep(0.55, 0.85, _noise1(t*0.06+2.2)); D.sp=0;
      D.hx=0.38*rest; D.hy=_noise1(t*0.15+0.4)*0.8*(1-rest*0.6); D.wf=1.6; D.wa=0.18; D.gait="lie"; },
    sit(e, dt){ const D=e.D; D.sp=0; D.gait="sit"; D.hx=0; D.hy=_noise1(D.t*0.2+1.1)*0.7; D.wf=3; D.wa=0.2; },
    chase(e, dt){ const A=e.D, Bd=e.with, box=e.box; if(!Bd) return;
      e.lead=e.lead||0; e.ct=(e.ct||0)+dt; e.pause=e.pause||0;
      const Ld=e.lead ? Bd : A, Fo=e.lead ? A : Bd;
      if(e.pause>0){ e.pause-=dt; for(const D of [Ld, Fo]){ const O=D===Ld ? Fo : Ld; petSteer(D, D.x, D.z, 0, dt); D.yaw+=clamp(_petAng(Math.atan2(O.x-D.x, O.z-D.z)-D.yaw), -dt*4, dt*4); D.wf=14; D.wa=0.5; D.hx=-0.15; D.hy=0; }
        Ld.gait=e.pause>0.6 ? "bow" : "stand"; Fo.gait="stand"; if(e.pause<=0) bark(Fo); return; }
      if(!e.tgt || Math.hypot(Ld.x-e.tgt[0], Ld.z-e.tgt[1])<1.6) e.tgt=[box.x0+Math.random()*(box.x1-box.x0), box.z0+Math.random()*(box.z1-box.z0)];
      petSteer(Ld, e.tgt[0], e.tgt[1], 5.8, dt, 0, box); petSteer(Fo, Ld.x-Math.sin(Ld.yaw)*1.1, Ld.z-Math.cos(Ld.yaw)*1.1, 6.4, dt, 0, box);
      for(const D of [Ld, Fo]){ D.hx=0; D.hy=0; D.wf=7; D.wa=0.3; D.gait=petGait(D); }
      if(e.ct>8+Math.random()*30){ e.ct=0; if(Math.random()<0.45) e.pause=2.8; else e.lead=1-e.lead; } },
    fetch(e, dt){ fetchStep(e, dt); },
  };
  /* fetch: he holds it a moment, she waits by him looking up, tail going; he winds up and throws it, and she is off
     before it leaves his hand; she runs it down, carries it back and drops it at his feet; he bends for it; again.
     e.thrower: a crowd person with job:"throw" (14q poses the throw from its throwK and bendK). e.box keeps the ball in. */
  const _bw=new T.Vector3();
  function fetchStep(e, dt){
    const D=e.D, p=e.thrower; if(!p || !p.P.g.visible){ D.gait="stand"; return; }
    if(!e.ball){ e.ball=new T.Mesh(new T.SphereGeometry(0.033, 12, 8), new T.MeshStandardMaterial({color:0xd8f040, roughness:0.85}));
      e.ball.castShadow=true; scene.add(e.ball); e.BV=new T.Vector3(); e.F={st:"hold", t:1.5, k:0}; e.aim=p.yaw||0; toHand(e); }
    const F=e.F, OX=p.x, OZ=p.z, ready=[OX+Math.sin(p.yaw||0)*1.0+Math.cos(p.yaw||0)*0.6, OZ+Math.cos(p.yaw||0)*1.0-Math.sin(p.yaw||0)*0.6];
    F.t-=dt; p.throwK=undefined; p.bendK=undefined;
    stepBall(e, dt);
    if(F.st==="hold"){ petSteer(D, ready[0], ready[1], 2.2, dt, 0.05, e.box); D.gait=petGait(D); if(D.sp<0.3) D.yaw+=_petAng(Math.atan2(OX-D.x, OZ-D.z)-D.yaw)*Math.min(1, dt*3);
      petLook(D, OX, OZ, 0.35); D.wf=11; D.wa=0.5;
      if(F.t<0 && Math.random()<dt*0.12) bark(D);
      if(F.t<=0){ F.st="throw"; F.k=0; } }
    else if(F.st==="throw"){ F.k+=dt/1.1; p.throwK=F.k;
      if(F.k>0.42) petSteer(D, OX+Math.sin(e.aim)*8, OZ+Math.cos(e.aim)*8, 7.5, dt, 0, e.box); else petLook(D, OX, OZ, 0.4);
      D.gait=petGait(D);
      if(F.k>=0.56 && !e.free){ const dist=(e.range||9)+Math.random()*8;
        let tx=OX+Math.sin(e.aim)*dist, tz=OZ+Math.cos(e.aim)*dist;
        if(e.box){ tx=clamp(tx, e.box.x0+0.8, e.box.x1-0.8); tz=clamp(tz, e.box.z0+0.8, e.box.z1-0.8); }
        const T2=1.05+dist*0.025; e.ball.getWorldPosition(_bw); const ty=groundY(tx, tz)+0.033;
        letGo(e, V3((tx-_bw.x)/T2, 9.8*T2/2+(ty-_bw.y)/T2, (tz-_bw.z)/T2)); F.st="chase"; } }
    else if(F.st==="chase"){ const b=e.ball.position, d=petSteer(D, b.x, b.z, 7.6, dt, 0, e.box); D.gait=petGait(D); D.wf=9; D.wa=0.3;
      if(F.k<1.2){ F.k+=dt/1.1; p.throwK=Math.min(1, F.k); }
      if(d<0.5 && b.y<groundY(b.x, b.z)+0.12 && e.BV.length()<3.5){ D.B[D.head].add(e.ball); e.ball.position.set(0, -0.012, 0.215); e.free=false; F.st="carry"; } }
    else if(F.st==="carry"){ const d=petSteer(D, OX+Math.sin(p.yaw||0)*0.95, OZ+Math.cos(p.yaw||0)*0.95, 4.6, dt, 0.05, e.box); D.gait=petGait(D); D.hx=0.05; D.hy=0; D.wf=12; D.wa=0.45;
      if(d<0.25){ letGo(e, V3(0, 0, 0)); F.st="drop"; F.t=0.7; } }
    else if(F.st==="drop"){ if(F.t<0.3) petSteer(D, ready[0], ready[1], 1.4, dt, 0.05, e.box); D.gait=petGait(D); petLook(D, OX, OZ, 0.3); D.wf=12; D.wa=0.55;
      if(F.t<=0){ F.st="pick"; F.k=0; } }
    else if(F.st==="pick"){ F.k+=dt/1.3; p.bendK=Math.sin(Math.min(1, F.k)*Math.PI); petSteer(D, ready[0], ready[1], 1.6, dt, 0.05, e.box); D.gait=petGait(D); petLook(D, OX, OZ, 0.3);
      if(F.k>0.5 && e.free) toHand(e);
      if(F.k>=1){ F.st="hold"; F.t=0.8+Math.random()*2.4; e.aim=(p.yaw||0)+(Math.random()-0.5)*0.9; } }
  }
  function toHand(e){ const Pp=e.thrower.P; Pp.B[Pp.j.elR].add(e.ball); e.ball.position.set(0, -0.31*Pp.h, 0.03); e.free=false; }
  function letGo(e, v){ e.ball.getWorldPosition(_bw); scene.add(e.ball); e.ball.position.copy(_bw); e.BV.copy(v); e.free=true; }
  function stepBall(e, dt){ if(!e.free) return; const b=e.ball.position, BV=e.BV, X=e.box;
    BV.y-=9.8*dt; b.addScaledVector(BV, dt);
    if(X){ if(b.x<X.x0-0.4 || b.x>X.x1+0.4){ b.x=clamp(b.x, X.x0-0.4, X.x1+0.4); BV.x*=-0.35; }
           if(b.z<X.z0-0.4 || b.z>X.z1+0.4){ b.z=clamp(b.z, X.z0-0.4, X.z1+0.4); BV.z*=-0.35; } }
    const g=groundY(b.x, b.z)+0.033;
    if(b.y<g){ b.y=g; if(BV.y<-1.0){ BV.y*=-0.42; BV.x*=0.72; BV.z*=0.72; } else { BV.y=0; const f=Math.max(0, 1-dt*2.6); BV.x*=f; BV.z*=f; } } }

  function add(D, o){ const e=Object.assign({D:D, mode:"wander"}, o||{}); L.push(e); if(e.with) e.with._partnered=true; return e; }
  function update(dt){
    const c=camera.position;
    for(const e of L){ const D=e.D;
      // only worked near the camera (the follower always)
      const near=e.mode==="follow" || Math.hypot(D.x-c.x, D.z-c.z)<(e.reach||160);
      D.g.visible=near && (!e.dayOnly || DayNight.state.dark<0.6);
      if(e.with) e.with.g.visible=D.g.visible;
      if(!D.g.visible) continue;
      D.t+=dt;
      (B[e.mode]||B.wander)(e, dt);
      poseDog(D, D.gait);
      if(e.with){ e.with.t+=dt; poseDog(e.with, e.with.gait); } }
  }
  return {add:add, update:update, list:L, behaviours:B};
})();
