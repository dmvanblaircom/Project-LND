#!/usr/bin/env node
/* Deterministic browser smoke coverage for Suite's shared responsive shell.
   Provider requests are fulfilled from the adapter fixtures already kept in
   this repository. Screenshots are CI artifacts, not golden files: assertions
   gate overflow, focus visibility, team switching and key destination paint. */
"use strict";

var fs=require("fs"), http=require("http"), path=require("path");
var chromium=require("playwright").chromium;
var root=path.join(__dirname,"..");
var shots=path.join(root,"artifacts","visual");
fs.mkdirSync(shots,{recursive:true});

var fixtures={
  schedule:"espn-schedule.json", scoreboard:"espn-scoreboard.json",
  rankings:"espn-rankings.json", roster:"espn-roster.json",
  news:"espn-news.json", team:"espn-team.json", summary:"espn-summary-pre.json",
  statistics:"espn-season-stats.json"
};
function fixture(name){ return fs.readFileSync(path.join(root,"tools","fixtures",fixtures[name])); }
function mime(file){
  return file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":
    file.endsWith(".js")?"text/javascript":file.endsWith(".json")?"application/json":
    file.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
}
var server=http.createServer(function(req,res){
  var pathname=new URL(req.url,"http://localhost").pathname;
  var file=path.join(root,pathname==="/"?"index.html":pathname.slice(1));
  if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200,{"content-type":mime(file),"cache-control":"no-store"});
  fs.createReadStream(file).pipe(res);
});

function responseFor(url){
  if(/\/schedule(?:\?|$)/.test(url)) return fixture("schedule");
  if(/\/scoreboard\?/.test(url)) return fixture("scoreboard");
  if(/\/rankings(?:\?|$)/.test(url)) return fixture("rankings");
  if(/\/roster(?:\?|$)/.test(url)) return fixture("roster");
  if(/\/news\?/.test(url)) return fixture("news");
  if(/\/summary\?/.test(url)) return fixture("summary");
  if(/\/statistics(?:\?|$)/.test(url)) return fixture("statistics");
  if(/\/teams\/\d+(?:\?|$)/.test(url)) return fixture("team");
  return null;
}

(async function(){
  await new Promise(function(resolve){ server.listen(0,"127.0.0.1",resolve); });
  var base="http://127.0.0.1:"+server.address().port;
  var browser=await chromium.launch({headless:true});
  var failures=[];
  try{
    for(var wi=0;wi<2;wi++){
      var width=[375,1280][wi];
      for(var ti=0;ti<2;ti++){
        var team=["notre-dame","ohio-state"][ti];
        var context=await browser.newContext({viewport:{width:width,height:900},serviceWorkers:"block"});
        var page=await context.newPage();
        await page.route("**/*",async function(route){
          var body=responseFor(route.request().url());
          if(body) return route.fulfill({status:200,contentType:"application/json",body:body});
          if(route.request().url().startsWith(base)) return route.continue();
          return route.abort();
        });
        await page.goto(base+"/?team="+team,{waitUntil:"domcontentloaded"});
        await page.waitForSelector("#panel-schedule .season-head",{timeout:10000});
        var overflow=await page.evaluate(function(){ return document.documentElement.scrollWidth>document.documentElement.clientWidth; });
        if(overflow) failures.push(team+" "+width+"px has horizontal overflow");
        await page.keyboard.press("Tab");
        var outline=await page.evaluate(function(){
          var e=document.activeElement,s=getComputedStyle(e); return [e.id,s.outlineStyle,s.outlineWidth];
        });
        if(outline[1]==="none"||outline[2]==="0px") failures.push(team+" "+width+"px has no visible keyboard focus");
        await page.click("#moreTrigger");
        if(await page.locator("#moreMenu").isHidden()) failures.push(team+" "+width+"px More menu did not open");
        await page.screenshot({path:path.join(shots,team+"-"+width+"-home.png"),fullPage:true});
        await page.click("#tab-depth");
        await page.waitForSelector(".depth-shell");
        await page.screenshot({path:path.join(shots,team+"-"+width+"-players.png"),fullPage:true});
        await context.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  if(failures.length){ failures.forEach(function(x){console.error("FAIL "+x);}); process.exit(1); }
  console.log("Suite visual smoke passed; screenshots: "+shots);
})().catch(function(e){ console.error(e.stack||e); server.close(); process.exit(1); });
