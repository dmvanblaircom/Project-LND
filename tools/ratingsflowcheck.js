#!/usr/bin/env node
/* W07: real app routes, both teams/styles, request recovery, per-source
   freshness and the REAL worker's HTTP 200 cached fallback. No live APIs. */
"use strict";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS="1";
var fs=require("fs"),path=require("path"),assert=require("assert");
var chromium=require("playwright").chromium,root=path.join(__dirname,".."),audit=require("./a11yaudit");
var server=require("./lib/serve")(root),shots=path.join(root,"artifacts/visual/ratings");
var snap=JSON.parse(fs.readFileSync(path.join(root,"data/league/fpi.json"))),checks=[];
function fixture(n){return fs.readFileSync(path.join(root,"tools/fixtures",n));}
function ok(value,label){assert(value,label);checks.push(label);}
fs.mkdirSync(shots,{recursive:true});
(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});
  var base="http://127.0.0.1:"+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined});
  async function open(opts){
    opts=opts||{};
    var ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:"America/New_York",serviceWorkers:opts.worker?"allow":"block"});
    var st={mode:opts.mode||"ok",n:0,payload:JSON.parse(JSON.stringify(snap)),errors:[]},page=await ctx.newPage();
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
      if(u.startsWith(base))return route.continue();
      var f=/\/rankings/.test(u)?"espn-rankings-sep20.json":/\/scoreboard\?/.test(u)?"espn-scoreboard-sep26.json":/\/schedule\?seasontype=3/.test(u)?"espn-schedule-nd-2025-post.json":/\/teams\/194\/schedule/.test(u)?"espn-schedule-osu-2026.json":/\/schedule/.test(u)?"espn-schedule-nd-sep24.json":null;
      return f?route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:fixture(f)}):route.abort();
    });
    async function go(hash){await page.evaluate(function(h){location.hash=h;},hash);await page.waitForTimeout(160);}
    async function settled(){await page.waitForFunction(function(){var h=document.querySelector("#screenTop25");return h&&!h.hidden&&!document.getElementById("launch")&&!/Loading FPI/.test(h.textContent);},null,{timeout:15000});await page.waitForTimeout(100);}
    async function refresh(){await go("#settings");await page.locator("[data-refresh]").click({force:true});await page.waitForFunction(function(){return !document.querySelector('[data-refresh][aria-disabled="true"]');});await go("#top25/rankings/fpi");}
    await page.goto(base+"/?team="+(opts.team||"notre-dame")+(opts.home?"#home":"#top25/rankings/fpi"));
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
