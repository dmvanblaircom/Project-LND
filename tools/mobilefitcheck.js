#!/usr/bin/env node
/* Oct 10 live-scan layout regressions, plus longer names/ranks. Render the
   real components with controlled states; measure painted text, not rounded
   scrollWidth. Halftime's receiver remains visible (David, PR #23). */
"use strict";
var fs=require("fs"),path=require("path"),chromium=require("playwright").chromium;
var root=path.join(__dirname,".."),server=require("./lib/serve")(root);
var shots=process.env.MOBILEFIT_SHOTS||path.join(root,"artifacts/visual/mobilefit");
fs.mkdirSync(shots,{recursive:true});
(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});
  var base="http://127.0.0.1:"+server.address().port;
  var browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined}),failures=[],count=0;
  try {
    for(var team of ["notre-dame","ohio-state"]){
      var page=await browser.newPage({timezoneId:"America/New_York"});
      await page.route("**/*",function(r){return r.request().url().startsWith(base)?r.continue():r.abort();});
      await page.goto(base+"/tools/fixtures/espn-news.json");
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+base+'/app.css"></head><body><main class="page-main"><div id="home"></div><div id="game"></div><div id="top"></div></main></body></html>');
      for(var f of ["teams/"+team+".js","teamos/team.js","teamos/identity.js","teamos/espn.js","teamos/game.js","teamos/live.js","suite/ui.js","suite/schedule.js","suite/home.js","suite/game.js","suite/top25.js"])
        await page.addScriptTag({url:base+"/"+f});
      for(var style of ["team","suite"])for(var width of [320,375,390,768,1280]){
        await page.setViewportSize({width:width,height:1000});
        await page.evaluate(function(style){
          var t=TeamOS.createTeam(TEAM_CONFIG.team),look=TeamOS.identity.create(style==="suite"?{identity:Suite.ui.STYLE}:TEAM_CONFIG,t),c=look.colors,s=document.documentElement.style;
          [["accent",c.accent],["accent-text",c.accentText],["accent-on-light",c.accentOnLight],["accent-tint-soft",c.accentTintSoft],["surface",c.surface],["surface-rgb",c.surfaceRgb],["abyss",c.surfaceAbyss],["abyss-rgb",c.surfaceAbyssRgb],["deep",c.surfaceDeep],["deep-rgb",c.surfaceDeepRgb],["font-ui",look.fonts.ui],["font-display",look.fonts.display]].forEach(function(x){s.setProperty("--t-"+x[0],x[1]);});
          var team={name:t.name,abbr:t.abbreviation,markUrl:""},g={id:"fit",status:"live",state:"in",home:true,date:"2026-10-10T20:15:00Z",oppName:"Maryland",oppAbbr:"MD",usRank:15,usRecord:"4-1",oppRecord:"3-2",us:31,them:10,period:2,clock:"1:37",situation:{possession:"them",short:"1st & 10",spot:"MD 49"}};
          Suite.home.paint(document.getElementById("home"),{team:team,oppMark:function(){return "";},art:{},hero:{game:g},news:[],outlook:[],fresh:null,schedule:[Object.assign({},g,{status:"scheduled",state:"pre",venue:"Los Angeles Memorial Coliseum",oppName:"Southern California",oppAbbr:"USC",net:"NBC"})]});
          var half=Object.assign({},g,{clock:"0:00",detail:"Halftime",situation:{receives:"them"}});
          Suite.game.paint(document.getElementById("game"),{team:team,oppMark:function(){return "";},game:half,detail:null,lifecycle:TeamOS.game.lifecycle(half),view:"details",side:"us",open:{},now:new Date("2026-10-10T21:50:00Z")});
          Suite.top25.paint(document.getElementById("top"),{view:"games",games:[{id:"ranked",date:g.date,state:"in",status:"live",detail:"3:15 · 2nd",home:{name:"Tennessee",abbr:"TENN",rank:15,record:"4-1",score:21},away:{name:"South Carolina",abbr:"SC",rank:22,record:"4-1",score:14},live:{}}],mark:function(){return "";},now:new Date(g.date)});
        },style);
        await page.evaluate(function(){return document.fonts.ready;});
        await page.evaluate(function(){window.dispatchEvent(new Event("resize"));});
        var checks=await page.evaluate(function(){
          function rectText(el){var r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();}
          function inside(el){var r=rectText(el),b=el.getBoundingClientRect();return r.left>=b.left-.5&&r.right<=b.right+.5;}
          function hit(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
          var ball=document.querySelector("#game .gh-ball"),recv=document.querySelector("#game .gc-situation"),clock=document.querySelector(".gh-clock"),venue=document.querySelector("#home .sched-meta");
          return {
            "Top 25 names and records stay inside their column":[].every.call(document.querySelectorAll(".tg-name"),inside),
            "Home names and ranks fit their columns":[].every.call(document.querySelectorAll(".gc-name"),inside),
            "Home venue is fully readable":!!venue&&getComputedStyle(venue).textOverflow!=="ellipsis"&&venue.scrollWidth<=venue.clientWidth+1,
            "Halftime: no football, and who gets the ball is said, clear of the status":!ball&&!!recv&&/gets the ball/.test(recv.textContent)&&!!clock&&/Halftime/i.test(clock.textContent)&&!hit(recv.getBoundingClientRect(),rectText(clock)),
            "No page overflow":document.documentElement.scrollWidth<=innerWidth+1
          };
        });
        Object.keys(checks).forEach(function(k){count++;if(!checks[k])failures.push([team,style,width,k].join(" | "));});
        if(style==="team"&&(width===320||width===390))await page.screenshot({path:path.join(shots,team+"-"+width+".png"),fullPage:true});
      }
      await page.close();
    }
    fs.writeFileSync(path.join(shots,"verification.json"),JSON.stringify({checks:count,failures:failures},null,2));
    console.log(count+" checks; "+failures.length+" failures"+(failures.length?"\n"+failures.join("\n"):""));
    if(failures.length)process.exitCode=1;
  } finally {await browser.close();server.close();}
})().catch(function(e){console.error(e);server.close();process.exitCode=1;});
