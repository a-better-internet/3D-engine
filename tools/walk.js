/* ENGINE · tools/walk.js
   Walks polylines the way the player does — surface height carried along,
   the body tested against every collider — and names the first thing that
   stops it. Then the stairs with the real controller and the keys held, at
   walk, run and sprint; every seat (sit, and get up again somewhere free);
   every ladder; every warp place.
     NODE_PATH=/opt/node22/lib/node_modules node tools/walk.js
   ONLY=regex walks just the routes, seats, stairs and ladders whose names match.
   PAGE=other.html walks another world's page.

   The routes come from the page:
     WORLD_ROUTES = { "name": [[x,z],...] | {pts:[[x,z],...], gate:true, y0} }
       gate:true has every manual door open (and every self-opening door open);
       otherwise manual doors are shut, so a route through one fails.
     WORLD_STAIRS = [{name, up:[[x,z],...], lo, hi}]   walked up from lo and back down
   Every doorway in a world should be on one of its routes. The walker is a
   square ±0.34 m across, not a circle, so give corners room. */
const path=require("path"); const { chromium } = require("playwright");
const ROOT=path.resolve(__dirname,"..");
const THREE_JS=process.env.THREE_JS || path.join(ROOT,"tools","three.min.js");
(async()=>{
  const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const p=await b.newPage({viewport:{width:320,height:200}});
  p.on("pageerror", e=>console.log("[pageerror]", e.message));
  await p.route("**/three.min.js", r=>r.fulfill({path:THREE_JS}));
  await p.route(/fonts\./, r=>r.fulfill({status:200, contentType:"text/css", body:""}));
  await p.goto("file://"+path.join(ROOT, process.env.PAGE||"index.html"), {timeout:240000});
  await p.waitForFunction(()=>window.REST,null,{timeout:180000});
  const out=await p.evaluate((only)=>{
    const ROUTES=(typeof WORLD_ROUTES!=="undefined") ? WORLD_ROUTES : {}, STAIRS=(typeof WORLD_STAIRS!=="undefined") ? WORLD_STAIRS : [];
    const res={}, ONLY=only ? new RegExp(only, "i") : null, want=n=>!ONLY || ONLY.test(n);
    const PACES=n=>want(n) ? [[null,"walk"],["ShiftLeft","run"],["KeyQ","sprint"]] : [];
    const hit=(x,z,f)=>{
      const lo=f+0.12, hi=f+1.72, r=0.34, all=REST.cols.concat(REST.colsDyn);
      return all.filter(c=>x>c.x0-r&&x<c.x1+r&&z>c.z0-r&&z<c.z1+r&&hi>c.y0&&lo<c.y1)
                .map(c=>"["+[c.x0,c.x1,c.z0,c.z1,c.y0,c.y1].map(v=>v.toFixed(2)).join(",")+"]");
    };
    const doors=(open)=>{ for(const d of REST.doors) if(d.manualOnly){ d.manual = open ? 1 : 0; d.open = open ? 1 : 0;
        if(d.blockCol) d.blockCol.y1 = open ? d.blockCol.y0-1 : d.blockTop; }
        else if(d.blockCol){ d.open=1; d.blockCol.y1=d.blockCol.y0-1; } };
    for(const name in ROUTES){ if(!want(name)) continue;
      const R0=ROUTES[name], P=Array.isArray(R0) ? R0 : R0.pts;
      doors(!!R0.gate);
      let f=REST.surf(P[0][0],P[0][1],R0.y0!==undefined ? R0.y0 : REST.terrain.groundAt(P[0][0],P[0][1])+0.2), msg="ok", minY=1e9, maxY=-1e9;
      outer: for(let i=1;i<P.length;i++){
        const [x0,z0]=P[i-1], [x1,z1]=P[i], L=Math.hypot(x1-x0,z1-z0), n=Math.max(1,Math.ceil(L/0.08));
        for(let k=0;k<=n;k++){
          const x=x0+(x1-x0)*k/n, z=z0+(z1-z0)*k/n;
          const t=REST.surf(x,z,f);
          if(t-f>STEP_UP){ msg="step too high at "+x.toFixed(2)+","+z.toFixed(2)+" ("+f.toFixed(2)+"→"+t.toFixed(2)+")"; break outer; }
          f=t; minY=Math.min(minY,f); maxY=Math.max(maxY,f);
          if(REST.probe(x,z,f)){ msg="BLOCKED at "+x.toFixed(2)+","+z.toFixed(2)+" y "+f.toFixed(2)+" by "+hit(x,z,f).join(" "); break outer; }
        }
      }
      res[name]=msg+"   (floor "+minY.toFixed(2)+".."+maxY.toFixed(2)+")";
    }
    doors(true);
    // every seat: can you sit, and get up again somewhere free?
    const started0=started; started=true;
    let bad=[];
    if(want("seats")) REST.seats.forEach((s)=>{ REST.go(s.x+Math.sin(s.yaw)*0.9, s.z+Math.cos(s.yaw)*0.9, s.yaw, s.y);
      REST.sit(); REST.sim(40); REST.keys.KeyW=false; REST.sit(); REST.sim(5);
      if(REST.probe(REST.player.pos.x, REST.player.pos.z, REST.player.feetY)) bad.push(s.label+" @"+s.x.toFixed(1)+","+s.z.toFixed(1)); });
    if(want("seats")) res["seats ("+REST.seats.length+")"]= bad.length ? "stuck after: "+bad.join("; ") : "ok";
    // the stairs with the real controller and the keys held down, at every pace
    const drive=(P, mod, y0)=>{
      REST.go(P[0][0],P[0][1],0,y0); for(const k in REST.keys) REST.keys[k]=false; if(mod) REST.keys[mod]=true;
      let top=-1e9, low=1e9;
      for(let i=1;i<P.length;i++){ let t=0, last=1e9;
        for(;;){ const dx=P[i][0]-REST.player.pos.x, dz=P[i][1]-REST.player.pos.z, d=Math.hypot(dx,dz);
          if(d<0.12) break;
          REST.player.yaw=Math.atan2(-dx,-dz); REST.keys.KeyW=true; REST.sim(1); t++;
          top=Math.max(top, REST.player.feetY); low=Math.min(low, REST.player.feetY);
          if(t%30===0){ if(last-d<0.02 || t>1200){ for(const k in REST.keys) REST.keys[k]=false;
            return "stuck at "+REST.player.pos.x.toFixed(2)+","+REST.player.pos.z.toFixed(2)+" y "+REST.player.feetY.toFixed(2); } last=d; } } }
      for(const k in REST.keys) REST.keys[k]=false;
      return {top:top, low:low};
    };
    for(const S of STAIRS){ const UPh=S.up, DNh=UPh.slice().reverse();
      for(const [m,lab] of PACES(S.name)){
        const u=drive(UPh,m,S.lo); REST.sim(40); const hi=REST.player.feetY, d=drive(DNh,m,hi); REST.sim(40);
        res[S.name+", keys held ("+lab+")"] = typeof u==="string" ? "up: "+u : hi<S.hi-0.1 ? "up: never reached the top ("+hi.toFixed(2)+")"
                                         : typeof d==="string" ? "down: "+d : REST.player.feetY>S.lo+0.1 ? "down: still up at "+REST.player.feetY.toFixed(2) : "ok"; } }
    // every ladder (06's addLadder): E at its foot, W to the top and off it, then E there and S back down
    for(const L of (typeof LADDERS!=="undefined" ? LADDERS : [])){ const nm=L.label.toLowerCase().replace(/ ladder$/, "")+" ladder, keys held";
      for(const [m,lab] of PACES(nm)){
        for(const k in REST.keys) REST.keys[k]=false;
        REST.go(L.out.x, L.out.z, L.yaw, L.y0); REST.sim(10); interact();
        if(!REST.player.ladder){ res[nm+" ("+lab+")"]="E at the foot did nothing"; continue; }
        if(m) REST.keys[m]=true; REST.keys.KeyW=true; let t=0; while(REST.player.ladder && t<60*40){ REST.sim(1); t++; }
        REST.keys.KeyW=false; REST.sim(20); const top=REST.player.feetY, stuckTop=REST.probe(REST.player.pos.x, REST.player.pos.z, top);
        interact(); const onDown=!!REST.player.ladder;
        REST.keys.KeyS=true; t=0; while(REST.player.ladder && t<60*40){ REST.sim(1); t++; }
        for(const k in REST.keys) REST.keys[k]=false; REST.sim(20); const bot=REST.player.feetY;
        res[nm+" ("+lab+")"] = top<L.top.y-0.1 ? "up: never reached the top ("+top.toFixed(2)+")" : stuckTop ? "up: stuck where it left you"
          : !onDown ? "E at the top did nothing" : bot>L.y0+0.3 ? "down: still up at "+bot.toFixed(2)
          : REST.probe(REST.player.pos.x, REST.player.pos.z, bot) ? "down: stuck at the foot" : "ok"; } }
    started=started0;
    // every place on the warp list (06c): put down on a floor, clear of everything, and still on it a second later
    if(typeof WARP!=="undefined" && want("warps")){ const badW=[];
      WARP.places.forEach((pl, i)=>{ WARP.go(i); const y0=REST.player.feetY;
        if(REST.probe(REST.player.pos.x, REST.player.pos.z, y0)) badW.push(pl[0]+" (in something)");
        else { REST.sim(60); if(Math.abs(REST.player.feetY-y0)>0.3) badW.push(pl[0]+" (fell to "+REST.player.feetY.toFixed(2)+")"); } });
      res["warps ("+WARP.places.length+")"]= badW.length ? "bad: "+badW.join("; ") : "ok"; }
    return res;
  }, process.env.ONLY||"");
  let fails=0;
  for(const k in out){ const ok=/^ok/.test(out[k]); if(!ok) fails++; console.log((ok?"  ok  ":"  FAIL")+"  "+k.padEnd(44)+" "+out[k]); }
  console.log(fails ? fails+" failed" : "all clear");
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(1); });
