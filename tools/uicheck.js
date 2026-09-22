#!/usr/bin/env node
"use strict";
var fs=require("fs"), failures=0;
function read(p){ return fs.readFileSync(p,"utf8"); }
function ok(v,msg){ console.log((v?"  ok   ":"  FAIL ")+msg); if(!v) failures++; }
var html=read("index.html"), js=read("app.js"), css=read("app.css");

console.log("quiet team switching");
ok(/id="moreTrigger"[^>]+aria-haspopup="menu"/.test(html),"More exposes an accessible menu trigger");
ok(/id="changeTeam"[^>]+role="menuitem"/.test(html),"Change team lives inside More, not primary navigation");
ok(/localStorage\.removeItem\("iw-team"\)/.test(js),"changing teams forgets only the selected-team preference");
ok(/e\.key==="Escape"/.test(js),"Escape closes the menu");

console.log("team outlook capability");
ok(/id="strip" hidden/.test(html)&&/id="oddsHint" hidden/.test(html),"outlook is absent before market membership is confirmed");
ok(/\.strip\[hidden\]\s*\{display:none\}/.test(css),"hidden outlook stays hidden in WebKit despite its flex rule");
ok(/found\+\+; asked\+\+;\s*showOddsSurface\(\)/.test(js),"a matching team market reveals the outlook");
ok(/asked === 2 && found === 0\) dropOddsSurface/.test(js),"no team market removes the whole surface");
ok(/Market-implied outlook · Kalshi/.test(html),"the compact cards identify source and meaning");

console.log("personnel and neutral first paint");
ok(/id="tab-depth"[\s\S]*?<span>Players<\/span>/.test(html),"the destination is fan-facing Players");
ok(!/NOTRE DAME FOOTBALL|Next Notre Dame game|Irish Watch —/.test(html),"the static shell does not claim another team's identity");
ok(/--suite-focus/.test(css),"light editorial surfaces own a readable focus semantic");

if(failures){ console.error("\n"+failures+" check(s) failed"); process.exit(1); }
console.log("\nSuite interaction contract holds");
