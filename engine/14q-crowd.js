"use strict";
/* ENGINE · 14q-crowd.js
   people out of doors: the way any crowd of them is kept, shown, moved and
   posed, the things they hold, the jobs they do, and their dogs
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   14q · CROWDS
   A crowd is a group of people (14b's, one skinned mesh each) round a
   centre: shown and moved only while you are within its reach, hidden
   past it. Each person has a part to play:
     sit, stand     where they are put, looking about; with a glass, a
                    drink now and then (`drink`); phone, read as 14b's
     walk           round a path (`loop`) or back and forth along it,
                    stopping where a point says so, at their own pace
                    (a jogger's is a run); a dog may come along
     job            stand and do something with their hands, by its kind:
                    wash (a car), water (the flowers), fish, pour, tray,
                    mow (walking, the mower in front), kneel (weeding),
                    talk, watch, toss (cornhole)
                    (and hang (washing), pump (fuel), drive (a rig, with
                    its prop), recline, mourn, throw (a ball), strum (a
                    guitar, with p.guitar), wash ...)

   USING IT
     G = crowdGroup(name, cx, cz, reach)      people shown within `reach` m of (cx, cz)
     G.bounds = {x0,x1,z0,z1}                 walkers keep inside it
     p = crowdAdd(G, {
       look:{...buildPerson's options} | seed:123 (one at random),
       x, z, y, yaw,                          where (y: the floor; default the ground)
       mode:"stand"|"sit"|"walk"|"phone"|"read",
       job:"talk"|"water"|"wash"|"fish"|..., (see _crowdPose)
       path:[[x,z,y?,pause?],...], loop:true, speed:1.25, run:false,   a walker
       held:"pint"|"can"|"cup"|"rocks"|"tray"|"rod"|"can_w"|"sponge"|"clip"|"paper"|"nozzle"|"flowers"|"shirt",
       drink:true,                            a sip now and then (a drink in hand)
       dog:"#c8a060",                         a dog on the lead beside a walker
       prop:mesh,                             a thing that goes where they go (a mower, a chair): crowdProp
       sitY,                                  a seated person's seat top + about 5.5 cm (a chair's 0.46 takes 0.515)
       sway:0.3,                              they look about from the waist
       dayOnly:true, when:(p)=>bool,          only out by day / only while when() says
       yAt:(x,z)=>y,                          a walker's own floors
       yield:(p)=>bool,                       hold it (something that drives stops for you)
       tick:(p, dt, moving)=>{}, onShow:(p, shown)=>{}
     })
   They are not solid: give anything big that moves its own COL_DYN box.
   A walker's corners can be rounded with crowdRound(pts, R, closed). Arm
   IK: _armTo(P, sh, el, target, pole) after the pose (the R bones are on
   the body's left). WATER_Y (if a world has open water) keeps walkers out
   of it where Terrain.lakeSD says it is.
   ---------------------------------------------------------------------- */
