"use strict";
/* ENGINE · 14b-people.js
   people: one skinned mesh each on eleven bones, built from plain shapes;
   their poses (walk, sit, stand, phone, read, smoke) and the idle that keeps
   them alive; things held in the hand; a dog on the same plan; and how a
   walker keeps clear of everything
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   14b · PEOPLE
   Each person is one SkinnedMesh — one draw — rigidly skinned to eleven
   bones: hips (root), spine, head, shoulders and elbows, hips and knees. The
   parts are plain shapes (tapered cylinders, ellipsoids, a box for each
   shoe) merged with a bone index per vertex; poses are bone rotations. A
   walk is a stride cycle (thigh swing, a knee that folds on the way
   forward, the opposite arm, a little bob); sitting folds the hips and knees
   square.

   buildPerson(o) — o is the look:
     h        height factor (1 ≈ 1.78 m; a child 0.6)    female   build
     skin hair shirt pants shoes eyes   colours (SKINS, HAIRS, SHIRTS, PANTS)
     shorts long (sleeves) cap capFront beanie hoodie hoodUp pocket beard
     shades belly vest
     mat      its own material (default PEOPLE_MAT, which every living
              person shares: hide them all at once through it)
     extra(add, Y, h, joints, sw)   more parts on the same bones
   It returns {g, mesh, B (bones), j (joint indices), HIP, h, female}; set
   P.seed (0..6.28) so its idle runs on its own clock. Pose it every frame
   with poseP(P, mode, phase, time): mode "walk" (phase 0..1 through the
   stride), "sit", "stand", "phone", "read", "smoke". poseP sets the root's
   whole position every frame: anything that adds to a bone's position must
   start from there, or it adds up and the body walks off its feet. A job
   that sets its own bones does so after poseP, so it wins.

   For people out of doors use 14q's crowds; PEOPLE is for any walker of a
   world's own (14b's _stepWalker steers one along a path), and everything
   in it is kept clear of by every other walker.
   ---------------------------------------------------------------------- */
