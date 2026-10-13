#!/usr/bin/env node
"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert/strict");
const {build}=require("./build-environment.cjs"),serve=require("./lib/serve"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),temp=fs.mkdtempSync(path.join(os.tmpdir(),"suite-environment-ui-"));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM || undefined});
 try{
  for(const environment of ["dev","lab","preview"]) {
   const out=path.join(temp,environment),sha="4".repeat(40);
   build({root,out,environment,commitSHA:sha,branch:environment==="preview"?"feat/test":environment});
   const server=serve(out);await new Promise(r=>server.listen(0,"127.0.0.1",r));
   const base="http://127.0.0.1:"+server.address().port;
   try{
    for(const width of [320,390])for(const team of ["notre-dame","ohio-state"]) {
     const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:"block"}),page=await context.newPage();
     const edge=[],errors=[];page.on("pageerror",e=>errors.push(e.message));
     await page.route("**/*",route=>{
      const url=route.request().url();if(url.startsWith(base))return route.continue();
      if(url.includes("suite-api"))edge.push(url);
      return route.fulfill({status:200,contentType:"application/json",body:"{}"});
     });
     await page.goto(base+"/?team="+team+"#settings");
     await page.locator("#screenSettings").waitFor({state:"visible"});
     await page.locator("#st-environment").waitFor({state:"visible"});
     assert.equal(await page.locator("#environmentBadge").innerText(),environment.toUpperCase());
     assert.ok((await page.locator("#screenSettings").innerText()).includes("Game alerts are disabled"));
     assert.equal(await page.locator("[data-alerts]").count(),0);
     assert.ok((await page.locator("#screenSettings").innerText()).includes(sha.slice(0,12)));
     // Even a synthetic Turn On control cannot bypass the environment guard.
     await page.evaluate(()=>{const b=document.createElement("button");b.dataset.alerts="on";document.body.appendChild(b);b.click();b.remove();});
     assert.equal(edge.length,0,"Lab must not request any production edge route");
     assert.equal(errors.length,0,errors.join("; "));
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"No horizontal page overflow");
     fs.mkdirSync(path.join(root,"artifacts/visual"),{recursive:true});
     await page.screenshot({path:path.join(root,"artifacts/visual",environment+"-"+team+"-"+width+"-settings.png"),fullPage:true});
     await context.close();
    }
   }finally{await new Promise(r=>server.close(r));}
  }
  console.log("DEV/Lab/preview in both teams at 320/390: visible build, distinct install identity, no production API/push calls, no errors or page overflow.");
 }finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
