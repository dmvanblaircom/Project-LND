#!/usr/bin/env node
/* Full Home + seasonal nav presentation boundary. Fixtures are conspicuously
   illustrative; this does not substitute for the controller's season tests. */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const {chromium}=require("playwright"),audit=require("./a11yaudit");
const root=path.join(__dirname,".."),server=require("./lib/serve")(root);
const shots=path.join(root,"artifacts/visual/offseason-home");
fs.mkdirSync(shots,{recursive:true});
let checks=0;
function check(value,label){assert(value,label);checks++;}
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined});
 try{
 for(const team of ["notre-dame","ohio-state"])for(const style of ["suite","team"]){
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:"America/New_York"});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(base+"/docs/design/offseason-home-review.html?team="+team+"&style="+style+"&state=complete");
  await page.waitForFunction(()=>window.reviewReady);
  for(const state of ["awaiting","complete","failed","opener","in-season"]){
   await page.selectOption("#reviewState",state);
   await page.evaluate(()=>document.fonts.ready);
   for(const width of [320,375,390,768,1280]){
    await page.setViewportSize({width,height:844});
    const d=await page.evaluate(()=>{
     const hero=document.querySelector('[data-home="hero"]'),r=hero.getBoundingClientRect();
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,left:r.left,right:r.right,
      order:[...document.querySelectorAll("[data-home]")].map(e=>e.dataset.home),
      tabs:[...document.querySelectorAll("#navbar a")].map(a=>({screen:a.dataset.screen,height:a.getBoundingClientRect().height,width:a.getBoundingClientRect().width})),
      season:!!hero.querySelector(".os-hero"),game:!!hero.querySelector(".gamecard"),copy:hero.textContent};
    });
    const label=[team,style,state,width].join(" ");
    check(!d.overflow&&d.left>=-1&&d.right<=width+1,label+" fits page");
    check(d.tabs.length===5&&d.tabs.every(t=>t.width>=44&&t.height>=44),label+" five 44px targets");
    const complete=["complete","failed","opener"].includes(state);
    check(d.order.indexOf("news")===(complete?3:5),label+" News order");
    check(d.season===["awaiting","complete","failed"].includes(state),label+" season hero boundary");
    check(d.game===["opener","in-season"].includes(state),label+" existing game hero");
    if(state==="opener")check(/Time TBA/.test(d.copy)&&!/\d:\d\d/.test(d.copy),label+" no invented kickoff");
    if((width===320||width===390||width===1280)&&state!=="in-season"){
     // Capture the product viewport, not the fixture controls or a stitched
     // full-page image with fixed navigation painted across later content.
     await page.locator(".review-controls").evaluate(e=>e.hidden=true);
     await page.evaluate(()=>window.scrollTo(0,0));
     await page.screenshot({path:path.join(shots,[team,style,state,width].join("-")+".png")});
     await page.locator(".review-controls").evaluate(e=>e.hidden=false);
    }
   }
  }
  await page.setViewportSize({width:320,height:844});
  await page.selectOption("#reviewState","complete");
  for(const width of [320,768]){
   await page.setViewportSize({width,height:844});
   const enlarged=await page.evaluate(()=>{
    document.documentElement.style.fontSize="32px";
    return {fits:document.documentElement.scrollWidth<=innerWidth+1,outliers:[...document.querySelectorAll("body *")].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).map(e=>e.tagName+"."+e.className)};
   });
   check(enlarged.fits,team+" "+style+" enlarged text fits "+width+" "+JSON.stringify(enlarged.outliers));
   await page.evaluate(()=>document.documentElement.style.fontSize="");
  }
  await page.setViewportSize({width:320,height:844});
  // News has Georgia in both styles; actual painted contrast, including
  // the new hero and two replacement navigation controls, must pass.
  check(await page.locator(".news-hl").evaluate(e=>getComputedStyle(e).fontFamily.includes("Georgia")),"Georgia preserved");
  const text=await audit.auditText(page,team+" "+style+" offseason");
  check(text.failures.length===0,JSON.stringify(text.failures));
  // Freeze fixture timestamps while measuring identical refreshes.
  const stable=await page.evaluate(()=>{
   const news=document.querySelector(".news-card"),row=document.querySelector(".news-row");
   news.focus({preventScroll:true});row.scrollLeft=17;
   const before=row.scrollLeft;
   Suite.home.paint(document.getElementById("home"),homeModel);
   return document.activeElement===news&&document.querySelector(".news-card")===news&&row.scrollLeft===before;
  });
  check(stable,"unchanged Home refresh keeps News DOM, focus and scroll");
  // Move back to S2 with the same news model, then into S4 while focused.
  check(await page.evaluate(()=>{
   homeModel.offseason.phase.state="awaiting-postseason";
   Suite.home.paint(document.getElementById("home"),homeModel);
   const link=document.querySelector(".news-card");link.focus({preventScroll:true});
   homeModel.offseason.phase.state="complete";
   Suite.home.paint(document.getElementById("home"),homeModel);
   return document.activeElement===link&&document.querySelector(".news-card")===link;
  }),"moving News preserves focused link");
  // A baseline in-season render must remain byte-identical with an
  // explicit S1/S3 model; S5 still uses the existing upcoming card.
  await page.selectOption("#reviewState","in-season");
  check(await page.evaluate(()=>{
   const host=document.getElementById("home"),before=host.innerHTML;
   homeModel.offseason={phase:{state:"in-season"}};Suite.home.paint(host,homeModel);
   const s1=host.innerHTML===before;
   homeModel.offseason.phase.state="postseason";Suite.home.paint(host,homeModel);
   return s1&&host.innerHTML===before;
  }),"S1/S3 existing presentation unchanged");
  await page.locator('#navbar [data-screen="game"]').focus();
  check(await page.evaluate(()=>{
   Suite.nav.setGameState("live");Suite.nav.setSeasonNav({top25:false,game:false});
   const schedule=document.querySelector('#navbar [data-screen="schedule"]');
   const focused=document.activeElement===schedule,quiet=!document.getElementById("navbar").classList.contains("game-raised");
   Suite.nav.setSeasonNav({top25:false,game:false});
   return focused&&quiet&&document.activeElement===schedule&&schedule===document.querySelector('#navbar [data-screen="schedule"]');
  }),"replaced tab receives focus; repeated flags keep node; absent Game never pulses");
  for(const [route,selected] of [["#news","news"],["#schedule/results","schedule"],["#schedule/900001","schedule"],["#game","more"],["#top25/rankings","more"],["#settings",null],["#more/news","news"]]){
   await page.evaluate(hash=>{location.hash=hash;},route);
   await page.waitForFunction(s=>(document.querySelector("#navbar [aria-current=page]")?.dataset.screen||null)===s,selected);
   check(true,"saved route "+route+" selected "+selected);
  }
  await page.evaluate(()=>Suite.nav.go("more"));
  await page.waitForSelector("#more:not([hidden])");
  check(await page.locator('#more a[href="#game"]').count()===1&&await page.locator('#more a[href="#top25/rankings"]').count()===1,"More keeps both saved destinations");
  // Game returns within 14 days even if AP has not yet published; Top 25
  // can remain through the title game after the team's own season ends.
  for(const flags of [{top25:false,game:true},{top25:true,game:false},{top25:true,game:true}]){
   const tabs=await page.evaluate(f=>{
    Suite.nav.setSeasonNav(f);Suite.more.menu(document.getElementById("more"));
    return [...document.querySelectorAll("#navbar a")].map(a=>a.dataset.screen);
   },flags);
   check(JSON.stringify(tabs)===JSON.stringify(["home",flags.top25?"top25":"news",flags.game?"game":"schedule","roster","more"]),"independent calendar flags "+JSON.stringify(flags));
  }
  check(await page.locator("#navbar").evaluate(e=>e.classList.contains("game-raised")),"restored Game preserves its normalized live state");
  await page.evaluate(()=>{Suite.nav.setGameState(null);Suite.nav.go("home");});
  await page.waitForSelector("#home:not([hidden])");
  await page.selectOption("#reviewState","complete");
  const focus=await audit.auditFocus(page,team+" "+style+" offseason");
  check(focus.failures.length===0,JSON.stringify(focus.failures));
  check(!errors.length,errors.join("; "));
  await page.close();
 }
 console.log(checks+" offseason Home/navigation assertions passed; 48 responsive captures");
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