const PEOPLE=[];
const PEOPLE_MAT=new T.MeshStandardMaterial({vertexColors:true, roughness:0.84, skinning:true});
// a merged geometry from parts {geo, matrix, color, bone}, each vertex bound to one bone
function rigidSkin(parts){
  let n=0; for(const p of parts) n+=p.geo.attributes.position.count;
  const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3),
        SI=new Uint16Array(n*4), SW=new Float32Array(n*4), idx=[];
  let o=0;
  const v=new T.Vector3(), nm=new T.Matrix3();
  for(const p of parts){
    const g=p.geo.index ? p.geo : p.geo, pos=g.attributes.position, nor=g.attributes.normal, c=new T.Color(p.color);
    nm.getNormalMatrix(p.matrix);
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i).applyMatrix4(p.matrix); P[(o+i)*3]=v.x; P[(o+i)*3+1]=v.y; P[(o+i)*3+2]=v.z;
      v.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize(); N[(o+i)*3]=v.x; N[(o+i)*3+1]=v.y; N[(o+i)*3+2]=v.z;
      C[(o+i)*3]=c.r; C[(o+i)*3+1]=c.g; C[(o+i)*3+2]=c.b;
      SI[(o+i)*4]=p.bone; SW[(o+i)*4]=1;
    }
    if(g.index) for(let k=0;k<g.index.count;k++) idx.push(o+g.index.getX(k));
    else for(let k=0;k<pos.count;k++) idx.push(o+k);
    o+=pos.count;
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(P,3));
  geo.setAttribute("normal", new T.BufferAttribute(N,3));
  geo.setAttribute("color", new T.BufferAttribute(C,3));
  geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(SI,4));
  geo.setAttribute("skinWeight", new T.Float32BufferAttribute(SW,4));
  geo.setIndex(idx);
  return geo;
}
const _pm=(x,y,z,sx,sy,sz,rx)=>new T.Matrix4().compose(V3(x,y,z), new T.Quaternion().setFromEuler(new T.Euler(rx||0,0,0)), V3(sx||1,sy||1,sz||1));
function skinned(parts, bones, mat){
  const mesh=new T.SkinnedMesh(rigidSkin(parts), mat||PEOPLE_MAT);
  mesh.add(bones[0]); mesh.updateMatrixWorld(true);
  mesh.bind(new T.Skeleton(bones));
  mesh.castShadow=true; mesh.frustumCulled=false;
  return mesh;
}
/* ---- a person ------------------------------------------------------------- */
const SKINS=["#f1c9a5","#e2b48c","#c68e62","#9a6440","#6b4428"], HAIRS=["#2b1e14","#4a3020","#6b4a2b","#b89b6a","#8d8a86","#1a1716"];
const SHIRTS=["#2f5f8f","#b33a3a","#e8e4d8","#3d6e44","#1d1f22","#c99a2a","#7a4f8a","#5d6a73","#d77a3a","#2b3d63"];
const PANTS=["#3b4a66","#2c3446","#b9a27a","#1d1f22","#5c5a52","#6f7b86"];
function buildPerson(o){
  const h=o.h||1, HIP=0.93*h, B=[], parts=[];
  const bone=(par,x,y,z)=>{ const b=new T.Bone(); b.position.set(x,y,z); if(par>=0) B[par].add(b); B.push(b); return B.length-1; };
  const root=bone(-1,0,HIP,0), spine=bone(root,0,0.04*h,0), head=bone(spine,0,0.58*h,0);
  const sw=(o.female?0.18:0.205)*h;
  const shL=bone(spine,-sw,0.50*h,0), elL=bone(shL,0,-0.28*h,0), shR=bone(spine,sw,0.50*h,0), elR=bone(shR,0,-0.28*h,0);
  const hpL=bone(root,-0.095*h,-0.03*h,0), knL=bone(hpL,0,-0.44*h,0), hpR=bone(root,0.095*h,-0.03*h,0), knR=bone(hpR,0,-0.44*h,0);
  const add=(geo,m,c,b)=>parts.push({geo:geo, matrix:m, color:c, bone:b});
  const cyl=(rt,rb,len,seg)=>new T.CylinderGeometry(rt,rb,len,Math.max(seg||0,14));       // (round enough not to show its sides)
  const sph=(r,a,b)=>new T.SphereGeometry(r,Math.max(a||0,16),Math.max(b||0,12));
  const Y=y=>HIP+y*h;
  // pelvis and torso
  add(new T.BoxGeometry(0.30*h,0.20*h,0.19*h), _pm(0,Y(-0.01),0), o.pants, root);
  add(cyl(0.165*h*(o.female?0.92:1), 0.145*h, 0.50*h, 12), _pm(0,Y(0.30),0, 1,1,0.62), o.shirt, spine);
  // a gut over the belt, and a vest open down the front over it: the hi-vis a driver wears
  // round a lot, two silver bands round it (each piece a size out from the one under it)
  if(o.belly) add(sph(0.5,12,9), _pm(0,Y(0.17),0.045*h, 0.31*h,0.30*h,0.23*h), o.shirt, spine);
  if(o.vest){ const vz=o.belly?1.0:0.66, vo=o.belly?0.02*h:0;           // cut fuller round a gut
    const vt=(r,y,len,c)=>add(new T.CylinderGeometry(r*1.0,r*0.94,len,14,1,true, 0.55, Math.PI*2-1.1), _pm(0,Y(y),vo, 1,1,vz), c, spine);
    vt(0.178*h, 0.31, 0.44*h, o.vest); vt(0.183*h, 0.20, 0.035*h, "#d9dcd8"); vt(0.180*h, 0.40, 0.035*h, "#d9dcd8"); }
  add(sph(0.5,12,8), _pm(0,Y(0.52),0, (sw*2+0.04)*1.0, 0.13*h, 0.21*h), o.shirt, spine);
  if(o.female) add(sph(0.5,10,8), _pm(0,Y(0.40),0.05*h, 0.26*h,0.12*h,0.12*h), o.shirt, spine);
  add(cyl(0.048*h,0.052*h,0.10*h,8), _pm(0,Y(0.61),0.005), o.skin, spine);
  // the head: skull, nose, ears, eyes, hair
  add(sph(0.105*h,14,10), _pm(0,Y(0.73),0.01, 0.92,1.08,1.0), o.skin, head);
  add(new T.BoxGeometry(0.03*h,0.045*h,0.04*h), _pm(0,Y(0.72),0.105*h), o.skin, head);
  for(const s of [-1,1]){ add(sph(0.013*h,6,5), _pm(s*0.035*h,Y(0.745),0.093*h), o.eyes||"#1a1614", head);
                          add(sph(0.024*h,6,5), _pm(s*0.097*h,Y(0.73),0.0, 0.5,1,0.8), o.skin, head); }
  add(new T.SphereGeometry(0.114*h,14,8,0,Math.PI*2,0,Math.PI*0.52), _pm(0,Y(0.745),-0.008*h, 0.95,0.95,1.04), o.hair, head);
  if(o.female) add(new T.BoxGeometry(0.20*h,0.26*h,0.06*h), _pm(0,Y(0.64),-0.075*h), o.hair, head);
  // a beard and a moustache, under the cap; shades across the eyes
  if(o.beard){ add(sph(0.5,12,8), _pm(0,Y(0.668),0.042*h, 0.19*h,0.14*h,0.15*h), o.beard, head);
               add(new T.BoxGeometry(0.075*h,0.016*h,0.02*h), _pm(0,Y(0.697),0.112*h), o.beard, head); }
  if(o.shades) add(new T.BoxGeometry(0.155*h,0.032*h,0.012*h), _pm(0,Y(0.748),0.106*h), "#121416", head);
  // a trucker's cap is two panels, the foam front a colour of its own and the mesh round the back
  // (the two meet at an edge, they do not lie one over the other)
  if(o.cap){ const f=o.capFront, cs=(a0,a1,c)=>add(new T.SphereGeometry(0.118*h,14,8,a0,a1,0,Math.PI*0.42), _pm(0,Y(0.758),-0.004*h), c, head);
             if(f){ cs(Math.PI/2-0.9, 1.8, f); cs(Math.PI/2+0.9, Math.PI*2-1.8, o.cap); } else cs(0, Math.PI*2, o.cap);
             add(new T.BoxGeometry(0.17*h,0.012*h,0.10*h), _pm(0,Y(0.785),0.10*h), o.cap, head); }
  if(o.beanie){ add(new T.SphereGeometry(0.119*h,14,8,0,Math.PI*2,0,Math.PI*0.46), _pm(0,Y(0.752),-0.006*h, 1,1.12,1), o.beanie, head);
                add(new T.CylinderGeometry(0.121*h,0.121*h,0.04*h,14,1,true), _pm(0,Y(0.785),-0.006*h), o.beanie, head); }
  // a hoodie: the hood up over the head (open at the face) or down on the
  // shoulders, the drawstrings, the pocket across the front
  if(o.hoodie){
    if(o.hoodUp) add(new T.SphereGeometry(0.132*h,16,10, Math.PI/2+0.95, Math.PI*2-1.9, 0, Math.PI*0.66),
                     _pm(0,Y(0.738),-0.02*h, 0.98,1.06,1.10), o.shirt, head);
    else add(new T.SphereGeometry(0.12*h,12,8, Math.PI, Math.PI, Math.PI*0.25, Math.PI*0.55), _pm(0,Y(0.575),-0.05*h, 1.25,0.70,0.95), o.shirt, spine);
    for(const s of [-1,1]) add(new T.CylinderGeometry(0.004*h,0.004*h,0.13*h,4), _pm(s*0.035*h,Y(0.47),0.10*h), "#e8e6df", spine);
    add(new T.BoxGeometry(0.21*h,0.10*h,0.02*h), _pm(0,Y(0.15),0.092*h), o.pocket||o.shirt, spine);
  }
  // arms: a sleeve, the forearm, the hand
  for(const [s,sh,el] of [[-1,shL,elL],[1,shR,elR]]){
    add(cyl(0.050*h,0.045*h,0.16*h,8), _pm(s*sw,Y(0.43),0), o.shirt, sh);
    add(cyl(0.042*h,0.038*h,0.13*h,8), _pm(s*sw,Y(0.30),0), o.long?o.shirt:o.skin, sh);
    add(cyl(0.037*h,0.031*h,0.25*h,8), _pm(s*sw,Y(0.135),0), o.long?o.shirt:o.skin, el);
    add(sph(0.042*h,8,6), _pm(s*sw,Y(-0.015),0.005, 0.8,1.1,0.6), o.skin, el);
  }
  // legs: thigh, shin (bare under shorts), the shoe
  for(const [s,hp,kn] of [[-1,hpL,knL],[1,hpR,knR]]){
    add(cyl(0.078*h,0.060*h,0.45*h,9), _pm(s*0.095*h,Y(-0.255),0), o.pants, hp);
    add(cyl(0.056*h,0.045*h,0.43*h,8), _pm(s*0.095*h,Y(-0.685),0), o.shorts?o.skin:o.pants, kn);
    if(o.boots) add(new T.BoxGeometry(0.10*h,0.15*h,0.27*h), _pm(s*0.095*h,0.075*h,0.045*h), o.shoes, kn);   // work boots, laced up the shin
    else add(new T.BoxGeometry(0.095*h,0.075*h,0.26*h), _pm(s*0.095*h,0.04,0.045*h), o.shoes, kn);
  }
  // anything more, on the same bones (a costume, a wound, a mask)
  if(o.extra) o.extra(add, Y, h, {root:root,spine:spine,head:head,shL:shL,elL:elL,shR:shR,elR:elR,hpL:hpL,knL:knL,hpR:hpR,knR:knR}, sw);
  const mesh=skinned(parts, B, o.mat);
  const g=new T.Group(); g.add(mesh); scene.add(g);
  return {g:g, mesh:mesh, B:B, j:{root:root,spine:spine,head:head,shL:shL,elL:elL,shR:shR,elR:elR,hpL:hpL,knL:knL,hpR:hpR,knR:knR}, HIP:HIP, h:h, female:!!o.female};
}
function randomPerson(r){
  const pick=a=>a[(r()*a.length)|0], female=r()<0.45;
  return buildPerson({female:female, h:female?0.95+r()*0.06:1.0+r()*0.07, skin:pick(SKINS), hair:pick(HAIRS),
                      shirt:pick(SHIRTS), pants:pick(PANTS), shoes:pick(["#f2f0ea","#1d1d1f","#6b4a2b","#8d9196"]),
                      shorts:r()<0.3, long:r()<0.25, cap:r()<0.22?pick(["#b3151b","#1f3b6e","#2f5a35","#1d1d1f"]):null});
}
// the smoker's cycle: the hand comes up (0..0.15), holds at the mouth for
// the drag (to 0.25), and goes down again by 0.4; once every 8 s or so
const _smokeCyc=(t,seed)=>(t*0.12+seed)%1;
const _smokeUp=c=>smoothstep(0,0.15,c)*(1-smoothstep(0.25,0.4,c));
// poses: everything is a bone rotation off the rest pose
// smooth noise in [-1,1] along one axis: a value at each whole step, eased between (for the idle below)
function _noise1(x){ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f), h=n=>{ const q=Math.sin(n*127.1+311.7)*43758.5453; return q-Math.floor(q); };
  return (h(i)*(1-u)+h(i+1)*u)*2-1; }