const CROWD={groups:[], t:0};
function crowdGroup(name, cx, cz, reach){ const g={name:name, cx:cx, cz:cz, r:reach||170, people:[], shown:true, day:true}; CROWD.groups.push(g); return g; }
// a glass, a can, a cup, a rod, a tray: something held, on a forearm's bone, the way 14b holds a cigarette
let WATER_Y=null;            // a world with open water sets it: walkers never step into it (Terrain.lakeSD)
const _HELD={}, _HELD_UP={pint:1, can:1, cup:1, rocks:1};                       // (_HELD_UP: drinks, kept standing in the hand)
function _heldMat(c){ return _HELD[c]||(_HELD[c]=new T.MeshStandardMaterial({color:c, roughness:0.4, metalness:0.1})); }
function crowdHold(P, kind, right){
  const h=P.h, g=new T.Group(), bone=P.B[right===false ? P.j.elL : P.j.elR];
  const add=(geo, c, x, y, z, rx)=>{ const m=new T.Mesh(geo, _heldMat(c)); m.position.set(x,y,z); if(rx) m.rotation.x=rx; g.add(m); return m; };
  if(kind==="pint"){ add(new T.CylinderGeometry(0.036, 0.030, 0.15, 12), "#c88a2a", 0, 0.03, 0.02); add(new T.CylinderGeometry(0.037, 0.037, 0.025, 12), "#f4efe0", 0, 0.115, 0.02); }
  else if(kind==="can") add(new T.CylinderGeometry(0.033, 0.033, 0.12, 10), "#3a6aa8", 0, 0.03, 0.02);
  else if(kind==="cup") add(new T.CylinderGeometry(0.04, 0.032, 0.10, 10), "#f2efe6", 0, 0.03, 0.02);
  else if(kind==="rocks"){ add(new T.CylinderGeometry(0.038, 0.034, 0.085, 14), "#e8eef0", 0, 0.02, 0.02); add(new T.CylinderGeometry(0.0378, 0.0362, 0.04, 14), "#b8742a", 0, 0.008, 0.02); }   // (a short glass of scotch: the whisky a band 1.5 mm proud of the glass, low in it)
  else if(kind==="tray"){
    // level on the flat of the hand: a frame turned back by the arm's own pose (the "tray" job's shoulder and elbow,
    // below), so up in it is up in the world whatever the forearm is doing
    const lv=new T.Group(); lv.quaternion.copy(new T.Quaternion().setFromEuler(new T.Euler(-0.35, 0, -0.25)).multiply(new T.Quaternion().setFromEuler(new T.Euler(-1.5, 0, 0))).invert());
    g.add(lv); const add2=(geo, c, x, y, z)=>{ const m=new T.Mesh(geo, _heldMat(c)); m.position.set(x,y,z); lv.add(m); };
    add2(new T.CylinderGeometry(0.20, 0.20, 0.015, 18), "#2a2a2c", 0, 0.03, 0.04);
    for(const [dx,dz] of [[-0.07,-0.04],[0.07,0.02],[0,0.10]]) add2(new T.CylinderGeometry(0.035, 0.030, 0.14, 10), "#d89a2e", dx, 0.03+0.0075+0.07, 0.04+dz); }
  else if(kind==="rod"){
    /* a spinning rod, laid along +y with its reel hung on the +z side (the tick turns it out over the water, the reel
       under it): the hand round the reel's seat at the origin, the cork grip back toward the body, the blank tapering
       away to the tip, its guides under it; g.tip is the tip, for the line */
    add(new T.CylinderGeometry(0.015, 0.017, 0.38, 10), "#b48a58", 0, -0.21, 0); add(new T.CylinderGeometry(0.019, 0.019, 0.03, 10), "#1d1d1e", 0, -0.415, 0);
    add(new T.CylinderGeometry(0.013, 0.014, 0.10, 10), "#b48a58", 0, 0.08, 0); add(new T.CylinderGeometry(0.010, 0.012, 0.06, 8), "#4a4c50", 0, 0.0, 0);
    add(new T.CylinderGeometry(0.0035, 0.009, 2.10, 6), "#2a1e1a", 0, 1.18, 0);
    add(new T.BoxGeometry(0.008, 0.012, 0.055), "#8a8d90", 0, 0.0, 0.032);                           // (the reel's stem, between the fingers)
    add(new T.CylinderGeometry(0.030, 0.026, 0.05, 14), "#2a2a2e", 0, -0.005, 0.075); add(new T.CylinderGeometry(0.024, 0.024, 0.018, 14), "#c8ccd0", 0, 0.028, 0.075);
    add(new T.BoxGeometry(0.06, 0.006, 0.008), "#8a8d90", 0.035, -0.01, 0.075); add(new T.CylinderGeometry(0.007, 0.007, 0.02, 6), "#1d1d1e", 0.066, -0.01, 0.075, Math.PI/2);
    for(const [y, s] of [[0.42, 0.016],[0.78, 0.012],[1.14, 0.010],[1.50, 0.008],[1.86, 0.007],[2.20, 0.006]])
      add(new T.TorusGeometry(s, 0.0018, 4, 10), "#c8ccd0", 0, y, 0.008+s, Math.PI/2);
    g.tip=new T.Object3D(); g.tip.position.set(0, 2.235, 0.004); g.add(g.tip); }
  else if(kind==="can_w"){ add(new T.CylinderGeometry(0.09, 0.10, 0.22, 12), "#3a8a4a", 0, -0.12, 0.05); add(new T.CylinderGeometry(0.015, 0.015, 0.30, 6), "#3a8a4a", 0, -0.02, 0.22, 1.0); }
  else if(kind==="sponge") add(new T.BoxGeometry(0.12, 0.06, 0.08), "#e6c21c", 0, 0, 0.03);
  else if(kind==="clip"){ add(new T.BoxGeometry(0.23, 0.31, 0.008), "#8a6a48", -0.06, 0.04, 0.10, -0.6); add(new T.BoxGeometry(0.20, 0.25, 0.004), "#f2efe6", -0.06, 0.03, 0.104, -0.6);
    add(new T.BoxGeometry(0.08, 0.025, 0.014), "#b8bcc0", -0.06, 0.18, 0.08, -0.6); }
  else if(kind==="paper") add(new T.BoxGeometry(0.30, 0.40, 0.01), "#e8e4d8", -0.12, 0.05, 0.12, -0.3);
  else if(kind==="nozzle"){ add(new T.BoxGeometry(0.05, 0.12, 0.10), "#1d1d1e", 0, 0.0, 0.03); add(new T.CylinderGeometry(0.012, 0.012, 0.22, 6), "#8a8d90", 0, 0.03, 0.15, Math.PI/2+0.4); }
  else if(kind==="flowers"){ add(new T.CylinderGeometry(0.035, 0.02, 0.26, 6), "#4a7a3a", 0, 0.02, 0.05);
    for(let k=0;k<7;k++){ const a=k*0.9; add(new T.SphereGeometry(0.035, 6, 4), ["#d83a5a","#f2d24a","#f4f2ec","#c86ab8"][k%4], Math.cos(a)*0.05, 0.16+(k%3)*0.02, 0.05+Math.sin(a)*0.05); } }
  else if(kind==="shirt") add(new T.BoxGeometry(0.42, 0.50, 0.01), "#e8e2c8", 0, 0.12, 0.10);
  g.position.set(0, -0.29*h, 0.02); bone.add(g); return g; }
