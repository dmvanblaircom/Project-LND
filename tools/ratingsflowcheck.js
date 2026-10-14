#!/usr/bin/env node
/* W07: real app routes, both teams/styles, request recovery, per-source
   freshness and the REAL worker's HTTP 200 cached fallback. No live APIs. */
"use strict";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS="1";
var fs=require("fs"),path=require("path"),assert=require("assert");
var chromium=require("playwright").chromium,root=path.join(__dirname,".."),audit=require("./a11yaudit");
var server=require("./lib/serve")(root),shots=path.join(root,"artifacts/visual/ratings");
var snap=JSON.parse(fs.readFileSync(path.join(root,"data/league/fpi.json"))),checks=[];
// SP+ through the edge API: made-up figures on the real registry's names
// and ids (no CFBD data in the repository). Ohio State #2, Notre Dame #9.
var REG=(function(){var c=require("vm").createContext({});require("vm").runInContext(fs.readFileSync(path.join(root,"teams/index.js"),"utf8")+";this.R=TEAM_REGISTRY;",c);return c.R;})();
function spBody(year){
  var names=REG.filter(function(t){return t.providerId&&t.name!=="Notre Dame"&&t.name!=="Ohio State";}).slice(0,23).map(function(t){return t.name;});
  names.splice(1,0,"Ohio State");names.splice(8,0,"Notre Dame");
  var id={};REG.forEach(function(t){id[t.name]=t.providerId;});
  return {source:"cfbd-sp",year:year,fetchedAt:new Date(new Date(snap.sourceUpdated).getTime()+1800e3).toISOString(),
          ranks:names.map(function(n,i){return {rank:i+1,team:n,id:id[n],rating:Math.round((28-i*1.7)*10)/10};})};
}
function fixture(n){return fs.readFileSync(path.join(root,"tools/fixtures",n));}
function ok(value,label){assert(value,label);checks.push(label);}
fs.mkdirSync(shots,{recursive:true});
(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});
  var base="http://127.0.0.1:"+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined});
  async function open(opts){
    opts=opts||{};
    var ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:"America/New_York",serviceWorkers:opts.worker?"allow":"block"});
    var st={mode:opts.mode||"ok",n:0,payload:JSON.parse(JSON.stringify(snap)),errors:[],
            spMode:opts.spMode||"ok",spN:0,spYears:[],sp:{2026:spBody(2026),2025:spBody(2025)}},page=await ctx.newPage();
    await page.clock.setSystemTime(new Date(new Date(snap.sourceUpdated).getTime()+3600e3));
    page.on("pageerror",function(e){st.errors.push(String(e));});
    await ctx.route("**/*",async function(route){
      var u=route.request().url();
      if(u.startsWith(base+"/data/league/fpi.json")){
        st.n++;
        if(st.mode==="fail")return route.abort();
        if(st.mode==="slow")await new Promise(function(r){st.release=r;});
        return route.fulfill({status:200,contentType:"application/json",headers:st.mode==="cached"?{"X-IW-Cached":"2026-10-01T12:00:00Z"}:{},body:st.mode==="malformed"?'{"teams":[':JSON.stringify(st.payload)});
      }
      if(/\/v1\/cfbd\/sp\?year=\d+$/.test(u)){
        var year=+/year=(\d+)/.exec(u)[1];st.spN++;st.spYears.push(year);
        if(st.spMode==="fail")return route.abort();
        if(st.spMode==="slow")await new Promise(function(r){st.spRelease=r;});
        var b=JSON.parse(JSON.stringify(st.sp[year]||{source:"cfbd-sp",year:year,fetchedAt:new Date().toISOString(),ranks:[]}));
        if(st.spMode==="stale")b.stale=true;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(b),
          headers:Object.assign({"access-control-allow-origin":"*","access-control-expose-headers":"X-IW-Cached"},st.spMode==="cached"?{"X-IW-Cached":"2026-10-01T12:00:00Z"}:{})});
      }
      if(u.startsWith(base))return route.continue();
      var f=/\/rankings/.test(u)?"espn-rankings-sep20.json":/\/scoreboard\?/.test(u)?"espn-scoreboard-sep26.json":/\/schedule\?seasontype=3/.test(u)?"espn-schedule-nd-2025-post.json":/\/teams\/194\/schedule/.test(u)?"espn-schedule-osu-2026.json":/\/schedule/.test(u)?"espn-schedule-nd-sep24.json":null;
      return f?route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:fixture(f)}):route.abort();
    });
    async function go(hash){await page.evaluate(function(h){location.hash=h;},hash);await page.waitForTimeout(160);}
    async function settled(){await page.waitForFunction(function(){var h=document.querySelector("#screenTop25");return h&&!h.hidden&&!document.getElementById("launch")&&!/Loading FPI/.test(h.textContent);},null,{timeout:15000});await page.waitForTimeout(100);}
    async function refresh(){await go("#settings");await page.locator("[data-refresh]").click({force:true});await page.waitForFunction(function(){return !document.querySelector('[data-refresh][aria-disabled="true"]');});await go("#top25/rankings/fpi");}
    async function spSettled(){await page.waitForFunction(function(){var h=document.querySelector("#screenTop25");return h&&!h.hidden&&!document.getElementById("launch")&&!/Loading SP\+/.test(h.textContent);},null,{timeout:15000});await page.waitForTimeout(100);}
    async function spRefresh(){await go("#settings");await page.locator("[data-refresh]").click({force:true});await page.waitForFunction(function(){return !document.querySelector('[data-refresh][aria-disabled="true"]');});await go("#top25/rankings/sp-plus");}
    await page.goto(base+"/?team="+(opts.team||"notre-dame")+(opts.home?"#home":opts.sp?"#top25/rankings/sp-plus":"#top25/rankings/fpi"));
    if(opts.sp)return {ctx:ctx,page:page,st:st,go:go,settled:spSettled,refresh:spRefresh};
    return {ctx:ctx,page:page,st:st,go:go,settled:settled,refresh:refresh};
  }
  async function screen(o){return o.page.evaluate(function(){var h=document.getElementById("screenTop25"),b=h.querySelector(".fresh-banner");return {text:h.innerText,rows:h.querySelectorAll(".rk-ratings tbody tr").length,mine:(h.querySelector("tr.mine .rk-name")||{}).textContent,banner:b?b.textContent:"",selected:(h.querySelector('.poll-seg [aria-current="page"]')||{}).textContent};});}
  try{
    // Actual data: identity, selector, browser history, source and responsive table.
    for(var team of ["notre-dame","ohio-state"]){
      var o=await open({team:team});await o.settled();
      var s=await screen(o),own=snap.teams.find(function(t){return t.espnId===(team==="notre-dame"?"87":"194");});
      ok(s.rows===25&&s.selected==="FPI"&&s.mine.includes(own.name),team+": 25 ranks, FPI selected, correct team highlighted");
      ok(/Predictive rating/.test(s.text)&&/7 days/.test(s.text)&&!s.banner,team+": rating identified, source edition fresh");
      ok(await o.page.locator('.rk-source a').getAttribute('href')===snap.sourceUrl,team+": source attribution links to the source");
      for(var style of ["team","suite"]){
        await o.page.evaluate(function(style){localStorage.setItem("suite-style",style);},style);await o.page.reload();await o.settled();
        for(var width of [320,375,390,768,1280]){
          await o.page.setViewportSize({width:width,height:844});await o.page.evaluate(function(){return document.fonts.ready;});
          ok(await o.page.evaluate(function(){var t=document.querySelector(".rk-ratings"),c=t.closest(".rk-card");return document.documentElement.scrollWidth<=innerWidth+1&&t.getBoundingClientRect().right<=c.getBoundingClientRect().right;}),team+" "+style+" "+width+": table fits");
          var a=await audit.auditText(o.page,"FPI "+team+style+width);ok(!a.failures.length,"FPI contrast "+team+style+width+" "+JSON.stringify(a.failures.slice(0,3)));
          if(width===320||width===390){await o.page.evaluate(function(){scrollTo(0,0);});await o.page.screenshot({path:path.join(shots,team+"-"+style+"-"+width+".png")});}
        }
      }
      await o.go("#top25/rankings/ap");ok((await screen(o)).selected==="AP","explicit AP still works");
      await o.go("#top25/rankings/fpi");await o.page.goBack();await o.page.waitForTimeout(200);ok((await screen(o)).selected==="AP","Back restores prior ranking source");
      ok(!o.st.errors.length,"no page errors: "+o.st.errors.join("; "));await o.ctx.close();
    }
    var f=await open({mode:"fail"});await f.settled();
    ok(/didn’t load/.test((await screen(f)).text)&&!(await screen(f)).rows,"first failure says failed, never not published");
    f.st.mode="slow";await f.go("#home");await f.go("#top25/rankings/fpi");
    await f.go("#top25/rankings/ap");await f.go("#top25/rankings/fpi");ok(f.st.n===2,"in-flight retry is joined, not duplicated");
    f.st.mode="ok";f.st.release();await f.settled();ok((await screen(f)).rows===25,"re-entry retry recovers");
    await f.go("#home");await f.go("#top25/rankings/fpi");ok(f.st.n===2,"success starts the retry clock");
    f.st.mode="malformed";await f.refresh();ok((await screen(f)).rows===25&&/outdated/.test((await screen(f)).banner),"bad JSON preserves the last edition with a warning");
    f.st.mode="ok";await f.ctx.setOffline(true);await f.page.waitForTimeout(100);await f.ctx.setOffline(false);await f.page.waitForTimeout(500);
    ok(!(await screen(f)).banner,"reconnect replaces saved data and clears the warning");
    f.st.payload.teams=f.st.payload.teams.slice(0,10);await f.refresh();ok((await screen(f)).rows===25&&/outdated/.test((await screen(f)).banner),"partial snapshot does not replace the valid table");
    await f.go("#top25/rankings/ap");ok(!(await screen(f)).banner,"failed FPI does not warn on AP");
    f.st.payload=JSON.parse(JSON.stringify(snap));f.st.payload.season=2025;f.st.payload.teams[0].rating=0;f.st.payload.teams[1].rating=-1.5;
    await f.refresh();var old=await screen(f);ok(/not the current season/.test(old.text)&&/2025/.test(old.text),"old season is explicitly identified");
    ok(await f.page.locator('.rk-value').allTextContents().then(function(x){return x.includes("0.0")&&x.includes("-1.5");}),"zero and negative ratings remain real values");
    // The prepared selector accepts a fifth normalized source, without a fake production SP+ tab.
    await f.page.setViewportSize({width:320,height:844});
    await f.page.evaluate(function(){Suite.top25.paint(document.getElementById("screenTop25"),{view:"rankings",poll:"sp-plus",polls:[],ratingSources:[{key:"fpi",label:"FPI"},{key:"sp-plus",label:"SP+"}],ratings:[],ratingsFailed:{"sp-plus":true},mark:function(){return "";}});});
    ok(await f.page.evaluate(function(){return document.querySelectorAll(".poll-seg a").length===5&&[].every.call(document.querySelectorAll(".poll-seg a"),function(a){var r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44;});}),"five future source choices fit at 320 with 44px targets");
    await f.ctx.close();
    // SP+ (handoff 2026-10-14, slice 4): its own source, beside FPI.
    for(var spTeam of ["notre-dame","ohio-state"]){
      var p=await open({team:spTeam,sp:true});await p.settled();
      var q=await screen(p),own=spTeam==="notre-dame"?"Notre Dame":"Ohio State";
      ok(q.rows===25&&q.selected==="SP+"&&(q.mine||"").includes(own),spTeam+": SP+ selected, 25 ranks, "+own+" highlighted");
      var head=await p.page.evaluate(function(){var t=document.querySelector(".rk-ratings");return {cols:[].map.call(t.querySelectorAll("thead th"),function(x){return x.textContent;}),
        cells:t.querySelector("tbody tr").children.length,trend:t.querySelectorAll(".rk-trend").length,cap:t.querySelector("caption").textContent};});
      ok(head.cols.join("|")==="Rank|Team|Rating"&&head.cells===3&&!head.trend,spTeam+": no Change column - SP+ has no history to show");
      ok(!/Rank change|No change|No earlier rank/.test(q.text+head.cap),spTeam+": and nothing claims a change or its absence");
      ok(/Predictive rating · 2026 season\./.test(q.text)&&!/Updated /.test(q.text)&&!q.banner,spTeam+": this season, no edition date CFBD never gave, fresh");
      var src=await p.page.locator(".rk-source").innerText(),href=await p.page.locator(".rk-source a").getAttribute("href");
      ok(/SP\+/.test(src)&&/CFBD/.test(src)&&/^https:\/\//.test(href),spTeam+": credited to SP+ and CFBD ("+src.trim()+")");
      ok(p.st.n===0&&p.st.spYears.join()==="2026",spTeam+": asks the edge API for this season's SP+ only, and never loads FPI for it");
      await p.page.setViewportSize({width:320,height:844});await p.page.evaluate(function(){return document.fonts.ready;});
      ok(await p.page.evaluate(function(){var t=document.querySelector(".rk-ratings"),c=t.closest(".rk-card"),a=[].slice.call(document.querySelectorAll(".poll-seg a"));
        return document.documentElement.scrollWidth<=innerWidth+1&&t.getBoundingClientRect().right<=c.getBoundingClientRect().right&&a.length===5&&a.every(function(x){var r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44;});}),
        spTeam+" 320: table and five source choices fit, 44px targets");
      var sa=await audit.auditText(p.page,"SP+ "+spTeam);ok(!sa.failures.length,"SP+ contrast "+spTeam+" "+JSON.stringify(sa.failures.slice(0,3)));
      await p.page.evaluate(function(){scrollTo(0,0);});await p.page.screenshot({path:path.join(shots,spTeam+"-sp-plus-320.png")});
      ok(!p.st.errors.length,"no page errors: "+p.st.errors.join("; "));await p.ctx.close();
    }
    var g=await open({sp:true,spMode:"fail"});await g.settled();
    ok(/SP\+ didn’t load/.test((await screen(g)).text)&&!(await screen(g)).rows,"SP+ first failure says it didn't load");
    await g.go("#top25/rankings/fpi");await g.page.waitForFunction(function(){return !/Loading FPI/.test(document.getElementById("screenTop25").textContent);});
    ok((await screen(g)).rows===25&&(await screen(g)).selected==="FPI"&&!(await screen(g)).banner,"failed SP+ leaves FPI whole and unwarned");
    await g.go("#top25/rankings");ok((await screen(g)).selected==="AP"&&!(await screen(g)).banner,"and the default stays AP, unwarned");
    g.st.spMode="slow";var n0=g.st.spN;await g.go("#top25/rankings/sp-plus");await g.go("#home");await g.go("#top25/rankings/sp-plus");
    ok(g.st.spN===n0+1,"an SP+ request in flight is joined, not repeated");
    g.st.spMode="ok";g.st.spRelease();await g.settled();ok((await screen(g)).rows===25,"re-entry after a failure recovers");
    await g.go("#home");await g.go("#top25/rankings/sp-plus");ok(g.st.spN===n0+1,"success starts SP+'s own retry clock");
    g.st.spMode="stale";await g.refresh();var st1=await screen(g);
    ok(st1.rows===25&&/outdated/.test(st1.banner)&&(st1.banner.match(/outdated/g)||[]).length===1,"the edge API's kept copy (CFBD down) shows once as outdated");
    g.st.spMode="ok";await g.ctx.setOffline(true);await g.page.waitForTimeout(100);await g.ctx.setOffline(false);await g.page.waitForTimeout(600);
    ok(!(await screen(g)).banner,"reconnect fetches SP+ again and clears the warning");
    g.st.spMode="cached";await g.refresh();ok((await screen(g)).rows===25&&/outdated/.test((await screen(g)).banner),"the page worker's saved copy (HTTP 200, X-IW-Cached) is outdated too");
    g.st.spMode="ok";g.st.sp[2026].ranks=g.st.sp[2026].ranks.slice(0,12);await g.refresh();
    ok((await screen(g)).rows===25&&/outdated/.test((await screen(g)).banner),"a partial table never replaces the whole one");
    await g.ctx.close();
    var h=await open({sp:true});h.st.sp[2026]={source:"cfbd-sp",year:2026,fetchedAt:new Date().toISOString(),ranks:[]};
    await h.page.reload();await h.settled();var past=await screen(h);
    ok(past.rows===25&&/Showing the 2025 edition/.test(past.text)&&/not the current season/.test(past.text)&&h.st.spYears.slice(-2).join()==="2026,2025",
       "this season not published: last season's table, said plainly");
    h.st.sp[2025]={source:"cfbd-sp",year:2025,fetchedAt:new Date().toISOString(),ranks:[]};await h.page.reload();await h.settled();
    ok(/SP\+ isn’t published for this season yet/.test((await screen(h)).text)&&!/didn’t load/.test((await screen(h)).text),"neither season published: said so, not called a failure");
    ok(!h.st.errors.length,"no page errors: "+h.st.errors.join("; "));await h.ctx.close();
    // Full worker cycle: install, store FPI, lose the network, reload, recover.
    var w=await open({worker:true,home:true});
    await w.page.waitForFunction(function(){return navigator.serviceWorker.controller;},null,{timeout:15000});
    await w.go("#top25/rankings/fpi");await w.settled();
    await w.page.waitForFunction(function(){return caches.match("data/league/fpi.json").then(function(r){return r&&r.headers.get("X-IW-Stored");});});
    w.st.mode="fail";await w.page.reload();await w.settled();var kept=await screen(w),before=w.st.n;
    ok(kept.rows===25&&/outdated/.test(kept.banner),"real service worker's HTTP 200 fallback remains visibly stale");
    await w.go("#home");await w.go("#top25/rankings/fpi");await w.settled();ok(w.st.n===before+1,"cached HTTP 200 does not start success timer");
    w.st.mode="ok";w.st.payload.teams[0].rating=31.2;
    await w.ctx.setOffline(true);await w.page.waitForTimeout(150);await w.ctx.setOffline(false);await w.page.waitForTimeout(600);
    ok(!(await screen(w)).banner&&/31.2/.test((await screen(w)).text),"real worker recovery refreshes FPI without reloading");
    await w.ctx.close();
    fs.writeFileSync(path.join(shots,"verification.txt"),checks.join("\n")+"\n");console.log(checks.length+" checks passed");
  } finally {await browser.close();server.close();}
})().catch(function(e){console.error(e);server.close();process.exitCode=1;});