/* Nobody stands or sits stock still. Over whatever the pose is, as long as they are not walking: breathing in the
   chest and shoulders; the weight going from one foot to the other now and then, the hip and the free knee with
   it; the head looking about and resting, nodding a little; now and then a hand up (to the face, the hair, a
   gesture) and back down. Sitting, they lean in and back, shift their legs, put a hand out to the table. Each on
   their own clock (p.seed). A job (14q) or a task (14b's visitors) that poses an arm or the head after this has
   the last word on it. */
function _idle(p, mode, t){
  const B=p.B, J=p.j, sd=p.seed||0;
  const br=Math.sin(t*1.55+sd*3.1);                                                    // breathing, about 15 a minute
  B[J.spine].rotation.x+=br*0.014; B[J.shL].rotation.z-=br*0.012; B[J.shR].rotation.z+=br*0.012;
  const look=_noise1(t*0.21+sd*7.3), nod=_noise1(t*0.16+sd*4.1);
  B[J.head].rotation.y=B[J.head].rotation.y*0.5+look*0.42; B[J.head].rotation.x+=nod*0.10;
  const g=smoothstep(0.55, 0.85, _noise1(t*0.11+sd*11.7)), hand=_noise1(sd*3.3)>0 ? J.shR : J.shL, el=hand===J.shR ? J.elR : J.elL;
  if(mode==="sit"){
    B[J.spine].rotation.x+=0.07*_noise1(t*0.09+sd*2.2);
    B[J.knL].rotation.x+=0.12*_noise1(t*0.07+sd*5.5); B[J.knR].rotation.x+=0.12*_noise1(t*0.07+sd*6.6);
    B[hand].rotation.x-=g*0.45; B[el].rotation.x-=g*0.55;
  }else if(mode==="stand"){
    const w=_noise1(t*0.08+sd*5.1);                                                   // the weight from foot to foot
    B[J.root].position.x+=w*0.022; B[J.hpL].rotation.z+=w*0.04; B[J.hpR].rotation.z+=w*0.04; B[J.spine].rotation.z-=w*0.03;
    if(w>0) B[J.knR].rotation.x+=w*0.16; else B[J.knL].rotation.x-=w*0.16;
    B[hand].rotation.x-=g*0.9; B[hand].rotation.z+=(hand===J.shR ? 0.1 : -0.1)*g; B[el].rotation.x-=g*1.25;
  }
}
function poseP(p, mode, ph, t){
  const sd=p.seed||0;                            // (a person built without a seed, a custom one, still looks round: not NaN)
  const B=p.B, J=p.j, s=Math.sin(ph*Math.PI*2), c=Math.cos(ph*Math.PI*2);
  for(const b of B) b.rotation.set(0,0,0);
  B[J.root].position.set(0, p.HIP, 0);           // (all of it, every frame: _idle's weight shift moves it sideways, and must not add up)
  if(mode==="walk"){
    const sL=s, sR=-s;
    B[J.hpL].rotation.x=-sL*0.42; B[J.hpR].rotation.x=-sR*0.42;
    B[J.knL].rotation.x=0.08+Math.max(0, c)*0.75; B[J.knR].rotation.x=0.08+Math.max(0,-c)*0.75;
    B[J.shL].rotation.x=sL*0.34; B[J.shR].rotation.x=sR*0.34;
    B[J.elL].rotation.x=-0.25-Math.max(0,-sL)*0.25; B[J.elR].rotation.x=-0.25-Math.max(0,-sR)*0.25;
    B[J.root].position.y=p.HIP+Math.abs(c)*0.025-0.012;
    B[J.spine].rotation.y=s*0.06; B[J.spine].rotation.x=0.04;
  }else if(mode==="sit"){
    B[J.root].position.y=0.50;
    B[J.hpL].rotation.x=B[J.hpR].rotation.x=-1.50;
    B[J.knL].rotation.x=B[J.knR].rotation.x=1.45;
    B[J.shL].rotation.x=B[J.shR].rotation.x=-0.55; B[J.elL].rotation.x=B[J.elR].rotation.x=-0.85;
    B[J.head].rotation.y=Math.sin(t*0.3+sd)*0.5; B[J.head].rotation.x=0.08;
  }else{
    // standing: weight on one leg, a little sway, the head looking about
    B[J.hpL].rotation.z=0.03; B[J.hpR].rotation.z=-0.02; B[J.knL].rotation.x=0.05;
    B[J.shL].rotation.z=-0.06; B[J.shR].rotation.z=0.06; B[J.elL].rotation.x=B[J.elR].rotation.x=-0.12;
    B[J.spine].rotation.y=Math.sin(t*0.4+sd)*0.05;
    B[J.head].rotation.y=Math.sin(t*0.25+sd*2)*0.45;
    if(mode==="phone"){ B[J.shR].rotation.x=-0.35; B[J.shR].rotation.z=0.35; B[J.elR].rotation.x=-2.35; B[J.head].rotation.y*=0.4; B[J.head].rotation.z=-0.12; }
    if(mode==="read"){ B[J.head].rotation.x=0.30; B[J.head].rotation.y*=0.2; B[J.shL].rotation.x=B[J.shR].rotation.x=-0.45; B[J.elL].rotation.x=B[J.elR].rotation.x=-1.1; }
    // the drag: the arm comes forward and in, the elbow folds right up and
    // the forearm turns over, so the fingers end at the lips; the head
    // stops looking about and meets the hand
    if(mode==="smoke"){ const up=_smokeUp(_smokeCyc(t,sd));
      B[J.shR].rotation.set(-0.25-up*1.008, -up*0.817, 0.18-up*0.165);
      B[J.elR].rotation.set(-0.9-up*1.30, up*0.875, 0);
      B[J.head].rotation.y*=1-up; B[J.head].rotation.x=-0.04*up; }
  }
  if(mode==="sit" || mode==="stand") _idle(p, mode, t);
  else if(mode!=="walk"){ const br=Math.sin(t*1.55+(p.seed||0)*3.1); B[J.spine].rotation.x+=br*0.012; }   // (phone, read, smoke: breathing at least)
}
/* ---- a lit cigarette, held in the right hand ------------------------------
   Filter, paper, and a coal at the end that brightens on the drag. It
   rides on the forearm's bone, so it goes up to the mouth with the hand,
   and the fingers turn it as a wrist would (see updateCigarette): held low
   it points forward, out and down; at the mouth the filter is between the
   lips and the lit end points out and away from the face. */