// add a person to a group: o.look (buildPerson's options) or o.seed (one at random); o.x, o.z, o.y, o.yaw where; o.mode
// the part; o.path [[x,z,y?,pause?],...] for a walker, o.loop round it or else back and forth, o.speed; o.held a thing in hand
function crowdAdd(G, o){
  const P=o.look ? buildPerson(o.look) : randomPerson(_trng(o.seed||((Math.random()*1e6)|0)));
  P.seed=o.seed ? (o.seed%97)/97*6.28 : Math.random()*6.28;
  const p=Object.assign({P:P, ph:Math.random(), i:0, dir:1, wait:0, yawS:o.yaw||0, t:Math.random()*10}, o);
  if(p.path){ const q=p.path[0]; p.x=q[0]; p.z=q[1]; p.y=p.yAt ? p.yAt(p.x, p.z) : q[2]!==undefined ? q[2] : Terrain.groundAt(q[0], q[1]); }
  if(p.y===undefined) p.y=p.yAt ? p.yAt(p.x, p.z) : Terrain.groundAt(p.x, p.z);
  if(p.held) p.heldG=crowdHold(P, p.held, p.heldL ? false : true);
  if(p.dog){ p.D=buildDog(p.dog); p.dx=p.x; p.dz=p.z; }
  if(p.prop){ p.prop.position.set(0,0,0); P.g.add(p.prop); }
  P.g.position.set(p.x, p.y, p.z); P.g.rotation.y=p.yaw||0;
  G.people.push(p); return p; }
/* one step of a walker along its path; true while it is moving. A walker goes as 14b's do: it stops for you, bends
   its line round anything solid in its way (14b's _hitAt: a table, a post, a parked car, one of 14b's people) and round
   the rest of its crowd, never sets foot in the lake or out of its group's bounds, and stands on whatever floor is
   under it. Held up too long short of a point, it gives the point up and makes for the next. (Something that drives,
   the baler, keeps its own: it yields, and its rig is its own collider.) */
function _crowdHit(p, G, x, z, k){
  const r=BODY_R*(k||1), y=p.y;
  if(G.bounds && (x<G.bounds.x0 || x>G.bounds.x1 || z<G.bounds.z0 || z>G.bounds.z1)) return true;
  if(WATER_Y!==null && Terrain.lakeSD(x, z)<0.8 && (p.yAt ? p.yAt(x, z) : surfaceY(x, z, y+0.45))<WATER_Y+0.15) return true;
  if(_hitAt(x, z, y, r, null)) return true;
  for(const o of G.people) if(o!==p && o.P.g.visible && Math.abs(o.y-y)<1.2 && (o.x-x)*(o.x-x)+(o.z-z)*(o.z-z)<(r+BODY_R*0.8)*(r+BODY_R*0.8)) return true;
  return false; }
