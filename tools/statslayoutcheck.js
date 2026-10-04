#!/usr/bin/env node
/* Stats presentation: real captured teams and leaders, all rows preserved,
   aligned columns at enlarged text, and keyboard access to wide tables. */
"use strict";
var fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert"),chromium=require("playwright").chromium;
var root=path.join(__dirname,".."),audit=require("./a11yaudit"),server=require("./lib/serve")(root);
var shots=process.env.STATS_SHOTS||path.join(root,"artifacts","visual","stats-layout");fs.mkdirSync(shots,{recursive:true});
function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
function fixture(p){return JSON.parse(read("tools/fixtures/"+p));}
var ctx=vm.createContext({document:{addEventListener:function(){}},console:console,Date:Date,Intl:Intl});
["teamos/team.js","teamos/identity.js","teamos/espn.js","suite/ui.js"].forEach(function(f){vm.runInContext(read(f),ctx);});
var models={};
["notre-dame","ohio-state"].forEach(function(team){
  vm.runInContext(read("teams/"+team+".js"),ctx);var cfg=ctx.TEAM_CONFIG,t=ctx.TeamOS.createTeam(cfg.team),abbr=team==="notre-dame"?"nd":"osu",names={};
  ctx.TeamOS.espn.roster(fixture("espn-roster-"+abbr+"-oct02.json")).forEach(function(g){g.players.forEach(function(p){names[p.id]=p.name;});});
  var boxes=abbr==="nd"?["espn-summary-wis-final.json","espn-summary-msu-final.json","espn-summary-pur-final.json"]:["espn-summary-osu-g1-final.json","espn-summary-osu-g2-final.json","espn-summary-osu-kent-final.json","espn-summary-osu-ill-final.json"];
  boxes.forEach(function(f){var b=ctx.TeamOS.espn.boxNames(fixture(f));Object.keys(b).forEach(function(id){if(!names[id])names[id]=b[id];});});
  models[team]={team:{name:t.name,abbr:t.abbreviation},identity:ctx.TeamOS.identity.create(cfg,t),suite:ctx.TeamOS.identity.create({identity:ctx.Suite.ui.STYLE},t),us:ctx.TeamOS.espn.teamSeason(fixture("espn-teamstats-"+abbr+"-2026-reg.json"),abbr==="nd"?fixture("espn-sitestats-nd.json"):null),players:ctx.TeamOS.espn.namedLeaders(ctx.TeamOS.espn.seasonLeaders(fixture("espn-leaders-"+abbr+"-2026-reg.json")),names)};
});
(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});var base="http://127.0.0.1:"+server.address().port;
  var browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined}),passed=[],errors=[];
  try{
    var page=await browser.newPage({viewport:{width:390,height:844}});page.on("pageerror",function(e){errors.push(e.message);});
    await page.goto(base+"/tools/fixtures/espn-news.json");
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+base+'/app.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600;700;800&display=swap"></head><body><main class="page-main"><div id="stats"></div></main></body></html>');
    for(var file of ["suite/ui.js","suite/stats.js"])await page.addScriptTag({url:base+"/"+file});
    await page.evaluate(function(m){window.models=m;},JSON.parse(JSON.stringify(models)));
    for(var team of Object.keys(models))for(var style of ["team","suite"])for(var width of [320,375,390,768,1280])for(var scale of [1,2]){
      await page.setViewportSize({width:width,height:844});
      for(var view of ["team","players"]){
        var label=[team,style,width,scale+"x",view].join(" | ");
        await page.evaluate(function(a){
          var m=models[a.team],look=a.style==="suite"?m.suite:m.identity,r=document.documentElement.style,c=look.colors;
          r.fontSize=(a.scale*16)+"px";r.setProperty("--t-surface",c.surface);r.setProperty("--t-font-ui",look.fonts.ui);r.setProperty("--t-font-display",look.fonts.display);r.setProperty("--t-accent-on-light",c.accentOnLight);
          var other=models[a.team==="notre-dame"?"ohio-state":"notre-dame"];
          window.currentStats={team:m.team,us:m.us,players:m.players,opp:other.team,them:other.us,season:"2026",view:a.view};
          Suite.stats.paint(document.getElementById("stats"),currentStats);
        },{team:team,style:style,scale:scale,view:view});
        await page.evaluate(function(){return document.fonts.ready;});await page.waitForTimeout(60);
        assert(await page.evaluate(function(){return document.documentElement.scrollWidth<=innerWidth+1;}),label+" page overflow");
        if(view==="team"){
          assert(await page.evaluate(function(){return [].every.call(document.querySelectorAll(".ss-cols"),function(h){var cols=[h.children[1],h.children[2]],row=h.nextElementSibling.querySelector(".ss-row"),values=row.querySelectorAll(".ss-v");return cols.every(function(c,i){var a=c.getBoundingClientRect(),b=values[i].getBoundingClientRect();return Math.abs((a.left+a.right-b.left-b.right)/2)<1;});});}),label+" labels do not align");
        }else{
          assert.equal(await page.locator("tbody tr").count(),models[team].players.tables.reduce(function(n,t){return n+t.rows.length;},0),label+" hidden leader rows");
          var wraps=await page.locator(".bx-wrap").all();
          for(var wrap of wraps){
            var scrolls=await wrap.evaluate(function(e){return e.scrollWidth>e.clientWidth+1;});
            assert.equal(await wrap.getAttribute("tabindex"),scrolls?"0":null,label+" scroll region tab order");
            assert.equal(await wrap.evaluate(function(e){return e.previousElementSibling.hidden;}),!scrolls,label+" scroll cue");
            if(scrolls){
              assert(await wrap.getAttribute("aria-labelledby"));await wrap.focus();await page.keyboard.press("ArrowRight");
              await page.waitForFunction(function(){return document.activeElement.scrollLeft>0;});
              await wrap.evaluate(function(e){e.scrollLeft=e.scrollWidth;});
              assert(await wrap.evaluate(function(e){var a=e.querySelector("tbody th").getBoundingClientRect(),b=e.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}),label+" sticky name clipped");
              await wrap.evaluate(function(e){e.scrollLeft=0;});
            }
          }
          var preserved=await page.evaluate(function(){var host=document.getElementById("stats"),el=host.querySelector(".bx-wrap");el.focus();el.scrollLeft=30;var before=el.scrollLeft;Suite.stats.paint(host,currentStats);return el===host.querySelector(".bx-wrap")&&el.scrollLeft===before;});assert(preserved,label+" unchanged refresh resets table");
        }
        await page.evaluate(function(){if(document.activeElement.blur)document.activeElement.blur();});
        if(scale===1){var contrast=await audit.auditText(page,label);assert.deepStrictEqual(contrast.failures,[],label+" contrast");}
        if(scale===1&&view==="players"&&(width===320||width===1280)){var focus=await audit.auditFocus(page,label);assert.deepStrictEqual(focus.failures,[],label+" focus");}
        if(scale===1&&style==="team"&&(width===320||width===390))await page.screenshot({path:path.join(shots,team+"-"+width+"-"+view+".png")});
        passed.push("PASS "+label);
      }
    }
    // Resize one live table without redrawing: cues and keyboard access
    // track the layout, not just the viewport at the time of rendering.
    await page.evaluate(function(){document.documentElement.style.fontSize="16px";});
    for(var width2 of [320,1280,390]){
      await page.setViewportSize({width:width2,height:844});await page.waitForTimeout(80);
      assert(await page.evaluate(function(){return [].every.call(document.querySelectorAll(".bx-wrap"),function(e){return e.previousElementSibling.hidden===(e.scrollWidth<=e.clientWidth+1);});}),"Resize did not update scroll cues");
    }
    for(var v of ["team","players"])for(var state of ["loading","offline"]){
      await page.evaluate(function(a){Suite.stats.paint(document.getElementById("stats"),{team:models["notre-dame"].team,view:a.view,season:"2026",failed:a.state==="offline",playersFailed:a.state==="offline",offline:a.state==="offline"});},{view:v,state:state});
      var text=await page.locator("#stats").innerText();assert(text.indexOf(state==="offline"?"You're offline":"Loading")!==-1);assert.equal(await page.locator(".ss-row,tbody tr").count(),0);passed.push("PASS "+v+" "+state);
    }
    assert.deepStrictEqual(errors,[]);fs.writeFileSync(path.join(shots,"verification.txt"),passed.join("\n")+"\n");console.log(passed.join("\n"));
  }finally{await browser.close();server.close();}
})().catch(function(e){console.error(e);server.close();process.exitCode=1;});