const CIG_MAT={paper:new T.MeshStandardMaterial({color:0xf2f0ea, roughness:0.7}),
               filter:new T.MeshStandardMaterial({color:0xc98f52, roughness:0.75}),
               ash:new T.MeshStandardMaterial({color:0x6b6763, roughness:0.95})};
function giveCigarette(P){
  const g=new T.Group(), h=P.h;
  const part=(r0,r1,len,z,mat)=>{ const m=new T.Mesh(new T.CylinderGeometry(r1,r0,len,8), mat); m.rotation.x=Math.PI/2; m.position.z=z; g.add(m); return m; };
  part(0.0044,0.0044,0.024, 0.012, CIG_MAT.filter);
  part(0.0042,0.0042,0.054, 0.051, CIG_MAT.paper);
  part(0.0042,0.0040,0.004, 0.080, CIG_MAT.ash);
  const coal=part(0.0040,0.0034,0.004, 0.084, new T.MeshBasicMaterial({color:0xff5a1a, toneMapped:false}));
  const glow=new T.Sprite(new T.SpriteMaterial({map:GLOW_TEX, color:0xff6420, transparent:true, depthWrite:false,
                                                blending:T.AdditiveBlending, opacity:0.5, toneMapped:false}));
  glow.scale.set(0.05,0.05,1); glow.position.z=0.085; g.add(glow);
  const tip=new T.Object3D(); tip.position.z=0.088; g.add(tip);
  g.position.set(0.014, -0.29*h, 0.022);
  P.B[P.j.elR].add(g);
  return {g:g, coal:coal, glow:glow, tip:tip, wisp:0, puff:0};
}
// where the filter sits on the forearm (in bone space, per metre of height)
// and which way the lit end points (in the body's frame: x out to the
// right, y up, z forward), hand down and hand at the mouth
const CIG_POS0=V3(0.014,-0.290,0.022), CIG_POS1=V3(-0.013,-0.346,0.009);
const CIG_DIR0=V3(0.35,-0.40,0.85).normalize(), CIG_DIR1=V3(0.42,-0.12,0.90).normalize();
const _cq=new T.Quaternion(), _cqB=new T.Quaternion(), _cd=new T.Vector3(), _cZ=V3(0,0,1);
function holdCigarette(C, P, up){
  C.g.position.lerpVectors(CIG_POS0, CIG_POS1, up).multiplyScalar(P.h);
  _cd.lerpVectors(CIG_DIR0, CIG_DIR1, up).normalize();
  P.B[P.j.spine].getWorldQuaternion(_cqB); _cd.applyQuaternion(_cqB);
  P.B[P.j.elR].getWorldQuaternion(_cq); _cd.applyQuaternion(_cq.invert());
  C.g.quaternion.setFromUnitVectors(_cZ, _cd);
}
/* A drink in the hand stands up in it. A glass, a can or a mug rides on the forearm's bone, and a forearm brought
   up level would lay it on its side, so each frame, after the pose, it is turned back to stand as the body stands:
   up in the world, facing the way they face, then turned `ax` radians about the body's own x. A little the
   negative way tips its top back toward the face, for the sip (DRINK_TIP at the lips); a fishing rod is held
   the positive way, out and up over the water. */