function _crowdNext(p){ const P=p.path, n=P.length, q=P[p.i];
  if(q[3]) p.wait=q[3];
  if(p.loop) p.i=(p.i+1)%n;
  else { if(p.i+p.dir<0 || p.i+p.dir>=n) p.dir=-p.dir; p.i+=p.dir; }
  p.stuck=0; p.wpT=0; }
function _crowdWalk(p, dt, G){
  if(p.wait>0){ p.wait-=dt; return false; }
  const q=p.path[p.i], dx=q[0]-p.x, dz=q[1]-p.z, d=Math.hypot(dx,dz);
  let sp=p.speed||1.25;
  const floor=(x, z)=>p.yAt ? p.yAt(x, z) : q[2]!==undefined ? q[2] : surfaceY(x, z, p.y+0.45);
  if(p.job==="drive"){                                           // (the baler: straight on its line, as it always went)
    if(d<0.05){ _crowdNext(p); return false; }
    const s=Math.min(d, sp*dt); p.x+=dx/d*s; p.z+=dz/d*s; p.y=floor(p.x, p.z);
    let dy=Math.atan2(dx, dz)-p.yawS; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2; p.yawS+=dy*Math.min(1, dt*6);
    p.ph=(p.ph+dt*sp/(p.run ? 2.2 : 1.35))%1; return true; }
  p.wpT=(p.wpT||0)+dt;
  if(d<0.08 || (d<0.9 && (p.stuck||0)>0.8) || (d<2.5 && p.wpT>14)){ _crowdNext(p); return false; }
  // you, in the way: they stop for you
  if(!driving && !droneMode){ const px=player.pos.x-p.x, pz=player.pos.z-p.z;
    if(px*px+pz*pz<1.25*1.25 && px*dx+pz*dz>0 && Math.abs(player.feetY-p.y)<1.2) sp=0; }
  // look a stride ahead; if that is blocked, bend toward the side already chosen, then the other
  let want=Math.atan2(dx, dz); const look=Math.min(0.7, d);
  const free=a=>!_crowdHit(p, G, p.x+Math.sin(a)*look, p.z+Math.cos(a)*look) && !_crowdHit(p, G, p.x+Math.sin(a)*look*0.5, p.z+Math.cos(a)*look*0.5);
  const loose=(p.stuck||0)>1.5 || _crowdHit(p, G, p.x, p.z, 0.8);
  if(sp>0 && !loose && !free(want)){ const side=p.side||1; let found=false;
    bend: for(const k of [1,2,3,4,5,6]) for(const sd of [side,-side]){ const a=want+sd*k*0.28; if(free(a)){ want=a; p.side=sd; found=true; break bend; } }
    if(!found){ sp=0; p.stuck=(p.stuck||0)+dt; } }
  else if(p.side && Math.random()<dt*0.5) p.side=0;
  let dy=want-p.yawS; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2; p.yawS+=dy*Math.min(1, dt*6);
  const s=Math.min(d, sp*dt); if(s<=0) return false;
  const nx=p.x+Math.sin(want)*s, nz=p.z+Math.cos(want)*s;
  if(!loose && _crowdHit(p, G, nx, nz, 0.9)){ p.stuck=(p.stuck||0)+dt; return false; }          // (never into anything: wait instead)
  p.stuck=Math.max(0, (p.stuck||0)-dt*0.5);
  p.x=nx; p.z=nz; p.y=floor(p.x, p.z);
  p.ph=(p.ph+dt*sp/(p.run ? 2.2 : 1.35))%1;
  return true; }
const _dZ=new T.Vector3();
/* a hand to a point: a two-bone arm turned so the hand is at T (in the spine's frame, where anything a job holds on the
   spine is too), the elbow toward pole. sh/el are the arm's bones; the upper arm is 0.28 h, the forearm to the middle
   of the hand 0.275 h. (Mind the rig: the bones named R are at +x, which on a body facing +z is its left.) */
