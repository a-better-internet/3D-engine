"use strict";
/* ENGINE · 10b-cars.js
   the car constants and the parked cars you can drive
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   10 · PARKED CARS
   Every car put down with parkCar is drivable, anywhere: a group of its own
   (body, glass, four wheels that steer and roll) with a collider that moves
   with it. kind: 0 sedan · 1 SUV · 2 pickup · 3 minivan (CAR_PAINTS for a
   colour). Trucks (4 box truck, 5 tractor-trailer, 6 reefer, 7 flatbed) are
   scenery: buildVehicleMesh / standingVehicle and a collider.
     parkCar(x, z, yaw, kind, paint, y0)      y0: the paving's top (default the ground there)
   Close to, a car's glass is see-through onto the cabin carParts builds.
   Anything put inside a car stands clear of the glass and the roof.
   TRAFFIC is for a world's moving traffic: each {col, dir, speed, big,
   swayV, slow} is struck by a car you drive (11-driving), and its col is
   in COL_TRAF so it blocks cars and not people.
   ---------------------------------------------------------------------- */
const TRAFFIC=[];
const CARS=[];
let driving=null;
/* Tuning, unchanged from the engine: the parked cars stand at exactly the
   height the springs will hold them at, so nothing jumps when you get in. */
const CARC={ mass:1200, engineForce:9000, brakeConstant:12000, dragConstant:5.0,
             rollingResist:15.0, corneringFront:-5.0, corneringRear:-5.2,
             maxGrip:2.6, maxSteer:0.42, steerSpeedBias:40,
             restLength:0.34, springK:34000, damping:4200, wheelRadius:0.36,
             gravity:9.81 };
const CAR_WHEEL_Y=-0.35;
const CAR_SAG=CARC.mass*CARC.gravity/(4*CARC.springK);
const CAR_RIDE=(CARC.restLength-CAR_SAG+CARC.wheelRadius)-CAR_WHEEL_Y;

function parkCar(x, z, yaw, kind, paint, y0){
  const parts=vehicleParts(kind, paint), far=vehicleParts(kind, paint, null, 0, true), S=parts.spec;
  const base=(y0===undefined ? groundY(x, z) : y0);
  const g=new T.Group();
  const shift=new T.Matrix4().makeTranslation(0, -CAR_RIDE, 0);
  const sh=L=>L.map(e=>({geo:e.geo, matrix:shift.clone().multiply(e.matrix), color:e.color}));
  // near: the full shell; far: the coarse one. updateParkedLOD swaps them
  const near=new T.Group(), farG=new T.Group();
  const body=new T.Mesh(mergeEntries(sh(parts.OP)), VEH_MAT); body.castShadow=true; body.receiveShadow=true;
  near.add(body); near.add(new T.Mesh(mergeEntries(sh(parts.GL)), parts.glassMat||VEH_GLASS));
  const fb=new T.Mesh(mergeEntries(sh(far.OP)), VEH_MAT); fb.castShadow=true;
  farG.add(fb); farG.add(new T.Mesh(mergeEntries(sh(far.GL)), VEH_GLASS));
  farG.visible=false;
  g.add(near); g.add(farG);
  const wheels=[], wg=wheelGeoCached(S.wr, S.tw, false), wf=wheelFarGeo(S.wr, S.tw, false);
  const REST_DROP=S.wr-CAR_RIDE;
  for(const w of [[-S.track, S.axles[0]],[S.track, S.axles[0]],[-S.track, S.axles[1]],[S.track, S.axles[1]]]){
    const wm=new T.Mesh(wg, VEH_MAT);
    wm.rotation.order="YXZ";
    wm.position.set(w[0], REST_DROP, w[1]);
    g.add(wm); wheels.push(wm);
  }
  g.position.set(x, base+CAR_RIDE, z);
  g.rotation.y=yaw;
  scene.add(g);
  const hx=Math.abs(Math.cos(yaw))*(S.hw+0.08)+Math.abs(Math.sin(yaw))*(S.len/2);
  const hz=Math.abs(Math.sin(yaw))*(S.hw+0.08)+Math.abs(Math.cos(yaw))*(S.len/2);
  const cc={x0:x-hx, x1:x+hx, z0:z-hz, z1:z+hz, y0:base, y1:base+S.ht};
  COL_DYN.push(cc);
  const car={g:g, wheels:wheels, kind:kind, col:cc, home:{x:x, z:z, yaw:yaw}, veh:null, spin:0,
             lod:{near:near, far:farG, wg:wg, wf:wf, isNear:true}};
  CARS.push(car);
  return car;
}
// the lot's cars past fifty metres are drawn coarse, wheels and all
function updateParkedLOD(cam){
  for(const c of CARS){
    const L=c.lod, dx=c.g.position.x-cam.x, dz=c.g.position.z-cam.z;
    const nr = c===driving || dx*dx+dz*dz < (L.isNear?56*56:50*50);
    if(nr===L.isNear) continue;
    L.isNear=nr; L.near.visible=nr; L.far.visible=!nr;
    for(const w of c.wheels) w.geometry=nr?L.wg:L.wf;
  }
}
