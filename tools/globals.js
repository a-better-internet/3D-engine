/* ENGINE · tools/globals.js
   Every script shares one global scope, so two files that both declare a top-level `const look` (or a function and a
   const of one name) stop the page with "Identifier has already been declared", and only the first error shows.
   This lists every top-level const/let/var/function/class across the scripts a page loads, in its order, and reports
   any name declared twice. No browser needed; it only reads the files.
     node tools/globals.js [page.html]
   (It scans the source itself: strings, template literals, comments and regex literals are skipped; a declaration
   is top level when it starts in column 0, which is the engine's style. Keep a world's own helpers inside a block
   or an IIFE, or give them a prefix, and they can never collide.) */
const fs=require("fs"), path=require("path");
const ROOT=path.resolve(__dirname, ".."), PAGE=path.join(ROOT, process.argv[2]||"index.html");
const html=fs.readFileSync(PAGE, "utf8"), files=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>!/^https?:/.test(f));
// the names a top-level declaration starting at i declares (its declarators at bracket depth 0)
function declNames(src, i){
  const names=[], n=src.length; let depth=0, k=i, expectName=true, prev="";
  const id=/[A-Za-z_$][\w$]*/y;
  const skipStr=(q)=>{ k++; while(k<n && src[k]!==q){ if(src[k]==="\\") k++; k++; } k++; };
  const skipTpl=()=>{ k++; while(k<n && src[k]!=="`"){ if(src[k]==="\\"){ k+=2; continue; }
      if(src[k]==="$" && src[k+1]==="{"){ k+=2; let d=1; while(k<n && d>0){ const c=src[k];
          if(c==="{") d++; else if(c==="}") d--; else if(c==="`"){ skipTpl(); continue; } else if(c==="'"||c==='"'){ skipStr(c); continue; } k++; } continue; }
      k++; } k++; };
  while(k<n){
    const c=src[k];
    if(c==="/" && src[k+1]==="/"){ while(k<n && src[k]!=="\n") k++; continue; }
    if(c==="/" && src[k+1]==="*"){ k=src.indexOf("*/", k+2); k=k<0 ? n : k+2; continue; }
    if(c==="'"||c==='"'){ skipStr(c); prev="a"; continue; }
    if(c==="`"){ skipTpl(); prev="a"; continue; }
    if(c==="/" && /[(,=:\[!&|?{};+\-*%<>~^]|^$/.test(prev)){ k++; let cls=false; while(k<n){ const d=src[k]; if(d==="\\"){ k+=2; continue; } if(d==="[") cls=true; else if(d==="]") cls=false; else if(d==="/" && !cls) break; k++; } k++; while(/[a-z]/.test(src[k]||"")) k++; prev="a"; continue; }
    if(expectName && depth===0){ id.lastIndex=k; const m=id.exec(src); if(m){ names.push(m[0]); k+=m[0].length; expectName=false; prev="a"; continue; } }
    if("([{".includes(c)) depth++; else if(")]}".includes(c)) depth--;
    else if(c===";" && depth===0) break;
    else if(c==="," && depth===0) expectName=true;
    if(!/\s/.test(c)){ prev=c; if(c!==",") expectName=expectName && false; }
    k++;
    if(depth===0 && c==="," ) expectName=true;
  }
  return names;
}
const seen=new Map(); let bad=0;
for(const f of files){
  const src=fs.readFileSync(path.join(path.dirname(PAGE), f), "utf8");
  const re=/^(?:(const|let|var)\s+|(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*))/gm;
  let m;
  while((m=re.exec(src))){
    const names=m[1] ? declNames(src, m.index+m[0].length) : [m[2]];
    const line=src.slice(0, m.index).split("\n").length;
    for(const nm of names){ const at=f+":"+line;
      if(seen.has(nm)){ console.log("TWICE  "+nm.padEnd(24)+" "+seen.get(nm)+"  and  "+at); bad++; } else seen.set(nm, at); }
  }
}
console.log(seen.size+" top-level names in "+files.length+" files"+(bad ? ", "+bad+" declared twice" : ", none twice"));
process.exit(bad ? 1 : 0);