const _ikT=new T.Vector3(), _ikE=new T.Vector3(), _ikP=new T.Vector3(), _ikX=new T.Vector3(), _ikY=new T.Vector3(), _ikZ=new T.Vector3(), _ikM=new T.Matrix4();
function _armTo(P, sh, el, T3, pole){
  const B=P.B, L1=0.28*P.h, L2=0.275*P.h;
  _ikT.copy(T3).sub(B[sh].position); let d=_ikT.length(); _ikT.divideScalar(d||1);
  d=clamp(d, Math.abs(L1-L2)+1e-3, L1+L2-1e-3);
  const a=(L1*L1-L2*L2+d*d)/(2*d), hh=Math.sqrt(Math.max(0, L1*L1-a*a));
  _ikP.copy(pole).addScaledVector(_ikT, -pole.dot(_ikT)).normalize();
  _ikE.copy(_ikT).multiplyScalar(a).addScaledVector(_ikP, hh);                       // the elbow, from the shoulder
  const bend=Math.PI-Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2), -1, 1));
  _ikY.copy(_ikE).normalize().negate();                                              // the upper arm hangs down its own −y
  _ikZ.copy(_ikT).multiplyScalar(d).sub(_ikE); _ikZ.addScaledVector(_ikY, -_ikZ.dot(_ikY)).normalize();   // and its +z is where the forearm bends
  _ikX.crossVectors(_ikY, _ikZ);
  B[sh].quaternion.setFromRotationMatrix(_ikM.makeBasis(_ikX, _ikY, _ikZ));
  B[el].rotation.set(-bend, 0, 0); }