const _lvQ=new T.Quaternion(), _lvB=new T.Quaternion(), _lvT=new T.Quaternion(), _lvX=V3(1,0,0), DRINK_TIP=-1.25;
function levelHeld(obj, P, ax){
  obj.parent.getWorldQuaternion(_lvQ);                                   // (brings the bones up to this frame's pose)
  P.g.getWorldQuaternion(_lvB);
  _lvT.setFromAxisAngle(_lvX, ax||0);
  obj.quaternion.copy(_lvQ.invert().multiply(_lvB).multiply(_lvT)); }
const _tipW=new T.Vector3(), _mouthW=new T.Vector3();
function updateCigarette(p, dt, now, dark){
  const C=p.cig, P=p.P, cyc=_smokeCyc(now,P.seed), up=_smokeUp(cyc);
  holdCigarette(C, P, up);
  // the coal: dull red, and bright while it is drawn on
  const drag=up>0.85 && cyc>0.15 && cyc<0.27 ? 1 : 0;
  C.heat=(C.heat||0.3)+((drag?1:0.3)-(C.heat||0.3))*Math.min(1,dt*(drag?5:1.5));
  C.coal.material.color.setRGB(0.55+0.45*C.heat, 0.12+0.30*C.heat*C.heat, 0.03+0.06*C.heat);
  C.glow.material.opacity=(0.18+0.55*dark)*(0.35+0.65*C.heat);
  const s=0.035+0.035*C.heat; C.glow.scale.set(s,s,1);
  if(Math.hypot(p.x-camera.position.x, p.z-camera.position.z)>60) return;
  // a thread of smoke off the end, and the breath out after each drag
  C.tip.getWorldPosition(_tipW);
  C.wisp-=dt;
  if(C.wisp<=0){ C.wisp=0.09+Math.random()*0.06;
    PUFFS.emit(_tipW.x, _tipW.y+0.01, _tipW.z, (Math.random()-0.5)*0.03, 0.16+Math.random()*0.06, (Math.random()-0.5)*0.03,
               0.02, 0.26+Math.random()*0.08, 2.6+Math.random()*0.8, 0.62, 0.92, 0); }
  if(cyc>0.31 && cyc<0.43){
    C.puff-=dt;
    if(C.puff<=0){ C.puff=0.045;
      const hb=P.B[P.j.head]; _mouthW.set(0, 0.08*P.h, 0.11*P.h).applyMatrix4(hb.matrixWorld);
      const fx=Math.sin(p.yaw), fz=Math.cos(p.yaw), k=1-(cyc-0.31)/0.12;
      PUFFS.emit(_mouthW.x, _mouthW.y, _mouthW.z, fx*(0.55*k+0.15)+(Math.random()-0.5)*0.08, 0.05+Math.random()*0.08,
                 fz*(0.55*k+0.15)+(Math.random()-0.5)*0.08, 0.06, 0.55+Math.random()*0.18, 3.0+Math.random()*0.8, 0.55*k+0.10, 0.92, 0);
    }
  }
}


