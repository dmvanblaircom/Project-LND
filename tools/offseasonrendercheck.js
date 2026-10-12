#!/usr/bin/env node
/* Production S2/S4 renderer contract: never display inferred season facts. */
"use strict";
const assert=require("assert"),fs=require("fs"),vm=require("vm"),path=require("path");
const source=fs.readFileSync(path.join(__dirname,"../suite/offseason.js"),"utf8");
const ctx={Suite:{ui:{esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}};
vm.createContext(ctx);vm.runInContext(source,ctx,{filename:"suite/offseason.js"});
const hero=ctx.Suite.offseason.hero;let checks=0;
function check(cond,msg){assert(cond,msg);checks++;}
function render(phase,extra){return hero(Object.assign({
 phase:{state:phase,season:2026,nextSeason:2027,opener:null},
 record:{text:"11-1",kind:phase==="complete"?"final":"regular",season:2026},
 ranking:{rank:6,source:phase==="complete"?"AP":"CFP",final:phase==="complete",season:2026},
 last:{state:"post",status:"final",us:"31",them:"17",oppName:"Sample State",home:true,stage:{name:"Regular-season finale"}},
 calendar:{selection:{start:"2026-12-06T17:00:00Z",on:"ESPN"}},
 nextSchedule:{outcome:"empty",opener:null}
},extra||{}));}
let s=render("awaiting-postseason");
check(/Regular season complete/.test(s),"S2 header");
check(/11-1/.test(s)&&/CFP ranking/.test(s),"record and sourced rank");
check(/vs Sample State/.test(s)&&/W 31–17/.test(s),"normalized opponent and result");
check(/Bowl and playoff selections/.test(s)&&/ESPN/.test(s),"calendar-backed selection");
check(/href="#schedule\/results"/.test(s),"results deep link");
check(!/2027 schedule/.test(s),"S2 does not invent next-season schedule status");
s=render("complete",{record:{text:"12-2",kind:"final",season:2026},
 last:{state:"post",status:"final",us:24,them:27,oppName:"Sample State",home:false,stage:{name:"CFP Quarterfinal"}}});
check(/Season complete/.test(s)&&/12-2/.test(s),"S4 accurate final record");
check(/at Sample State/.test(s)&&/L 24–27/.test(s)&&/CFP Quarterfinal/.test(s),"away loss and source stage");
check(/Final AP ranking/.test(s),"final source explicitly labeled");
check(/2027 schedule is not available yet/.test(s),"successfully empty schedule distinct from missing");
for(const outcome of ["loading","failed","unknown"]){
 s=render("complete",{nextSchedule:{outcome:outcome,opener:null}});
 check(outcome==="loading"?/Checking the 2027 schedule/.test(s):outcome==="failed"?/couldn’t load/.test(s):/information is not available yet/.test(s),outcome+" truthfully labeled");
}
s=render("complete",{nextSchedule:{outcome:"retained",opener:{oppName:"Another Team",home:true,date:"2027-09-03T18:00:00Z"}}});
check(/vs Another Team/.test(s),"retained known opener kept");
s=render("complete",{phase:{state:"complete",season:2026,nextSeason:2027,opener:{oppName:"Next Team"}}});
check(s==="","S5 opener never uses S4 card");
check(hero({phase:{state:"postseason"}})===""&&hero({phase:{state:"in-season"}})==="","S1/S3 untouched");
s=render("complete",{record:{text:"99-0",kind:"final",season:2025},ranking:{rank:1,source:"AP",season:2025,final:true}});
check(!/99-0/.test(s)&&!/#1/.test(s),"wrong-season record and rank suppressed");
s=render("complete",{ranking:{rank:3,source:"AP",season:2026,final:false}});
check(!/Final AP/.test(s)&&!/#3/.test(s),"no final rank without final edition");
s=render("complete",{last:{state:"post",oppName:"No score",home:true,status:"final",us:null,them:null}});
check(/vs No score/.test(s)&&/Final/.test(s)&&!/W 0–0/.test(s),"scoreless final never becomes zero");
s=render("awaiting-postseason",{last:{state:"post",status:"final",us:0,them:7,oppName:"Zero Club",home:true}});
check(/L 0–7/.test(s),"real zero score retained");
s=render("complete",{last:{state:"post",status:"final",us:12,them:14,oppName:'<img src=x onerror="alert(1)">',home:true},ranking:{rank:6,source:'<script>alert(1)</script>',final:true,season:2026}});
check(!/<img|<script/.test(s)&&/&lt;img/.test(s),"opponent and ranking escaped");
s=render("complete",{record:null,ranking:null,last:null,nextSchedule:{outcome:"failed"}});
check(!/<dd>/.test(s)&&!/os-result"/.test(s)&&/couldn’t load/.test(s),"partial data renders without made-up figures");
console.log(checks+" offline season-render assertions passed");