const _gtS=new T.Vector3(), _gtF=new T.Vector3(), _gtPS=new T.Vector3(-1, 0.45, -0.45).normalize(), _gtPF=new T.Vector3(0.45, -1, -0.3).normalize();
function _crowdPose(p, now, moving){
  const P=p.P, B=P.B, J=P.j, t=p.t, m=p.mode;
  if(m==="walk") poseP(P, moving ? "walk" : "stand", p.ph, now);
  else if(m==="sit") poseP(P, "sit", 0, now);
  else if(m==="phone" || m==="read") poseP(P, m, 0, now);
  else poseP(P, "stand", 0, now);
  if(m==="walk" && moving && p.run){ B[J.spine].rotation.x=0.14; B[J.elL].rotation.x=B[J.elR].rotation.x=-1.4;
    B[J.knL].rotation.x*=1.4; B[J.knR].rotation.x*=1.4; B[J.root].position.y+=Math.abs(Math.cos(p.ph*Math.PI*2))*0.03; }
  if(p.sitY!==undefined && m==="sit") B[J.root].position.y=p.sitY;
  // a drink: up to the mouth for a moment every so often
  p.sip=0;
  if(p.drink){ const c=(t*0.09+P.seed)%1, up=smoothstep(0,0.08,c)*(1-smoothstep(0.16,0.24,c));
    B[J.shR].rotation.set(-0.45-up*0.95, -up*0.55, 0.12-up*0.10); B[J.elR].rotation.set(-1.15-up*0.95, up*0.6, 0);
    B[J.head].rotation.x=-0.12*up; p.sip=up; }
  const k=p.job;
  // (laid back in a recliner, the footrest out: the back leant into the chair's, the legs out along the rest, the eyes still ahead)
  if(k==="recline"){ B[J.spine].rotation.x=-0.30; B[J.head].rotation.x+=0.24; B[J.hpL].rotation.x=B[J.hpR].rotation.x=-1.40; B[J.knL].rotation.x=B[J.knR].rotation.x=0.30; }
  if(k==="wash"){ const a=t*2.6; B[J.shR].rotation.set(-1.15+Math.sin(a)*0.25, 0, 0.25+Math.cos(a)*0.25); B[J.elR].rotation.x=-0.5; B[J.spine].rotation.x=0.28; B[J.head].rotation.x=0.2; }
  else if(k==="water"){ B[J.shR].rotation.set(-0.85, 0.2, 0); B[J.elR].rotation.x=-0.25+Math.sin(t*0.7)*0.08; B[J.head].rotation.x=0.35; B[J.spine].rotation.y=Math.sin(t*0.4)*0.25; }
  else if(k==="kneel"){ B[J.root].position.y=0.34; B[J.hpL].rotation.x=B[J.hpR].rotation.x=-0.25; B[J.knL].rotation.x=B[J.knR].rotation.x=2.0;
    B[J.spine].rotation.x=0.55; B[J.shL].rotation.x=-0.9+Math.sin(t*2.1)*0.2; B[J.shR].rotation.x=-0.8+Math.sin(t*1.7+1)*0.25; B[J.elL].rotation.x=B[J.elR].rotation.x=-0.3; B[J.head].rotation.x=0.3; }
  else if(k==="fish"){ const jig=p.jig||0;                                // (the rod hand at his belt, the other resting on the grip by it)
    B[J.shR].rotation.set(-0.42-jig*0.9, 0, 0.10); B[J.elR].rotation.set(-0.95-jig*0.5, 0, 0);
    B[J.shL].rotation.set(-0.48-jig*0.6, 0.35, -0.05); B[J.elL].rotation.set(-1.25-jig*0.4, 0, 0); B[J.head].rotation.y*=0.25; B[J.head].rotation.x=0.18; }
  else if(k==="pour"){ const c=(t*0.12+P.seed)%1, up=smoothstep(0.0,0.1,c)*(1-smoothstep(0.35,0.45,c)); B[J.shR].rotation.set(-0.35-up*0.7, 0, 0.1); B[J.elR].rotation.x=-0.6-up*0.4; B[J.head].rotation.x=0.18*up; B[J.head].rotation.y*=1-up; }
  else if(k==="tray"){ B[J.shL].rotation.set(-0.35, 0, -0.25); B[J.elL].rotation.set(-1.5, 0, 0); }
  else if(k==="mow"){ B[J.shL].rotation.x=B[J.shR].rotation.x=-0.55; B[J.elL].rotation.x=B[J.elR].rotation.x=-0.55; B[J.spine].rotation.x=0.12; }
  else if(k==="talk"){ B[J.head].rotation.y=Math.sin(t*0.5+P.seed)*0.15; const g=Math.max(0, Math.sin(t*1.3+P.seed*3)); B[J.shR].rotation.set(-0.3-g*0.5, 0, 0.25); B[J.elR].rotation.x=-0.9-g*0.6; }
  else if(k==="toss"){ const c=p.cornSwing!==undefined ? p.cornSwing : (t*0.16+P.seed)%1, sw=smoothstep(0.0,0.25,c)*(1-smoothstep(0.3,0.42,c)); B[J.shR].rotation.set(0.6-sw*1.9, 0, 0.12); B[J.elR].rotation.x=-0.2-sw*0.2; B[J.spine].rotation.x=0.1*sw; B[J.knL].rotation.x=0.25*sw; }
  else if(k==="watch"){ B[J.shL].rotation.set(0.15, 0, -0.35); B[J.shR].rotation.set(0.15, 0, 0.35); B[J.elL].rotation.x=B[J.elR].rotation.x=-1.9; }
  else if(k==="pump"){ B[J.shR].rotation.set(-0.95, 0, 0.18); B[J.elR].rotation.x=-0.35; B[J.head].rotation.x=0.22; B[J.head].rotation.y=Math.sin(t*0.3+P.seed)*0.5;
    B[J.shL].rotation.set(0.05, 0, -0.12); }
  else if(k==="drive"){ const look=smoothstep(0.82, 0.95, Math.sin(t*0.21+P.seed)*0.5+0.5);    // (over the shoulder at the baler, now and then)
    B[J.shL].rotation.set(-1.05, 0, -0.15); B[J.shR].rotation.set(-1.05+look*0.6, 0, 0.15); B[J.elL].rotation.x=-0.75; B[J.elR].rotation.x=-0.75+look*0.5;
    B[J.head].rotation.y=look*1.35; B[J.spine].rotation.y=look*0.35; }
  else if(k==="mourn"){ B[J.head].rotation.x=0.42; B[J.shL].rotation.set(-0.35, 0, 0.35); B[J.shR].rotation.set(-0.35, 0, -0.35); B[J.elL].rotation.x=B[J.elR].rotation.x=-1.05; }
  else if(k==="throw"){                                         // (14t's fetch: throwK through the throw, bendK down for the ball)
    const c=p.throwK, b=p.bendK||0;
    if(c!==undefined){ let sx, el, tw;
      if(c<0.45){ const u=smoothstep(0, 0.45, c); sx=-0.1-2.6*u; el=-0.2-1.3*u; tw=-0.35*u; }
      else if(c<0.6){ const u=smoothstep(0.45, 0.6, c); sx=-2.7+1.8*u; el=-1.5+1.4*u; tw=-0.35+0.65*u; }
      else { const u=smoothstep(0.6, 1.0, c); sx=-0.9+0.8*u; el=-0.1-0.1*u; tw=0.3*(1-u); }
      B[J.shR].rotation.set(sx, 0, 0.15); B[J.elR].rotation.set(el, 0, 0); B[J.spine].rotation.y=tw; B[J.head].rotation.y=0; B[J.head].rotation.x=-0.1; }
    if(b>0){ B[J.spine].rotation.x=0.95*b; B[J.head].rotation.x=0.2*b; B[J.hpL].rotation.x=B[J.hpR].rotation.x=-0.35*b; B[J.knL].rotation.x=B[J.knR].rotation.x=0.45*b;
      B[J.root].position.y-=0.10*b; B[J.shR].rotation.set(-0.9*b, 0, 0.05); B[J.elR].rotation.x=-0.2*b; } }
  else if(k==="strum"){
    /* playing it, right-handed (the world puts p.guitar on his spine, across his right thigh, the neck up to his left): the
       right hand sweeps down and up across the strings over the sound hole, two strokes to the beat, harder on the one;
       the left hand holds the neck round the third fret and moves up it and back for the chord changes; he looks down
       at the frets, nodding a little in time */
    const G=p.guitar;
    if(G){ G.updateMatrix();
      const beat=t*1.7+P.seed, ph=beat%1, stroke=Math.cos(ph*Math.PI*2)*(ph<0.5 ? 0.062 : 0.048);
      _gtS.set(-0.02, stroke, 0.11).applyMatrix4(G.matrix); _armTo(P, J.shL, J.elL, _gtS, _gtPS);
      const bar=Math.floor(beat/4), slide=[0, 0.05, -0.03, 0.08][(bar+((P.seed*7)|0))%4], go=smoothstep(0, 0.12, (beat/4)%1);
      const fx=-0.60-[0.08, 0, 0.05, -0.03][(bar+3+((P.seed*7)|0))%4]*(1-go)-slide*go;
      _gtF.set(fx, 0.0, -0.035).applyMatrix4(G.matrix); _armTo(P, J.shR, J.elR, _gtF, _gtPF); }
    B[J.head].rotation.set(0.32+Math.max(0, Math.sin(t*1.7*Math.PI*2+P.seed))*0.05, 0.38+Math.sin(t*0.4+P.seed)*0.06, 0.08); }
  else if(k==="hang"){ const c=(t*0.11+P.seed)%1, up=smoothstep(0.08, 0.22, c)*(1-smoothstep(0.62, 0.78, c)), dn=smoothstep(0.82, 0.9, c)*(1-smoothstep(0.94, 1.0, c));
    B[J.shL].rotation.set(-0.3-up*2.35, 0, -0.1); B[J.shR].rotation.set(-0.3-up*2.35, 0, 0.1); B[J.elL].rotation.x=B[J.elR].rotation.x=-0.4+up*0.25;
    B[J.head].rotation.x=-0.35*up+0.5*dn; B[J.spine].rotation.x=0.7*dn; if(p.heldG) p.heldG.visible=c<0.7; }
}
function _crowdDog(p, dt, moving){
  // out ahead on the lead to one side, or the other side, or at heel behind, whichever is clear: a dog goes round a
  // fence or a mailbox, not through it, and never takes a step into anything solid (unless it is a long way behind)
  const D=p.D; let ex=0, ez=0;
  for(const [a, r] of [[0.6, 1.4], [-0.6, 1.4], [Math.PI, 0.9]]){ ex=p.x+Math.sin(p.yawS+a)*r; ez=p.z+Math.cos(p.yawS+a)*r; if(!_hitAt(ex, ez, p.y, 0.3, null)) break; }
  const dx=ex-p.dx, dz=ez-p.dz, d=Math.hypot(dx,dz);
  if(d>0.05){ const s=Math.min(d, Math.max(0.6, d*2.2)*dt), nx=p.dx+dx/d*s, nz=p.dz+dz/d*s;
    if(d>4 || !_hitAt(nx, nz, p.y, 0.25, null)){ p.dx=nx; p.dz=nz; }
    D.g.rotation.y=Math.atan2(dx,dz); }
  D.g.position.set(p.dx, surfaceY(p.dx, p.dz, p.y+0.4), p.dz);
  const a=CROWD.t*9; D.legs.forEach((b,k)=>{ D.B[b].rotation.x=moving ? Math.sin(a+(k===0||k===3 ? 0 : Math.PI))*0.5 : 0; });
  D.B[D.tail].rotation.z=Math.sin(CROWD.t*(moving?10:4))*0.4; }
