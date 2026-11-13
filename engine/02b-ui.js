"use strict";
/* ENGINE · 02b-ui.js
   the page's own furniture, put in by the engine so a world's index.html
   need only list its scripts: the styles, the canvas's home, the crosshair,
   the prompt and the toast, the masthead, the controls card, the gauge
   cluster (compass, location, clock, season, weather), the plan, the touch
   pad and the boot card
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. Anything already in the page with the same
   id is left as it is, so a world can write its own HUD in its HTML and the
   engine will drive it. */
/* ----------------------------------------------------------------------
   UI COLOURS are CSS variables on :root; WORLD.ui overrides them:
     {sign:"#14563a", signD:"#0c3a26", legend:"#f1f1ea", amber:"#f4c430",
      amberD:"#b8932a", ink:"#07120c", blue:"#2b4f9c"}
   Fonts are Oswald and JetBrains Mono from Google Fonts when the page
   loads them, and a plain sans and monospace when it does not.
   ---------------------------------------------------------------------- */
const UI=(function(){
  const U=Object.assign({sign:"#14563a", signD:"#0c3a26", legend:"#f1f1ea", amber:"#f4c430", amberD:"#b8932a", ink:"#07120c", blue:"#2b4f9c"}, CFG.ui||{});
  const css=`
  :root{--sign:${U.sign};--sign-d:${U.signD};--legend:${U.legend};--amber:${U.amber};--amber-d:${U.amberD};--ink:${U.ink};--blue:${U.blue}}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;overflow:hidden;background:var(--ink);color:var(--legend);
    font-family:"JetBrains Mono",ui-monospace,monospace;-webkit-font-smoothing:antialiased;
    touch-action:none;user-select:none;-webkit-user-select:none}
  #app{position:fixed;inset:0} canvas{display:block}
  #vig{position:fixed;inset:0;pointer-events:none;z-index:5;
    background:radial-gradient(125% 125% at 50% 45%, transparent 58%, rgba(0,0,0,0.42) 100%)}
  #dot{position:fixed;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;z-index:7;
    border-radius:50%;background:rgba(241,241,234,.78);box-shadow:0 0 5px rgba(0,0,0,.6);pointer-events:none}
  #mast{position:fixed;left:22px;top:18px;z-index:10;pointer-events:none;background:var(--sign);border:2px solid var(--legend);
    border-radius:7px;padding:8px 14px 9px;box-shadow:0 0 0 3px var(--sign), 0 6px 18px rgba(0,0,0,.45)}
  #mast h1{font-family:"Oswald","Arial Narrow",sans-serif;font-weight:500;font-size:27px;letter-spacing:.05em;color:var(--legend);line-height:1}
  #mast .tag{font-family:"Oswald","Arial Narrow",sans-serif;font-size:11px;color:var(--legend);letter-spacing:.24em;margin-top:4px;opacity:.86;text-transform:uppercase}
  #keys{position:fixed;right:22px;top:18px;z-index:10;border:1px solid rgba(241,241,234,.22);background:rgba(7,18,12,.62);
    border-radius:4px;padding:12px 14px;max-width:252px;backdrop-filter:blur(3px)}
  #keys h2{font-size:9px;letter-spacing:.32em;color:var(--amber-d);text-transform:uppercase;margin-bottom:8px}
  #keys .row{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:2px 0;color:var(--legend)}
  #keys .row span:last-child{color:#b9c4bc;text-align:right}
  kbd{font-family:"JetBrains Mono",monospace;font-size:10px;background:rgba(244,196,48,.12);border:1px solid rgba(244,196,48,.32);
    border-bottom-width:2px;border-radius:3px;padding:1px 5px;color:var(--amber)}
  #cluster{position:fixed;left:22px;bottom:20px;z-index:10;display:flex;align-items:flex-end;gap:14px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4))}
  .gauge{position:relative;width:158px;height:158px} .gauge svg{position:absolute;inset:0;width:100%;height:100%}
  #hdgNum{position:absolute;left:0;right:0;top:66px;text-align:center;font-family:"Oswald","Arial Narrow",sans-serif;font-weight:700;font-size:32px;line-height:1;color:var(--legend)}
  #hdgCard{position:absolute;left:0;right:0;top:101px;text-align:center;letter-spacing:.34em;font-size:10px;color:var(--amber);text-transform:uppercase}
  .stack{display:flex;flex-direction:column;gap:8px;padding-bottom:6px;min-width:196px}
  .chip{border:2px solid rgba(241,241,234,.85);background:var(--sign);border-radius:5px;padding:6px 10px}
  .chip .k{font-size:9px;letter-spacing:.28em;color:#cfe0d4;text-transform:uppercase}
  .chip .v{font-family:"Oswald","Arial Narrow",sans-serif;font-weight:500;font-size:19px;color:var(--legend);line-height:1.12}
  .chip.blue{background:var(--blue)}
  #plan{position:fixed;right:22px;bottom:20px;z-index:10;width:214px;text-align:center;border:1px solid rgba(241,241,234,.24);
    background:rgba(7,18,12,.66);border-radius:4px;padding:8px 8px 4px;backdrop-filter:blur(3px)}
  #plan canvas{width:198px;height:230px;display:block}
  #plan .radarlabel{font-size:8px;letter-spacing:.34em;color:#9fb3a6;margin-top:3px}
  #prompt{position:fixed;left:50%;top:58%;transform:translateX(-50%);z-index:11;font-family:"Oswald","Arial Narrow",sans-serif;font-size:15px;
    letter-spacing:.2em;color:var(--legend);text-transform:uppercase;opacity:0;transition:opacity .18s ease;pointer-events:none;
    text-shadow:0 1px 3px #000, 0 0 10px rgba(0,0,0,.6);white-space:pre}
  #prompt.show{opacity:1}
  #toast{position:fixed;left:50%;top:19%;transform:translateX(-50%);z-index:12;font-family:"Oswald","Arial Narrow",sans-serif;font-size:23px;
    font-weight:500;letter-spacing:.14em;text-shadow:0 1px 3px #000,0 0 14px rgba(0,0,0,.5);opacity:0;transition:opacity .25s ease;
    pointer-events:none;white-space:nowrap}
  #toast.show{opacity:1}
  #gfx{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:21;width:min(600px,94vw);display:none;
    background:rgba(7,18,12,.94);border:2px solid var(--legend);border-radius:7px;padding:0 0 10px;
    box-shadow:0 0 0 3px var(--sign),0 22px 60px rgba(0,0,0,.65);font-family:"JetBrains Mono",monospace;color:var(--legend)}
  #gfx.show{display:block}
  #gfx .hd{display:flex;justify-content:space-between;align-items:baseline;gap:12px;background:var(--sign);padding:9px 16px 8px;border-radius:5px 5px 0 0;border-bottom:2px solid var(--legend)}
  #gfx .t{font-family:"Oswald","Arial Narrow",sans-serif;font-size:22px;font-weight:500;letter-spacing:.14em}
  #gfx .now{font-size:10px;color:#cfe0d4;letter-spacing:.04em;text-align:right}
  #gfx .rows{padding:8px 10px 2px}
  #gfx .row{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:3px;font-size:12px;cursor:pointer;border:1px solid transparent}
  #gfx .row .k{letter-spacing:.18em;color:#b9c4bc} #gfx .row .v{display:flex;align-items:center;gap:10px}
  #gfx .row .c{min-width:150px;text-align:center;font-family:"Oswald","Arial Narrow",sans-serif;font-size:16px;letter-spacing:.08em}
  #gfx .row .l,#gfx .row .r{color:var(--amber-d);padding:0 6px;user-select:none}
  #gfx .row.on{background:rgba(244,196,48,.10);border-color:rgba(244,196,48,.45)} #gfx .row.on .k{color:var(--amber)}
  #gfx .row.on .l,#gfx .row.on .r{color:var(--amber)}
  #gfx .note{margin:6px 18px 0;font-size:11px;line-height:1.5;color:#cfe0d4;min-height:34px}
  #gfx .ft{display:flex;justify-content:space-between;align-items:center;margin:8px 18px 0;font-size:10px;color:#9fb3a6}
  #gfx .ft b{color:var(--amber);font-weight:500}
  #gfx .done{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.2em;color:var(--amber);background:rgba(0,0,0,.35);
    border:1px solid rgba(244,196,48,.5);border-radius:3px;padding:6px 12px;cursor:pointer}
  #fps{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:12;display:none;pointer-events:none;font-size:11px;letter-spacing:.08em;
    color:#cfe0d4;background:rgba(7,18,12,.6);border:1px solid rgba(241,241,234,.2);border-radius:3px;padding:3px 9px}
  #outage{position:fixed;inset:0;z-index:13;pointer-events:none;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,0)}
  #outage .w{font-family:"Oswald","Arial Narrow",sans-serif;font-size:64px;font-weight:700;letter-spacing:.16em;color:#ff3a26;text-shadow:0 0 18px rgba(255,40,20,.7),0 2px 4px #000}
  #outage .s{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.28em;color:#ffb39e;text-shadow:0 1px 3px #000}
  #outage.go{animation:outbg 4.6s ease-out forwards}
  #outage.go .w,#outage.go .s{animation:outblink 4.6s steps(1) forwards}
  @keyframes outbg{0%{opacity:1;background:rgba(0,0,0,1)}6%{background:rgba(0,0,0,.92)}25%{background:rgba(0,0,0,.35)}80%{opacity:1;background:rgba(0,0,0,0)}100%{opacity:0;background:rgba(0,0,0,0)}}
  @keyframes outblink{0%{opacity:0}8%{opacity:1}22%{opacity:0}30%{opacity:1}44%{opacity:0}52%{opacity:1}100%{opacity:1}}
  #boot{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;transition:opacity .8s ease;cursor:pointer;
    background:radial-gradient(120% 120% at 50% 40%, rgba(8,26,16,.55), rgba(4,10,7,.92))}
  #boot .board{background:var(--sign);border:4px solid var(--legend);border-radius:14px;box-shadow:0 0 0 7px var(--sign), 0 24px 60px rgba(0,0,0,.6);padding:26px 54px 28px;text-align:center;max-width:92vw}
  #boot .big{font-family:"Oswald","Arial Narrow",sans-serif;font-size:76px;font-weight:500;letter-spacing:.04em;color:var(--legend);line-height:.95}
  #boot .sub{font-family:"Oswald","Arial Narrow",sans-serif;font-size:13px;letter-spacing:.34em;color:#cfe0d4;margin-top:12px;text-transform:uppercase}
  #boot .go{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.3em;color:var(--amber);border:1px solid rgba(244,196,48,.5);padding:10px 20px;border-radius:3px;background:rgba(0,0,0,.35)}
  #boot .hint{font-size:10px;letter-spacing:.2em;color:#9fb3a6}
  #boot.hidden{opacity:0;pointer-events:none}
  #touch{position:fixed;left:18px;bottom:210px;z-index:11;display:none;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:6px}
  #touch.on{display:grid}
  #touch button{background:rgba(7,18,12,.6);border:1px solid rgba(241,241,234,.3);color:var(--legend);font-family:"Oswald",sans-serif;font-size:19px;border-radius:4px}
  #touch .sp{visibility:hidden}
  @media (max-width:860px){ #keys{display:none} #plan{width:150px}#plan canvas{width:134px;height:156px}
    .gauge{width:118px;height:118px} #hdgNum{top:46px;font-size:23px}#hdgCard{top:74px} .stack{min-width:132px}
    #mast h1{font-size:19px} #boot .big{font-size:44px} #boot .board{padding:18px 26px} }`;
  const st=document.createElement("style"); st.textContent=css; document.head.insertBefore(st, document.head.firstChild);
  const esc=s=>String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const put=(id, html, tag)=>{ if(document.getElementById(id)) return document.getElementById(id);
    const d=document.createElement(tag||"div"); d.id=id; d.innerHTML=html||""; document.body.appendChild(d); return d; };
  put("app"); put("vig"); put("dot"); put("prompt"); put("toast");
  put("mast", '<h1>'+esc(CFG.hud.title||CFG.name)+'</h1>'+(CFG.hud.subtitle ? '<div class="tag">'+esc(CFG.hud.subtitle)+'</div>' : ''));
  const K=CFG.keysCard||[["Walk","<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>"],["Look","drag · mouse"],["Run · sprint","<kbd>Shift</kbd> · <kbd>Q</kbd>"],
    ["Door · drive · use","<kbd>E</kbd>"],["Sit / stand","<kbd>C</kbd>"],["Drone","<kbd>F</kbd>"],["Flashlight","<kbd>L</kbd>"],
    ["Nightfall · midday","<kbd>N</kbd> · <kbd>M</kbd>"],["Scrub time","<kbd>[</kbd><kbd>]</kbd>"],["Summer / autumn","<kbd>Y</kbd>"],
    ["Rain &amp; fog · storm","<kbd>R</kbd> · <kbd>T</kbd>"],["Power cut","<kbd>P</kbd>"],["Sound","<kbd>U</kbd>"],["Plan view · HUD","<kbd>O</kbd> · <kbd>H</kbd>"],
    ["Graphics settings","<kbd>G</kbd>"]].concat(CFG.extraKeys||[]);
  put("keys", '<h2>Controls</h2>'+K.map(r=>'<div class="row"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>').join(""));
  put("cluster", '<div class="gauge"><svg viewBox="0 0 200 200" id="gaugeSvg"></svg><div id="hdgNum">0</div><div id="hdgCard">heading</div></div>'+
    '<div class="stack"><div class="chip"><div class="k">Location</div><div class="v" id="where" style="font-size:16px">—</div></div>'+
    '<div class="chip"><div class="k">Local time</div><div class="v" id="clock">—</div></div>'+
    '<div class="chip blue"><div class="k">Season</div><div class="v" id="season" style="font-size:16px">SUMMER</div></div>'+
    '<div class="chip"><div class="k">Weather</div><div class="v" id="wx" style="font-size:16px">CLEAR</div></div></div>');
  put("plan", '<canvas id="planCv" width="198" height="230"></canvas><div class="radarlabel">'+esc(CFG.planLabel||"PLAN")+'</div>');
  put("touch", '<button class="sp"></button><button data-k="f">▲</button><button class="sp"></button><button data-k="l">◀</button><button data-k="b">▼</button><button data-k="r">▶</button>');
  const B=CFG.boot||{};
  put("boot", '<div class="board"><div class="big">'+esc(B.title||CFG.name)+'</div>'+(B.subtitle ? '<div class="sub">'+esc(B.subtitle)+'</div>' : '')+'</div>'+
    '<div class="go">'+esc(B.go||"CLICK TO START")+'</div>'+(B.hint ? '<div class="hint">'+esc(B.hint)+'</div>' : '')+'<div class="hint">press G for graphics settings</div>');
  return U;
})();
// a line of the plan: a world draws its own layers on the minimap with PLAN_LAYERS.push((x, px, pz, S)=>{...}):
// x the canvas's context, px/pz world → canvas, S pixels to the metre. They are drawn once, over the engine's.
const PLAN_LAYERS=[];
