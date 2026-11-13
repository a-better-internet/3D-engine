"use strict";
/* ENGINE · 06b-audio.js
   the sound of the place, synthesised: wind in the crowns, birds by day and
   insects by night, rain outdoors and on the roof, thunder, the hum
   indoors, positional sources a world adds (a hum, running water, a fire,
   an engine), and a library of one-shots
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. */
/* ----------------------------------------------------------------------
   06b · AMBIENCE
   Nothing is recorded; every sound is built from noise and oscillators
   when the page starts, the same way every texture is drawn. It starts on
   the click that dismisses the boot card (browsers will not play before a
   gesture) and U turns it off and on.
   * Everything outdoors goes through one low-pass (outLP), which closes
     when you go inside an indoor zone.
   * Wind is band-passed noise that follows the same gust the crowns do,
     louder in the trees.
   * Birds are synthesised calls on a schedule, thick by day at the edge of
     the woods, gone at night; crickets and katydids are pulse trains that
     come in at dusk (WORLD.audio.birds / insects false: none).
   * Indoors the tubes hum at 120 Hz (on the main circuit).
   * AUDIO.source({x, y, z, kind, vol, reach, outdoor}) adds a positional
     loop: kind "hum" (a transformer, a fridge), "water" (a fountain, a
     creek), "fire" (a campfire's roar and crackle), "engine" (an idling
     motor; set .rpm 0..1), "noise" (a fan). Returns it; set .on false to
     silence it, or .x/.z to move it. Its level falls off past `reach`.
   * AUDIO.blip(kind, x, z, vol): a one-shot, from x,z if given. Kinds:
     door clunk thump latch slam hinge whoosh swish coin coins whirr bill
     tick tone horn airhorn bell knock drip static hiss pull bark yip meow
     tink shatter rim jingle pop hop zap boom ... (see blip below)
   * AUDIO.ctx(), master(), outLP(), noise(sec, color) for a mode's own.
   ---------------------------------------------------------------------- */