function updateCrowd(dt, now, dark){
  CROWD.t+=dt; const c=camera.position;
  for(const G of CROWD.groups){
    const d=Math.hypot(c.x-G.cx, c.z-G.cz), show=d<G.r;
    if(show!==G.shown){ G.shown=show; for(const p of G.people){ p.P.g.visible=show && (!p.dayOnly || dark<0.6) && (!p.when || p.when(p)); if(p.D) p.D.g.visible=p.P.g.visible; if(p.onShow) p.onShow(p, p.P.g.visible); } }
    if(!show) continue;
    for(const p of G.people){
      // the yards empty after dark: those who are only out by day go in
      const out=(!p.dayOnly || dark<0.6) && (!p.when || p.when(p)); if(p.P.g.visible!==out){ p.P.g.visible=out; if(p.D) p.D.g.visible=out; if(p.onShow) p.onShow(p, out); }
      if(!out) continue;
      p.t+=dt; let moving=false;
      if(p.path && !(p.yield && p.yield(p))) moving=_crowdWalk(p, dt, G);          // (yield: something that drives stops for you)
      if(d<70 || (CROWD.t*7+p.P.seed)%1<0.34){                 // (past seventy metres, a third of the frames)
        p.P.g.position.set(p.x, p.y, p.z); p.P.g.rotation.y=p.path ? p.yawS : (p.yaw||0);
        _crowdPose(p, now, moving);
        // (sway: they turn to look about from the waist, their feet and their chair staying where they are)
        if(p.sway && !p.path){ const s=Math.sin(p.t*0.3+p.P.seed)*p.sway; p.P.B[p.P.j.spine].rotation.y+=s*0.45; p.P.B[p.P.j.head].rotation.y+=s*0.55; }
        if(p.heldG && _HELD_UP[p.held]) levelHeld(p.heldG, p.P, DRINK_TIP*p.sip);    // (a drink stands up in the hand, 14b)
        else if(p.held==="rod") levelHeld(p.heldG, p.P, 0.86-(p.jig||0));             // (the rod out and up over the water)
        if(p.D) _crowdDog(p, dt, moving); }
      if(p.tick) p.tick(p, dt, moving); } }
}
// a thing to carry about or ride, built of boxes and cylinders as one vertex-coloured mesh: a mower, a chair, a tractor
function crowdProp(build){
  const ME=[], ent=(geo,x,y,z,c,rx,ry,rz)=>ME.push({geo:geo, matrix:new T.Matrix4().compose(V3(x,y,z),
    new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0,"YXZ")), V3(1,1,1)), color:new T.Color(c)});
  build(ent, (w,h,d,x,y,z,c,rx,ry)=>ent(boxGeo(w,h,d),x,y,z,c,rx,ry), (r,h,x,y,z,c,seg,rx,ry,rz)=>ent(new T.CylinderGeometry(r,r,h,seg||12),x,y,z,c,rx,ry,rz));
  const m=new T.Mesh(mergeEntries(ME), new T.MeshStandardMaterial({vertexColors:true, roughness:0.55, metalness:0.2})); m.castShadow=true; return m; }
// a path's corners rounded off at radius R (less where a leg is short), so that whatever drives it turns and does
// not pivot; a point straight on between its neighbours is kept as it is, its pause with it
function crowdRound(pts, R, closed){
  const out=[], n=pts.length;
  for(let i=0;i<n;i++){ const p=pts[i];
    if(!closed && (i===0 || i===n-1)){ out.push(p); continue; }
    const a=pts[(i-1+n)%n], b=pts[(i+1)%n], ax=p[0]-a[0], az=p[1]-a[1], la=Math.hypot(ax,az), bx=b[0]-p[0], bz=b[1]-p[1], lb=Math.hypot(bx,bz);
    if(Math.abs(ax*bz-az*bx)<1e-6*la*lb){ out.push(p); continue; }
    const r=Math.min(R, la/2, lb/2), s0=[p[0]-ax/la*r, p[1]-az/la*r], e=[p[0]+bx/lb*r, p[1]+bz/lb*r];
    for(let k=0;k<=8;k++){ const t=k/8, u=1-t; out.push([u*u*s0[0]+2*u*t*p[0]+t*t*e[0], u*u*s0[1]+2*u*t*p[1]+t*t*e[1]]); } }
  return out; }