/* ---- a dog: a lab, on the same plan with seven bones ----------------------
   buildDog(coat) returns {g, B, head, tail, legs}: root, head, tail and four
   legs. 14t-pets drives one (its gaits, steering, fetch); 14q walks one on a
   lead beside a walker. */
function buildDog(coat){
  const B=[], parts=[];
  const bone=(par,x,y,z)=>{ const b=new T.Bone(); b.position.set(x,y,z); if(par>=0) B[par].add(b); B.push(b); return B.length-1; };
  const root=bone(-1,0,0.44,0), head=bone(root,0,0.10,0.30), tail=bone(root,0,0.06,-0.32);
  const legs=[bone(root,-0.08,-0.04,0.22), bone(root,0.08,-0.04,0.22), bone(root,-0.08,-0.03,-0.24), bone(root,0.08,-0.03,-0.24)];
  const add=(geo,m,c,b)=>parts.push({geo:geo, matrix:m, color:c, bone:b});
  add(new T.SphereGeometry(0.5,12,8), _pm(0,0.44,0, 0.24,0.25,0.66), coat, root);
  add(new T.SphereGeometry(0.5,10,8), _pm(0,0.47,0.20, 0.24,0.27,0.30), coat, root);
  add(new T.CylinderGeometry(0.065,0.08,0.18,8), _pm(0,0.53,0.30, 1,1,1, 0.7), coat, head);
  add(new T.SphereGeometry(0.085,10,8), _pm(0,0.60,0.38), coat, head);
  add(new T.BoxGeometry(0.075,0.065,0.11), _pm(0,0.575,0.47), coat, head);
  add(new T.SphereGeometry(0.018,6,5), _pm(0,0.595,0.53), "#1a1614", head);
  for(const s of [-1,1]){ add(new T.BoxGeometry(0.02,0.10,0.06), _pm(s*0.075,0.57,0.36), "#a07c4c", head);
                          add(new T.SphereGeometry(0.011,6,5), _pm(s*0.04,0.625,0.445), "#1a1614", head); }
  add(new T.TorusGeometry(0.07,0.012,5,12), _pm(0,0.53,0.31, 1,1,1, 1.2), "#b3151b", head);
  add(new T.CylinderGeometry(0.02,0.012,0.30,6), _pm(0,0.58,-0.44, 1,1,1, -0.9), coat, tail);
  legs.forEach((b,k)=>{ const x=(k%2?0.08:-0.08), z=k<2?0.22:-0.24;
    add(new T.CylinderGeometry(0.035,0.026,0.38,7), _pm(x,0.21,z), coat, b);
    add(new T.SphereGeometry(0.03,6,5), _pm(x,0.025,z+0.02, 1,0.7,1.3), coat, b); });
  const mesh=skinned(parts, B);
  const g=new T.Group(); g.add(mesh); scene.add(g);
  return {g:g, B:B, head:head, tail:tail, legs:legs};
}