const AUDIO=(function(){
  let ctx=null, master=null, outBus=null, outLP=null, enabled=true, started=false;
  let wind={}, night={}, hum={}, rain={};
  let birdT=1.5;
  const SOURCES=[];
  try{ const v=localStorage.getItem(CFG.storageKey+".audio"); if(v==="off") enabled=false; }catch(e){}
  function noise(sec, color){
    const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
    let l=0, b0=0,b1=0,b2=0;
    for(let i=0;i<n;i++){
      const w=Math.random()*2-1;
      if(color==="brown"){ l=(l+0.02*w)/1.02; d[i]=l*3.5; }
      else if(color==="pink"){ b0=0.99765*b0+w*0.0990460; b1=0.96300*b1+w*0.2965164; b2=0.57000*b2+w*1.0526913;
                                d[i]=(b0+b1+b2+w*0.1848)*0.18; }
      else d[i]=w*0.5;
    }
    return b;
  }
  function loop(buf){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.start(); return s; }
  function start(){
    if(started) return;
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    started=true;
    master=ctx.createGain(); master.gain.value=enabled?0.75:0; master.connect(ctx.destination);
    // everything outdoors goes through one low-pass, which closes when you go inside
    outLP=ctx.createBiquadFilter(); outLP.type="lowpass"; outLP.frequency.value=16000;
    outBus=ctx.createGain(); outBus.gain.value=1; outLP.connect(outBus); outBus.connect(master);
    const pink=noise(5,"pink");
    // wind in the leaves
    wind.bp=ctx.createBiquadFilter(); wind.bp.type="bandpass"; wind.bp.frequency.value=700; wind.bp.Q.value=0.5;
    wind.g=ctx.createGain(); wind.g.gain.value=0;
    loop(pink).connect(wind.bp); wind.bp.connect(wind.g); wind.g.connect(outLP);
    /* the night: a chorus of tree crickets, the sound of a late-summer
       night, chirping more or less together a couple of times a second (each chirp a little burst of pulses, low and breathy at about
       2.7 kHz, never a pure tone); under them a ground cricket's soft
       distant trill; and now and then a katydid rasping its three
       syllables from somewhere in the trees. Everything through a low-pass:
       none of it is close. */
    night.g=ctx.createGain(); night.g.gain.value=0; night.g.connect(outLP);
    night.lp=ctx.createBiquadFilter(); night.lp.type="lowpass"; night.lp.frequency.value=3600; night.lp.Q.value=0.4; night.lp.connect(night.g);
    night.voices=[]; night.next=0; night.katT=3;
    { const nz=noise(2,"white"), bias=v=>{ const c=ctx.createConstantSource ? ctx.createConstantSource() : null; if(c){ c.offset.value=v; c.start(); } return c; };
      for(const [f,pan,lvl] of [[2640,-0.65,1.0],[2760,0.45,0.8],[2870,0.05,0.55],[2560,0.8,0.5],[2700,-0.25,0.4]]){
        const mix=ctx.createGain(); mix.gain.value=1;
        const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=f*(1+(Math.random()-0.5)*0.01);
        const og=ctx.createGain(); og.gain.value=0.25; o.connect(og); og.connect(mix); o.start();
        const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=16;
        const bg=ctx.createGain(); bg.gain.value=2.2; loop(nz).connect(bp); bp.connect(bg); bg.connect(mix);
        // the pulses inside a chirp: a soft wobble, not a gate
        const am=ctx.createGain(); am.gain.value=0;
        const lfo=ctx.createOscillator(); lfo.type="sine"; lfo.frequency.value=34+Math.random()*10;
        const lg=ctx.createGain(); lg.gain.value=0.45; lfo.connect(lg); lg.connect(am.gain); lfo.start();
        const b=bias(0.55); if(b) b.connect(am.gain); else am.gain.value=0.6;
        const env=ctx.createGain(); env.gain.value=0;
        const pn=ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if(pn.pan) pn.pan.value=pan;
        mix.connect(am); am.connect(env); env.connect(pn); pn.connect(night.lp);
        night.voices.push({env:env, lvl:lvl, lag:Math.random()*0.06}); }
      // the ground cricket: a faint continuous trill, further off
      const tb=ctx.createBiquadFilter(); tb.type="bandpass"; tb.frequency.value=3250; tb.Q.value=9;
      const tam=ctx.createGain(); tam.gain.value=0; const tl=ctx.createOscillator(); tl.frequency.value=23; const tlg=ctx.createGain(); tlg.gain.value=0.5;
      tl.connect(tlg); tlg.connect(tam.gain); tl.start(); const tbias=bias(0.5); if(tbias) tbias.connect(tam.gain);
      const tg=ctx.createGain(); tg.gain.value=0.55; loop(nz).connect(tb); tb.connect(tam); tam.connect(tg); tg.connect(night.lp);
      night.kat=ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); night.kat.connect(night.lp); }
    // the hum indoors
    hum.g=ctx.createGain(); hum.g.gain.value=0; hum.g.connect(master);
    for(const [f,a] of [[120,0.5],[240,0.18]]){ const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=f*(1+Math.random()*0.002);
      const g=ctx.createGain(); g.gain.value=a; o.connect(g); g.connect(hum.g); o.start(); }
    // rain: a hiss outdoors, and on the roof a duller drumming you hear inside
    rain.g=ctx.createGain(); rain.g.gain.value=0; rain.g.connect(outLP);
    { const hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=700;
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=7500;
      loop(pink).connect(hp); hp.connect(lp); lp.connect(rain.g); }
    rain.roof=ctx.createGain(); rain.roof.gain.value=0; rain.roof.connect(master);
    { const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=420; bp.Q.value=0.5;
      loop(noise(4,"pink")).connect(bp); bp.connect(rain.roof); }
    for(const S of SOURCES) _buildSource(S);
  }
  /* ---- positional sources ------------------------------------------------- */
  function source(o){ const S=Object.assign({x:0, y:0, z:0, kind:"hum", vol:0.05, reach:20, on:true, rpm:0}, o); SOURCES.push(S); if(ctx) _buildSource(S); return S; }
  function _buildSource(S){
    const pan=ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    S.g=ctx.createGain(); S.g.gain.value=0; S.g.connect(pan); pan.connect(S.outdoor===false ? master : outLP); S.pan=pan;
    if(S.kind==="hum"){ for(const [f,a] of [[60,0.6],[120,0.35],[180,0.15]]){ const o=ctx.createOscillator(); o.frequency.value=f*(S.pitch||1); const g=ctx.createGain(); g.gain.value=a; o.connect(g); g.connect(S.g); o.start(); } }
    else if(S.kind==="water"){ const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=1800; bp.Q.value=0.4; loop(noise(4,"white")).connect(bp); bp.connect(S.g);
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=400; const g2=ctx.createGain(); g2.gain.value=0.6; loop(noise(5,"brown")).connect(lp); lp.connect(g2); g2.connect(S.g); }
    else if(S.kind==="fire"){ const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=320; const g=ctx.createGain(); g.gain.value=0.55; loop(noise(6,"brown")).connect(lp); lp.connect(g); g.connect(S.g);
      const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=2800; bp.Q.value=0.6; const g2=ctx.createGain(); g2.gain.value=0.10; loop(noise(5,"pink")).connect(bp); bp.connect(g2); g2.connect(S.g); S.crackT=0; }
    else if(S.kind==="engine"){ S.lp=ctx.createBiquadFilter(); S.lp.type="lowpass"; S.lp.frequency.value=500; S.lp.connect(S.g); S.osc=[];
      for(const [f,a,ty] of [[26,0.6,"sawtooth"],[52,0.45,"sawtooth"],[78,0.2,"square"],[104,0.1,"sawtooth"]]){ const o=ctx.createOscillator(); o.type=ty; o.frequency.value=f*(S.pitch||1);
        const g=ctx.createGain(); g.gain.value=a*0.35; o.connect(g); g.connect(S.lp); o.start(); S.osc.push({o:o, f:f*(S.pitch||1)}); } }
    else { const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=S.freq||900; bp.Q.value=0.5; loop(noise(4,"pink")).connect(bp); bp.connect(S.g); }
  }
  const _r=new T.Vector3();
  function update(dt, dark){
    if(!ctx || !enabled) return;
    if(ctx.state==="suspended") ctx.resume();
    const cam=camera.position, t=ctx.currentTime;
    const inside=indoorsAt(cam.x, cam.z, cam.y), under=buriedAt(cam.x, cam.z, cam.y);
    outLP.frequency.setTargetAtTime(inside||under?700:16000, t, 0.15);
    outBus.gain.setTargetAtTime(under ? 0.12 : inside?0.45:1, t, 0.15);
    camera.getWorldDirection(_r);
    const rx=-_r.z, rz=_r.x;                      // the camera's right, on the ground
    // wind follows the gust, and is louder in the trees
    const inWoods=smoothstep(-4, 12, Terrain.siteDist(cam.x, cam.z));
    if(CFG.audio.wind!==false){ wind.g.gain.setTargetAtTime((0.015+Wind.gust*0.10)*(0.5+inWoods*0.8), t, 0.3);
      wind.bp.frequency.setTargetAtTime(500+Wind.gust*600, t, 0.4); }
    if(CFG.audio.insects!==false && !AUDIO.quiet){
    // the insects come in at dusk; fewer in autumn
    const nightLvl=smoothstep(0.35,0.8,dark)*(FOREST.isAutumn()?0.005:0.013);
    night.g.gain.setTargetAtTime(nightLvl, t, 0.8);
    if(nightLvl>0.0005){
      // the chirps, scheduled a little ahead: slower when it is cool
      const per=FOREST.isAutumn() ? 0.62 : 0.46;
      if(night.next<t) night.next=t+0.05;
      while(night.next<t+0.3){ const at=night.next;
        for(const v of night.voices){ const a0=at+v.lag+(Math.random()-0.5)*0.015, g=v.env.gain;
          g.setValueAtTime(0, a0); g.linearRampToValueAtTime(v.lvl, a0+0.025); g.setValueAtTime(v.lvl, a0+0.10); g.linearRampToValueAtTime(0, a0+0.16); }
        night.next+=per*(1+(Math.random()-0.5)*0.04); }
      // a katydid: ka-ty-did, or just ka-ty, from a random side
      night.katT-=dt;
      if(night.katT<=0){ night.katT=(FOREST.isAutumn()?7:2.5)+Math.random()*5;
        if(night.kat.pan) night.kat.pan.setValueAtTime(Math.random()*1.6-0.8, t);
        const f=3500+Math.random()*700, n=Math.random()<0.7?3:2, at=t+0.05, pk=0.35+Math.random()*0.4;
        for(let k=0;k<n;k++) burst(at+k*0.15, 0.06, f, 2.2, pk, night.kat); }
    }
    } else night.g.gain.setTargetAtTime(0, t, 0.5);
    // the tubes' hum indoors, while the power is on
    hum.g.gain.setTargetAtTime(inside && !AUDIO.noHum ? 0.010*circLevel("main") : 0, t, 0.2);
    // the rain
    const rn=WEATHER.rain;
    rain.g.gain.setTargetAtTime(under ? 0 : rn*(0.10+0.05*WEATHER.storm), t, 0.5);
    rain.roof.gain.setTargetAtTime(inside && !under ? rn*0.06 : 0, t, 0.4);
    // the world's sources: by distance, panned to where they are
    for(const S of SOURCES){ if(!S.g) continue;
      const dx=S.x-cam.x, dz=S.z-cam.z, d=Math.hypot(dx, dz, (S.y||cam.y)-cam.y);
      const lvl=S.on ? S.vol/(1+d*d/(S.reach*S.reach)) : 0;
      S.g.gain.setTargetAtTime(lvl, t, 0.25);
      if(S.pan.pan) S.pan.pan.setTargetAtTime(clamp((dx*rx+dz*rz)/(d+1), -0.85, 0.85), t, 0.2);
      if(S.osc) for(const q of S.osc) q.o.frequency.setTargetAtTime(q.f*(1+S.rpm*2.2), t, 0.25);
      if(S.lp) S.lp.frequency.setTargetAtTime(380+S.rpm*900, t, 0.25);
      if(S.kind==="fire" && lvl>0.002){ S.crackT-=dt; if(S.crackT<=0){ S.crackT=0.08+Math.random()*0.5; burst(t+0.01, 0.02+Math.random()*0.03, 1800+Math.random()*2400, 1.5, lvl*6, S.g); } } }
    // birds: a call every second or two by day, more at the edge of the woods
    birdT-=dt;
    if(birdT<=0){
      const day=1-dark;
      birdT=(0.8+Math.random()*2.6)/Math.max(0.15, day*(0.6+inWoods));
      if(day>0.3 && !inside && !under && CFG.audio.birds!==false && !AUDIO.quiet) bird(Math.random());
    }
  }
  function loop(buf){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.start(); return s; }
  function burst(at, dur, f, q, peak, dest){
    const s=ctx.createBufferSource(); s.buffer=_nb || (_nb=noise(0.5,"white"));
    const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=q;
    const g=ctx.createGain(); env(g, at, 0.001, peak, dur*0.3, dur);
    s.connect(bp); bp.connect(g); g.connect(dest||outLP); s.start(at, Math.random()*0.4); s.stop(at+dur*2+0.05);
  }
  let _nb=null;
  function env(g, t, a, peak, hold, rel){
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t+a);
    g.gain.setValueAtTime(peak, t+a+hold); g.gain.exponentialRampToValueAtTime(0.0001, t+a+hold+rel);
  }
  function tone(type, f0, f1, dur, peak, at, pan, dest){
    const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type;
    o.frequency.setValueAtTime(f0, at); if(f1) o.frequency.exponentialRampToValueAtTime(f1, at+dur);
    env(g, at, 0.01, peak, dur*0.6, dur*0.5);
    let n=g;
    if(ctx.createStereoPanner && pan!==undefined){ const p=ctx.createStereoPanner(); p.pan.value=pan; g.connect(p); n=p; }
    o.connect(g); n.connect(dest||outLP); o.start(at); o.stop(at+dur*1.3+0.05);
  }
  function bird(r){
    const t=ctx.currentTime+0.02, pan=Math.random()*1.6-0.8, v=0.010+Math.random()*0.012;
    if(r<0.35){                                    // a cardinal-like song: slurred whistles, cheer cheer cheer
      const n=3+((Math.random()*3)|0);
      for(let k=0;k<n;k++) tone("sine", 3600, 2100, 0.16, v, t+k*0.22, pan);
    }else if(r<0.6){                               // a chickadee: fee-bee
      tone("sine", 3900, 3850, 0.32, v*0.8, t, pan); tone("sine", 3250, 3200, 0.36, v*0.8, t+0.42, pan);
    }else if(r<0.85){                              // the wood thrush, in the woods: a flute and a trill
      const base=1600+Math.random()*900;
      tone("sine", base, base*1.02, 0.18, v*0.9, t, pan);
      tone("sine", base*1.5, base*1.48, 0.14, v*0.7, t+0.2, pan);
      for(let k=0;k<6;k++) tone("triangle", base*2.2+(k%2)*300, null, 0.04, v*0.5, t+0.38+k*0.045, pan);
    }else{                                         // a crow, a long way off
      for(let k=0;k<2+((Math.random()*2)|0);k++) tone("sawtooth", 520, 380, 0.22, v*0.35, t+k*0.36, pan);
    }
  }
  // one-shots, from the things you press E at; x,z set where it comes from
  function blip(kind, x, z, v){
    if(!ctx || !enabled) return;
    const t=ctx.currentTime+0.01;
    let vol=1;
    if(x!==undefined){ const d=Math.hypot(camera.position.x-x, camera.position.z-z); vol=1/(1+d*d/80); }
    if(v!==undefined) vol*=v;
    if(kind==="clunk"){
      tone("sine", 140, 50, 0.25, 0.25*vol, t, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(0.3,"white"); const f=ctx.createBiquadFilter();
      f.type="lowpass"; f.frequency.value=900; const g=ctx.createGain(); env(g,t,0.005,0.15*vol,0.03,0.2);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="dryer"){
      const s=ctx.createBufferSource(); s.buffer=noise(3.2,"pink"); const f=ctx.createBiquadFilter();
      f.type="bandpass"; f.frequency.value=1400; f.Q.value=0.6; const g=ctx.createGain();
      env(g,t,0.25,0.35*vol,2.2,0.6); s.connect(f); f.connect(g); g.connect(master); s.start(t);
      tone("sawtooth", 210, 230, 3.0, 0.02*vol, t, 0, master);
    }else if(kind==="tone"){
      tone("sine", 350, null, 2.2, 0.06*vol, t, 0, master); tone("sine", 440, null, 2.2, 0.06*vol, t, 0, master);
    }else if(kind==="horn"){
      tone("square", 410, null, 0.45, 0.05*vol, t); tone("square", 515, null, 0.45, 0.05*vol, t);
    }else if(kind==="door"){
      tone("sine", 95, 55, 0.18, 0.22*vol, t, 0);
      const s=ctx.createBufferSource(); s.buffer=noise(0.2,"white"); const f=ctx.createBiquadFilter();
      f.type="bandpass"; f.frequency.value=1800; f.Q.value=1.2; const g=ctx.createGain(); env(g,t,0.002,0.10*vol,0.01,0.08);
      s.connect(f); f.connect(g); g.connect(outLP); s.start(t);
    }else if(kind==="coin"){                       // a quarter going down the chute
      tone("sine", 2200, 2150, 0.12, 0.05*vol, t, 0, master); tone("sine", 3300, 3260, 0.10, 0.03*vol, t+0.05, 0, master);
      tone("sine", 1600, 1580, 0.08, 0.03*vol, t+0.16, 0, master);
    }else if(kind==="coins"){                      // change into the cup
      for(let k=0;k<4;k++) tone("sine", 2400+Math.random()*900, null, 0.09, 0.035*vol, t+k*0.07+Math.random()*0.03, 0, master);
    }else if(kind==="bill"||kind==="whirr"){       // a little motor: the bill acceptor, the coil
      const d2=kind==="bill"?0.8:1.2;
      tone("sawtooth", kind==="bill"?180:95, kind==="bill"?160:90, d2, 0.035*vol, t, 0, master);
      tone("square", kind==="bill"?360:190, null, d2, 0.010*vol, t, 0, master);
    }else if(kind==="thump"){                      // a shoulder into the cabinet
      tone("sine", 70, 40, 0.30, 0.28*vol, t, 0, master); tone("triangle", 180, 90, 0.18, 0.08*vol, t, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(0.3,"white"); const f=ctx.createBiquadFilter();
      f.type="lowpass"; f.frequency.value=500; const g=ctx.createGain(); env(g,t,0.004,0.12*vol,0.04,0.2);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="gurgle"||kind==="pour"){     // a coffee maker's gurgle and hiss; coffee running into a cup
      const long=kind==="gurgle", dur=long?3.2:1.4;
      const s2=ctx.createBufferSource(); s2.buffer=noise(dur+0.2,"pink"); const f=ctx.createBiquadFilter(); f.type="bandpass";
      f.frequency.value=long?700:1400; f.Q.value=long?1.4:0.9; const g=ctx.createGain(); env(g,t,0.15,(long?0.10:0.07)*vol,dur*0.7,dur*0.3);
      const am=ctx.createGain(); am.gain.value=0.5; const lfo=ctx.createOscillator(); lfo.frequency.value=long?7:18; const lg=ctx.createGain(); lg.gain.value=0.5;
      lfo.connect(lg); lg.connect(am.gain); s2.connect(f); f.connect(am); am.connect(g); g.connect(master); s2.start(t); lfo.start(t); lfo.stop(t+dur+0.3);
      if(long) for(let k=0;k<6;k++) tone("sine", 260+Math.random()*180, 180, 0.08, 0.025*vol, t+0.4+k*0.42+Math.random()*0.2, 0, master);
    }else if(kind==="latch"||kind==="slam"){      // a trailer's lock rods: the cams letting go; a door leaf home on its stop
      const n=kind==="latch"?2:1;
      for(let k=0;k<n;k++){ const at=t+k*0.34;
        tone("sine", 820, 760, 0.16, 0.05*vol, at, 0, master); tone("sine", 1310, 1270, 0.10, 0.03*vol, at, 0, master);
        const s=ctx.createBufferSource(); s.buffer=noise(0.25,"white"); const f=ctx.createBiquadFilter();
        f.type="bandpass"; f.frequency.value=kind==="latch"?2600:900; f.Q.value=1.1; const g=ctx.createGain(); env(g,at,0.002,0.12*vol,0.02,0.16);
        s.connect(f); f.connect(g); g.connect(master); s.start(at); }
      if(kind==="slam") tone("sine", 75, 45, 0.35, 0.22*vol, t, 0, master);
    }else if(kind==="hinge"){                      // a big hinge turning, dry
      const dur=0.35+Math.random()*0.3, f0=320+Math.random()*160;
      const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(f0,t); o.frequency.linearRampToValueAtTime(f0*0.8,t+dur);
      const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=f0*2.4; bp.Q.value=4;
      const g=ctx.createGain(); env(g,t,0.04,0.018*vol,dur*0.6,dur*0.4); o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.05);
    }else if(kind==="whoosh"){                     // a dart leaving the hand
      const s=ctx.createBufferSource(); s.buffer=noise(0.25,"white"); const f=ctx.createBiquadFilter(); f.type="bandpass";
      f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(700,t+0.2); f.Q.value=0.8;
      const g=ctx.createGain(); env(g,t,0.01,0.05*vol,0.05,0.12); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="dart"){                       // into the sisal: a short dull thock
      tone("sine", 210, 120, 0.09, 0.16*vol, t, 0, master); tone("triangle", 900, 500, 0.03, 0.05*vol, t, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(0.08,"white"); const f=ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=1600;
      const g=ctx.createGain(); env(g,t,0.001,0.10*vol,0.01,0.05); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="swish"){                     // a ball through a net: the cords' soft rip, falling in pitch
      const s=ctx.createBufferSource(); s.buffer=noise(0.4,"white"); const f=ctx.createBiquadFilter(); f.type="bandpass";
      f.frequency.setValueAtTime(3200,t); f.frequency.exponentialRampToValueAtTime(1100,t+0.28); f.Q.value=1.6;
      const g=ctx.createGain(); env(g,t,0.015,0.11*vol,0.08,0.22); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="chains" || kind==="chainsoft"){  // a disc into a basket's chains: a shower of little links ringing
      const k=kind==="chains" ? 1 : 0.45;
      for(let i=0;i<14;i++){ const at=t+Math.random()*0.35*k+i*0.012, f=2200+Math.random()*3600;
        tone(Math.random()<0.5 ? "triangle" : "sine", f, f*0.985, 0.10+Math.random()*0.12, (0.010+Math.random()*0.014)*vol*k, at, (Math.random()-0.5)*0.6, master); }
      const s=ctx.createBufferSource(); s.buffer=noise(0.6,"white"); const f=ctx.createBiquadFilter();
      f.type="bandpass"; f.frequency.value=6200; f.Q.value=1.4; const g=ctx.createGain(); env(g,t,0.004,0.05*vol*k,0.08,0.35);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="bagboard"){                  // a bag onto a cornhole board: a flat thud with the plywood's knock
      tone("sine", 110, 70, 0.16, 0.20*vol, t, 0, master); tone("triangle", 330, 240, 0.07, 0.05*vol, t, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(0.2,"pink"); const f=ctx.createBiquadFilter();
      f.type="lowpass"; f.frequency.value=1400; const g=ctx.createGain(); env(g,t,0.002,0.14*vol,0.02,0.10);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="baghole"){                   // and through the hole: a soft drop into the box, and the crowd's cheer is the player's own
      tone("sine", 160, 60, 0.22, 0.16*vol, t+0.06, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(0.4,"pink"); const f=ctx.createBiquadFilter();
      f.type="lowpass"; f.frequency.value=600; const g=ctx.createGain(); env(g,t+0.05,0.004,0.16*vol,0.05,0.25);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="meow"){                      // a cat: a rising-falling nasal cry
      const f0=560*(0.9+Math.random()*0.25), o=ctx.createOscillator(); o.type="sawtooth";
      o.frequency.setValueAtTime(f0*0.8, t); o.frequency.linearRampToValueAtTime(f0*1.25, t+0.18); o.frequency.exponentialRampToValueAtTime(f0*0.7, t+0.55);
      const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1600, t+0.2); bp.frequency.linearRampToValueAtTime(700, t+0.55); bp.Q.value=3;
      const g=ctx.createGain(); env(g, t, 0.05, 0.05*vol, 0.25, 0.25); o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t+0.7);
    }else if(kind==="tink"){                      // something hard into glass: a crack, not yet through
      tone("sine", 3200, 2900, 0.12, 0.05*vol, t, 0, master); tone("triangle", 5200, 4800, 0.06, 0.03*vol, t, 0, master);
    }else if(kind==="shatter"){                   // a pane going: a burst of bright noise and a rain of little rings
      const s=ctx.createBufferSource(); s.buffer=noise(0.8,"white"); const f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=2200;
      const g=ctx.createGain(); env(g,t,0.003,0.22*vol,0.05,0.6); s.connect(f); f.connect(g); g.connect(master); s.start(t);
      for(let i=0;i<16;i++){ const at=t+0.05+Math.random()*0.6, ff=2500+Math.random()*4500; tone(Math.random()<0.5 ? "triangle" : "sine", ff, ff*0.97, 0.08, (0.01+Math.random()*0.02)*vol, at, (Math.random()-0.5)*0.6, master); }
    }else if(kind==="bark"||kind==="yip"){        // a dog: a woof or two, a little one's yip
      const big=kind==="bark", n=1+(Math.random()<0.6 ? 1 : 0), f0=(big ? 340 : 820)*(0.9+Math.random()*0.2);
      for(let i=0;i<n;i++){ const at=t+i*(big ? 0.26 : 0.16);
        tone("sawtooth", f0*1.25, f0*0.72, big ? 0.13 : 0.08, (big ? 0.045 : 0.03)*vol, at, 0, master); tone("sine", f0*0.5, f0*0.35, big ? 0.12 : 0.06, 0.07*vol, at, 0, master);
        const s=ctx.createBufferSource(); s.buffer=noise(0.15,"white"); const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=f0*2; f.Q.value=1.4;
        const g=ctx.createGain(); env(g,at,0.004,0.10*vol,0.03,0.07); s.connect(f); f.connect(g); g.connect(master); s.start(at); }
    }else if(kind==="rim"){                       // off the steel of a rim: a short clang with a ring to it
      tone("triangle", 610, 590, 0.35, 0.07*vol, t, 0, master); tone("sine", 1480, 1440, 0.22, 0.03*vol, t, 0, master);
      tone("sine", 140, 90, 0.10, 0.10*vol, t, 0, master);
    }else if(kind.startsWith("march")){            // the invaders' four-note bass, one note a step
      const f=[98,87,78,73][+kind.slice(5)||0]; tone("square", f, f*0.92, 0.09, 0.05*vol, t, 0, master);
    }else if(kind==="zap"){                       // the cannon's shot
      tone("square", 1250, 380, 0.14, 0.025*vol, t, 0, master);
    }else if(kind==="invhit"){                    // a hit that did not kill
      tone("square", 520, 300, 0.07, 0.025*vol, t, 0, master);
    }else if(kind==="invkill"||kind==="boom"){    // an invader going, and the cannon going
      const long=kind==="boom", s=ctx.createBufferSource(); s.buffer=noise(long?1.0:0.3,"white"); const f=ctx.createBiquadFilter();
      f.type="lowpass"; f.frequency.setValueAtTime(long?2400:3800,t); f.frequency.exponentialRampToValueAtTime(long?160:600,t+(long?0.9:0.25));
      const g=ctx.createGain(); env(g,t,0.004,(long?0.12:0.06)*vol,0.04,long?0.85:0.22); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="paddle"){                    // a bat-and-ball game: the ball off the bat,
      tone("square", 520, null, 0.05, 0.025*vol, t, 0, master);
    }else if(kind==="wall"){                      //  off a wall,
      tone("square", 330, null, 0.04, 0.018*vol, t, 0, master);
    }else if(kind==="brick"){                     //  through a brick
      tone("square", 880, 700, 0.07, 0.024*vol, t, 0, master);
    }else if(kind==="chomp0"||kind==="chomp1"){   // the muncher's two-note chew, a dot at a time
      const up=kind==="chomp0"; tone("triangle", up?260:480, up?480:260, 0.08, 0.05*vol, t, 0, master);
    }else if(kind==="suds"){                      // Suds Patrol (18n): a bubble blown
      tone("sine", 420, 980, 0.12, 0.035*vol, t, 0, master);
    }else if(kind==="pop"){                       // a bubble popped
      tone("square", 1300, 300, 0.06, 0.03*vol, t, 0, master);
    }else if(kind==="hop"){                       // a jump
      tone("square", 260, 620, 0.10, 0.022*vol, t, 0, master);
    }else if(kind==="nab"){                       // a bug caught in one
      tone("triangle", 600, 1200, 0.16, 0.04*vol, t, 0, master); tone("triangle", 900, 1800, 0.12, 0.03*vol, t+0.08, 0, master);
    }else if(kind==="snack"){                     // a snack picked up
      tone("square", 880, null, 0.05, 0.025*vol, t, 0, master); tone("square", 1320, null, 0.08, 0.025*vol, t+0.05, 0, master);
    }else if(kind==="pellet"){                    // a power pellet
      tone("square", 200, 900, 0.22, 0.03*vol, t, 0, master);
    }else if(kind==="eatghost"){                  // a blue ghost eaten
      tone("sawtooth", 300, 1600, 0.28, 0.025*vol, t, 0, master);
    }else if(kind==="die"){                       // caught: down and down, then the two pops
      tone("square", 900, 90, 1.1, 0.03*vol, t, 0, master);
      tone("square", 160, 120, 0.08, 0.03*vol, t+1.2, 0, master); tone("square", 160, 120, 0.08, 0.03*vol, t+1.36, 0, master);
    }else if(kind==="rotate"){                    // a piece turned,
      tone("square", 1100, null, 0.025, 0.014*vol, t, 0, master);
    }else if(kind==="lock"){                      //  set down,
      tone("square", 150, 110, 0.07, 0.03*vol, t, 0, master);
    }else if(kind==="line"){                      //  and a row of them gone
      [523, 659, 784, 1046].forEach((f,i)=>tone("square", f, null, 0.07, 0.022*vol, t+i*0.05, 0, master));
    }else if(kind==="jingle"){                    // the start of a game, and a win
      [392, 523, 659, 784, 659, 784].forEach((f,i)=>tone("square", f, null, 0.09, 0.022*vol, t+i*0.09, 0, master));
    }else if(kind==="drip"){                      // water off a pipe into standing water,
      const f0=1300+Math.random()*900; tone("sine", f0, f0*1.9, 0.06, 0.05*vol, t, 0, master);
      tone("sine", f0*0.5, f0*0.7, 0.10, 0.02*vol, t+0.02, 0, master);
    }else if(kind==="knock"){                     //  three slow knocks on steel from the far side of a door,
      for(let k=0;k<3;k++){ const at=t+0.9+k*0.62; tone("sine", 92, 60, 0.22, 0.30*vol, at, 0, master); tone("triangle", 240, 150, 0.08, 0.06*vol, at, 0, master);
        const s=ctx.createBufferSource(); s.buffer=noise(0.12,"white"); const f=ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=700;
        const g=ctx.createGain(); env(g,at,0.002,0.10*vol,0.02,0.08); s.connect(f); f.connect(g); g.connect(master); s.start(at); }
    }else if(kind==="static"){                    //  and a radio with nothing on it
      const s=ctx.createBufferSource(); s.buffer=noise(2.6,"white"); const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=2200; f.Q.value=0.5;
      const g=ctx.createGain(); env(g,t,0.05,0.05*vol,1.9,0.5); s.connect(f); f.connect(g); g.connect(master); s.start(t);
      tone("sine", 620, 600, 1.4, 0.006*vol, t+0.6, 0, master);
    }else if(kind==="bell"){                      // the chapel's bell (14l): a strike, its partials dying slowly, and again
      for(const at of [t, t+2.2]) [[1,0.10],[2.0,0.05],[2.4,0.04],[3.0,0.025],[4.2,0.012]].forEach(([m,a])=>tone("sine", 196*m, 196*m*0.998, 4.5/Math.sqrt(m), a*Math.max(vol,0.25), at, 0, master));
    }else if(kind==="wheel"){                     // a big valve wheel: the ratchet clicking back, a dry grind under it
      for(let k=0;k<22;k++){ const at=t+0.12+k*0.11+Math.random()*0.02; tone("square", 1400+Math.random()*300, 900, 0.025, 0.018*vol, at, 0, master); }
      const s=ctx.createBufferSource(); s.buffer=noise(2.6,"brown"); const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=240; f.Q.value=0.8;
      const g=ctx.createGain(); env(g,t,0.3,0.25*vol,1.8,0.5); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="vault"){                     //  and the leaf going over on its hinges, slow and heavy
      tone("sawtooth", 62, 41, 2.6, 0.05*vol, t, 0, master); tone("triangle", 230, 180, 1.8, 0.02*vol, t+0.3, 0, master);
      const s=ctx.createBufferSource(); s.buffer=noise(2.8,"pink"); const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=380; f.Q.value=3.5;
      const g=ctx.createGain(); env(g,t,0.4,0.08*vol,1.9,0.5); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="hiss"){                      //  a safety valve lifting: a roar of steam, high and hard
      const s=ctx.createBufferSource(); s.buffer=noise(3.2,"white"); const f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=1800;
      const g=ctx.createGain(); env(g,t,0.08,0.20*Math.max(vol,0.3),2.4,0.7); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }else if(kind==="pull"){                      // a pull-cord: the rope's whirr, the motor catching or not
      const s=ctx.createBufferSource(); s.buffer=noise(0.5,"pink"); const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=700; f.Q.value=1.2;
      const g=ctx.createGain(); env(g,t,0.02,0.10*vol,0.25,0.15); s.connect(f); f.connect(g); g.connect(master); s.start(t);
      tone("sawtooth", 30, 70, 0.4, 0.05*vol, t+0.05, 0, master);
    }else if(kind==="tick"){
      tone("square", 900, null, 0.03, 0.02*vol, t, 0, master);
    }else if(kind==="airhorn"){
      tone("sawtooth", 262, null, 1.1, 0.06*vol, t); tone("sawtooth", 330, null, 1.1, 0.05*vol, t);
    }
  }
  /* ---- weather and power ------------------------------------------------
     Thunder is a crack (close strikes only: a few ms of bright noise and
     a ripping tail) and then the rumble, brown noise through a low-pass
     that closes as it rolls, longer and lower the farther off it was. */
  function thunder(d, pan){
    if(!ctx || !enabled) return;
    const t0=ctx.currentTime+0.02, near=1/(1+d/900), inside=indoorsAt(camera.position.x, camera.position.z, camera.position.y);
    const pn=(g)=>{ if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan*0.7; g.connect(p); return p; } return g; };
    if(d<900){
      const s=ctx.createBufferSource(); s.buffer=_nb || (_nb=noise(0.5,"white"));
      const hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=900;
      const g=ctx.createGain(); env(g, t0, 0.003, 0.55*near, 0.05, 0.6);
      s.connect(hp); hp.connect(g); pn(g).connect(inside?outLP:master); s.start(t0); s.stop(t0+1.2);
    }
    const dur=2.5+Math.min(6, d/600)+Math.random()*2;
    const s=ctx.createBufferSource(); s.buffer=noise(Math.min(9, dur+1), "brown");
    const lp=ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.setValueAtTime(d<900?900:420, t0); lp.frequency.exponentialRampToValueAtTime(90, t0+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(0, t0);
    const pk=0.75*near+0.06;
    // the roll: two or three swells as the sound comes in from along the stroke
    g.gain.linearRampToValueAtTime(pk, t0+0.15+Math.random()*0.3);
    g.gain.linearRampToValueAtTime(pk*0.45, t0+dur*0.35);
    g.gain.linearRampToValueAtTime(pk*(0.6+Math.random()*0.3), t0+dur*0.5);
    g.gain.exponentialRampToValueAtTime(0.0005, t0+dur);
    s.connect(lp); lp.connect(g); pn(g).connect(outLP); s.start(t0); s.stop(t0+dur+0.2);
  }
  // the moment it goes: a heavy clunk somewhere in the walls, the hum gone
  function outage(){
    if(!ctx || !enabled) return;
    const t0=ctx.currentTime+0.05;
    tone("sine", 95, 38, 0.5, 0.22, t0, 0, master);
    tone("square", 120, 60, 0.08, 0.05, t0, 0, master);
  }
  function toggle(){ enabled=!enabled; if(!started && enabled) start();
    if(master) master.gain.value=enabled?0.75:0;
    try{ localStorage.setItem(CFG.storageKey+".audio", enabled ? "on" : "off"); }catch(e){} }
  return { ctx:()=>ctx, master:()=>master, outLP:()=>outLP, noise:(s,c)=>noise(s,c), tone:(...a)=>{ if(ctx && enabled) tone(...a); },
           start:start, update:update, blip:blip, on:()=>enabled, source:source, sources:SOURCES,
           thunder:thunder, outage:outage, toggle:toggle, quiet:false, noHum:false };
})();
