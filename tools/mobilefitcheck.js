#!/usr/bin/env node
/* Oct 10 live-scan layout regressions, plus longer names/ranks. Drawn in the
   real app (tools/lib/stage.js, decision 0048): the app boots on the
   fixtures under the team's own look, and each controlled state is painted
   by the app's own renderers into its own screens. Measures painted text,
   not rounded scrollWidth. Halftime's receiver remains visible (David,
   PR #23). */
"use strict";
var fs=require("fs"),path=require("path"),chromium=require("playwright").chromium;
var root=path.join(__dirname,".."),server=require("./lib/serve")(root),stage=require("./lib/stage");
var shots=process.env.MOBILEFIT_SHOTS||path.join(root,"artifacts/visual/mobilefit");
fs.mkdirSync(shots,{recursive:true});

// Paint one case into the app's own screen, show only that screen, and
// return what the fan would see go wrong. Runs in the page.
function measure(which){
  function show(id){[].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!==id;});window.scrollTo(0,0);}
  function rectText(el){var r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();}
  function inside(el){var r=rectText(el),b=el.getBoundingClientRect();return r.left>=b.left-.5&&r.right<=b.right+.5;}
  function hit(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
  var t=TeamOS.createTeam(TEAM_CONFIG.team),home=Suite.home.__wrapped,game=Suite.game.__wrapped;
  var team={name:t.name,abbr:t.abbreviation,markUrl:""},g={id:"fit",status:"live",state:"in",home:true,date:"2026-10-10T20:15:00Z",oppName:"Maryland",oppAbbr:"MD",usRank:15,usRecord:"4-1",oppRecord:"3-2",us:31,them:10,period:2,clock:"1:37",situation:{possession:"them",short:"1st & 10",spot:"MD 49"}};
  var H=document.getElementById("screenHome"),G=document.getElementById("screenGame"),T=document.getElementById("screenTop25");
  if(which==="live"){
    show("screenHome");
    home(H,{team:team,oppMark:function(){return "";},art:{},hero:{game:g},news:[],outlook:[],fresh:null,schedule:[Object.assign({},g,{status:"scheduled",state:"pre",venue:"Los Angeles Memorial Coliseum",oppName:"Southern California",oppAbbr:"USC",net:"NBC"})]});
    var venue=H.querySelector(".sched-meta");
    return {
      "Home names and ranks fit their columns":[].every.call(H.querySelectorAll(".sb-name"),inside),
      "Home venue is fully readable":!!venue&&getComputedStyle(venue).textOverflow!=="ellipsis"&&venue.scrollWidth<=venue.clientWidth+1,
      "No page overflow (Home live)":document.documentElement.scrollWidth<=innerWidth+1
    };
  }
  if(which==="next"){
    // Upcoming, the opponent with no record (Navy, David's iPhone 2026-10-25)
    show("screenHome");
    var next=Object.assign({},g,{id:"next",status:"scheduled",state:"pre",timeSet:true,date:"2026-10-31T16:00:00Z",oppName:"Navy",oppAbbr:"NAVY",oppRecord:null,us:null,them:null,situation:null});
    home(H,{team:team,oppMark:function(){return "";},art:{},hero:{game:next},news:[],outlook:[],fresh:null,schedule:[]});
    var m=H.querySelectorAll(".sb-team .mark");
    return {
      "Home marks sit on one line when only one side has a record":m.length===2&&Math.abs(m[0].getBoundingClientRect().top-m[1].getBoundingClientRect().top)<=1,
      "No page overflow (Home next)":document.documentElement.scrollWidth<=innerWidth+1
    };
  }
  if(which==="half"){
    show("screenGame");
    var half=Object.assign({},g,{clock:"0:00",detail:"Halftime",situation:{receives:"them"}});
    game(G,{team:team,oppMark:function(){return "";},game:half,detail:null,lifecycle:TeamOS.game.lifecycle(half),view:"details",side:"us",open:{},now:new Date("2026-10-10T21:50:00Z")});
    var ball=G.querySelector(".gh-ball"),recv=G.querySelector(".gc-situation"),clock=G.querySelector(".stage-pill");
    return {
      "Halftime: no football, and who gets the ball is said, clear of the status and on the screen":!ball&&!!recv&&/gets the ball/.test(recv.textContent)&&!!clock&&/Halftime/i.test(clock.textContent)&&!hit(recv.getBoundingClientRect(),rectText(clock))&&(function(r){return r.left>=-.5&&r.right<=innerWidth+.5;})(rectText(recv)),
      "No page overflow (Game halftime)":document.documentElement.scrollWidth<=innerWidth+1
    };
  }
  show("screenTop25");
  Suite.top25.paint(T,{view:"games",games:[{id:"ranked",date:g.date,state:"in",status:"live",detail:"3:15 · 2nd",home:{name:"Tennessee",abbr:"TENN",rank:15,record:"4-1",score:21},away:{name:"South Carolina",abbr:"SC",rank:22,record:"4-1",score:14},live:{}}],mark:function(){return "";},now:new Date(g.date)});
  return {
    "Top 25 names and records stay inside their column":T.querySelectorAll(".tg-name").length>0&&[].every.call(T.querySelectorAll(".tg-name"),inside),
    "No page overflow (Top 25)":document.documentElement.scrollWidth<=innerWidth+1
  };
}

(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});
  var base="http://127.0.0.1:"+server.address().port;
  var browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined}),failures=[],count=0;
  try {
    for(var team of ["notre-dame","ohio-state"])for(var style of ["team","suite"]){
      var o=await stage.open(browser,base,{team:team,style:style,width:390,screen:"home",still:true});
      if(!o.ready){failures.push([team,style,"the app never drew Home"].join(" | "));await o.ctx.close();continue;}
      var page=o.page;
      await stage.hold(page);
      for(var width of [320,375,390,768,1280]){
        await page.setViewportSize({width:width,height:1000});
        for(var which of ["live","next","half","top25"]){
          await page.evaluate(measure,which);
          await page.evaluate(function(){return document.fonts.ready;});
          await page.evaluate(function(){window.dispatchEvent(new Event("resize"));});
          // measured after the resize settles, painted the same way again
          var checks=await page.evaluate(measure,which);
          Object.keys(checks).forEach(function(k){count++;if(!checks[k])failures.push([team,style,width,k].join(" | "));});
          if(style==="team"&&(width===320||width===390)&&(which==="live"||which==="half"))
            await page.screenshot({path:path.join(shots,team+"-"+width+"-"+which+".png"),fullPage:true});
        }
      }
      await o.ctx.close();
    }
    fs.writeFileSync(path.join(shots,"verification.json"),JSON.stringify({checks:count,failures:failures},null,2));
    console.log(count+" checks; "+failures.length+" failures"+(failures.length?"\n"+failures.join("\n"):""));
    if(failures.length)process.exitCode=1;
  } finally {await browser.close();server.close();}
})().catch(function(e){console.error(e);server.close();process.exitCode=1;});