/* ---- keeping clear ---------------------------------------------------------
   A person is a disc BODY_R across. They do not stand in a collider (a
   planter, a post, a bin, a parked car) or on a flower bed (KEEP_OFF), and
   nobody walks into another person. _hitAt answers whether a disc there would touch any
   of it; a walker probes ahead with it and bends its line round whatever
   is in the way, the side it first chose, until the way is clear. */
const BODY_R=0.28;
function _hitAt(x, z, y, r, self){
  const own=self && self.v ? self.v.col : null;                         // a driver's own car is not in the way
  const lo=y+0.30, hi=y+1.75;                                            // (a curb is stepped over)
  if(_hitList(colsNear(x,z), x, z, r, lo, hi, own) || _hitList(COL_BIG, x, z, r, lo, hi, own) || _hitList(COL_DYN, x, z, r, lo, hi, own)) return true;
  for(let i=0;i<KEEP_OFF.length;i++){ const k=KEEP_OFF[i]; if(x>k.x0-r && x<k.x1+r && z>k.z0-r && z<k.z1+r) return true; }
  const rr=(r+BODY_R)*(r+BODY_R);
  for(let i=0;i<PEOPLE.length;i++){ const q=PEOPLE[i];
    if(q===self || q.sat || !q.P || Math.abs(q.y-y)>=1.2 || (q.x-x)*(q.x-x)+(q.z-z)*(q.z-z)>=rr) continue;     // (sat somewhere out of the way)
    if(!q.P.g.visible || q.ghost) continue;
    return true;
  }
  return false;
}
// (the boxes first by their bounds, which throws out nearly all of them, then the turned ones by their turn)
function _hitList(L, x, z, r, lo, hi, own){
  for(let i=0;i<L.length;i++){ const c=L[i];
    if(x<c.x0-r || x>c.x1+r || z<c.z0-r || z>c.z1+r || c.y1<lo || c.y0>hi || c===own) continue;
    if(c.ob){ if(obNear(c.ob,x,z,r)) return true; continue; }
    const qx=x<c.x0 ? c.x0 : x>c.x1 ? c.x1 : x, qz=z<c.z0 ? c.z0 : z>c.z1 ? c.z1 : z, dx=x-qx, dz=z-qz;
    if(dx*dx+dz*dz<r*r) return true; }
  return false;
}
// the nearest place to (x,z) at the same level where a person stands clear
function _clearSpot(x, z, y, self){
  const r=BODY_R+0.10;
  if(!_hitAt(x,z,y,r,self)) return {x:x, z:z};
  for(let d=0.1; d<=2.5; d+=0.1) for(let k=0;k<24;k++){
    const a=k/24*Math.PI*2, cx=x+Math.sin(a)*d, cz=z+Math.cos(a)*d;
    if(Math.abs(surfaceY(cx,cz,y+0.3)-y)<0.08 && !_hitAt(cx,cz,y,r,self)) return {x:cx, z:cz};
  }
  return {x:x, z:z};
}
// a walker: follows its points at its pace, turns smoothly, steps round
// what is in its way, stands on whatever is there
function _stepWalker(p, dt, speed){
  const tgt=p.path[p.pi];
  if(!tgt) return true;
  const dx=tgt.x-p.x, dz=tgt.z-p.z, d=Math.hypot(dx,dz);
  // stop for you, the way people do
  const px=player.pos.x-p.x, pz=player.pos.z-p.z, ahead=(px*dx+pz*dz)/(d||1);
  const pd=Math.hypot(px,pz);
  let sp=speed;
  if(!driving && !droneMode && pd<1.3 && ahead>0) sp=0;
  // there, or as near as it can be got (held up, or a long while circling it)
  p.wpT=(p.wpT||0)+dt;
  if(d<0.25 || (d<0.9 && p.stuck>0.6) || (d<2.5 && p.wpT>9)){ p.pi++; p.stuck=0; p.wpT=0; return p.pi>=p.path.length; }
  let want=Math.atan2(dx,dz);
  // look a stride ahead; if that is blocked, bend the line a little at a
  // time toward the side already chosen, then the other, until it is not.
  // Someone already in a tight spot (or held up for long) just goes on out.
  const y=(p.y===undefined?0:p.y), look=Math.min(0.75, d);
  const free=a=>!_hitAt(p.x+Math.sin(a)*look, p.z+Math.cos(a)*look, y, BODY_R, p) &&
                !_hitAt(p.x+Math.sin(a)*look*0.5, p.z+Math.cos(a)*look*0.5, y, BODY_R, p);
  const loose=(p.stuck||0)>1.5 || _hitAt(p.x, p.z, y, BODY_R*0.8, p);
  if(!loose && !free(want)){
    const side=p.side||1; let found=false;
    bend: for(const k of [1,2,3,4,5,6]) for(const s of [side,-side]){
      const a=want+s*k*0.28;
      if(free(a)){ want=a; p.side=s; found=true; break bend; }
    }
    if(!found){ sp=0; p.stuck=(p.stuck||0)+dt; }
  }else if(p.side && Math.random()<dt*0.5) p.side=0;
  let dy=want-p.yaw; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2;
  p.yaw+=dy*Math.min(1,dt*7);
  const step=Math.min(d, sp*dt), nx=p.x+Math.sin(p.yaw)*step, nz=p.z+Math.cos(p.yaw)*step;
  // never into anything: hold where you are instead, and after a moment
  // give the point up and make for the next one
  if(step>0 && !loose && _hitAt(nx, nz, y, BODY_R*0.9, p)){ p.stuck=(p.stuck||0)+dt; p.moving=false; return false; }
  if(step>0) p.stuck=Math.max(0,(p.stuck||0)-dt*0.5);
  p.x=nx; p.z=nz;
  p.y=surfaceY(p.x, p.z, y+0.45);
  p.ph=(p.ph+step/1.45)%1;
  p.moving=sp>0.05 && step>0;
  return false;
}
// someone coming or going is at this door: it opens for them (17-player).
// A stall's door opens only for whoever is going in or coming out of it,
// and only as they reach it; with them sat inside it stays shut.
// someone walking is at this door: it opens for them (17-player). A door with `npcReach` uses that.
function npcNearDoor(d){
  const reach=d.npcReach||2.4;
  for(const p of PEOPLE){
    if(!(p.walking || p.moving) || !p.P || !p.P.g.visible) continue;
    if(Math.abs((p.y||0)-d.y)<1.8 && Math.hypot(p.x-d.x, p.z-d.z)<reach) return true;
  }
  if(typeof CROWD!=="undefined") for(const G of CROWD.groups){ if(!G.shown) continue;
    for(const p of G.people) if(p.path && p.P.g.visible && Math.abs(p.y-d.y)<1.8 && Math.hypot(p.x-d.x, p.z-d.z)<reach) return true; }
  return false;
}
/* a person of your own, walking a path of {x,z} points with _stepWalker, posed each frame: PEOPLE.push it and call
   stepPerson from a frame hook. p = {P (buildPerson's), x, z, y, yaw, path, pi, speed, ph}. Returns true when it has
   arrived at the path's end. */
function stepPerson(p, dt, now){
  const done=p.path ? _stepWalker(p, dt, p.speed||1.3) : true;
  p.walking=!done;
  p.P.g.position.set(p.x, p.y||0, p.z); p.P.g.rotation.y=p.yaw||0;
  poseP(p.P, p.moving ? "walk" : (p.mode||"stand"), p.ph||0, now);
  return done;
}
