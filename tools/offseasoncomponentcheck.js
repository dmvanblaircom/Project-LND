#!/usr/bin/env node
/* W16 production season renderer review: actual module and CSS, not a
   second set of hard-coded markup. All data in this harness is illustrative. */
"use strict";
const path=require("path"),fs=require("fs"),assert=require("assert");
const {chromium}=require("playwright");
const root=path.join(__dirname,".."),server=require("./lib/serve")(root);
const shots=path.join(root,"artifacts/visual/offseason-component");
fs.mkdirSync(shots,{recursive:true});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined});
 let checks=0;
 try{
 for(const team of ["notre-dame","ohio-state"])for(const style of ["suite","team"])for(const state of ["awaiting","complete","failed"]){
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:"America/New_York"});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(base+"/docs/design/offseason-component-review.html?team="+team+"&style="+style+"&state="+state);
  await page.waitForSelector(".os-hero");await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,375,390,1280]){
   await page.setViewportSize({width,height:844});
   const d=await page.evaluate(()=>{
    const h=document.querySelector(".os-hero"),res=h.querySelector(".os-result-details b"),cta=h.querySelector(".os-results"),r=h.getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,heroLeft:r.left,heroRight:r.right,opponent:res.textContent,ctaH:cta.getBoundingClientRect().height,copy:h.textContent,heading:h.querySelector("h2").textContent};
   });
   assert(!d.overflow,team+" "+style+" "+state+" "+width+" viewport overflow");
   assert(d.heroLeft>=-1&&d.heroRight<=width+1, "hero bounds at "+width);
   assert(/Sample State University/.test(d.opponent),"source-opponent slot");
   assert(d.ctaH>=44,"accessible CTA target");
   assert(state==="awaiting"?/Regular season complete/.test(d.heading):/Season complete/.test(d.heading),"correct phase");
   assert(state==="failed"?/couldn’t load/.test(d.copy):state==="complete"?/not available yet/.test(d.copy):/Bowl and playoff selections/.test(d.copy),"distinct source outcome");
   checks+=6;
   if(width===390)await page.screenshot({path:path.join(shots,team+"-"+style+"-"+state+".png"),fullPage:true});
  }
  assert(!errors.length,errors.join("; "));checks++;
  await page.close();
 }
 console.log(checks+" offseason production-render browser assertions passed; 12 captures");
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
