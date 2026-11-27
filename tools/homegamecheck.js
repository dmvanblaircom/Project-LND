#!/usr/bin/env node
/* David's Home/Game regressions: every matchup edge, aligned probability
   tracks, and the same photo -> publisher logo -> source fallback on both
   news surfaces. Drawn in the real app (tools/lib/stage.js, decision 0048):
   the app boots on the fixtures under the team's own look, and each case is
   painted by the app's own renderers into its own screens. */
"use strict";
var fs=require("fs"),path=require("path"),assert=require("assert");
var chromium=require("playwright").chromium;
var root=path.join(__dirname,".."),serve=require("./lib/serve"),stage=require("./lib/stage"),audit=require("./a11yaudit");
var server=serve(root),shots=process.env.HOMEGAME_SHOTS || path.join(root,"artifacts","visual","homegame");
fs.mkdirSync(shots,{recursive:true});
// Show one of the app's screens (by id) and hide the rest, as its nav does.
function show(page,id){return page.evaluate(function(id){[].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!==id;});window.scrollTo(0,0);},id);}
(async function(){
  await new Promise(function(r){server.listen(0,"127.0.0.1",r);});
  var base="http://127.0.0.1:"+server.address().port;
  var browser=await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM || undefined});
  var passed=[];
  try{
    for(var team of ["notre-dame","ohio-state"]){
      var requests={},page,context;
      for(var style of ["team","suite"]){
      var o=await stage.open(browser,base,{team:team,style:style,width:390,screen:"home",still:true});
      assert(o.ready,"The app never drew Home for "+team+" "+style);
      page=o.page;context=o.ctx;
      await stage.hold(page);
      await page.route("https://images.test/**",function(r){
        var u=r.request().url();requests[u]=(requests[u]||0)+1;
        if(u.indexOf("broken")!==-1)return r.fulfill({status:404,body:"missing"});
        return r.fulfill({contentType:"image/png",body:fs.readFileSync(path.join(root,"assets/suite/favicon-64.png"))});
      });
      await page.evaluate(function(){var t=TeamOS.createTeam(TEAM_CONFIG.team);window.reviewTeam={name:t.name,abbr:t.abbreviation,markUrl:""};
        window.homePaint=Suite.home.__wrapped||Suite.home.paint;window.gamePaint=Suite.game.__wrapped||Suite.game.paint;});
      for(var width of [320,375,390,768,1280]){
        await page.setViewportSize({width:width,height:844});
        for(var scale of [1,2]){
          await page.evaluate(function(scale){
            document.documentElement.style.fontSize=(16*scale)+"px";
            [].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!=="screenTop25";});
            // Season Outlook's card is Around's (David, 2026-11-05)
            var around=document.getElementById("screenTop25");
            Suite.top25.paint(around,{view:"games",games:null,polls:null,outlook:[
              {key:"title",label:"National title",value:42,change:0},
              {key:"playoff",label:"Make the playoffs",value:74,change:4,stale:true,asOf:"2026-10-02T14:30:00Z"}],fresh:null,now:new Date()});
          },scale);
          await page.evaluate(function(){return document.fonts.ready;});
          var alignment=await page.evaluate(function(){
            var a=[].map.call(document.querySelectorAll(".out-metric"),function(e){var r=e.getBoundingClientRect(),b=e.querySelector(".out-bar").getBoundingClientRect();return{top:r.top,left:r.left,bar:b.top,width:b.width};});
            return{rows:a,overflow:document.documentElement.scrollWidth>innerWidth+1};
          });
          assert(!alignment.overflow,"Outlook overflows "+team+style+width+scale);
          var a=alignment.rows;
          if(Math.abs(a[0].top-a[1].top)<1)assert(Math.abs(a[0].bar-a[1].bar)<1,"Probability tracks do not align "+JSON.stringify(a));
          assert(a.every(function(x){return x.width>0;}),"A probability track disappeared");
          if(scale===1 && style==="team" && (width===320||width===390||width===1280))
            await page.locator(".outlook").screenshot({path:path.join(shots,team+"-"+width+"-outlook.png")});
          passed.push("PASS "+[team,style,width,scale+"x","Outlook alignment"].join(" | "));
        }
        await page.evaluate(function(){
          document.documentElement.style.fontSize="";
          [].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!=="screenGame";});
          var keys=["pointsFor","pointsAllowed","totalOffense","rushOffense","passOffense","rushDefense","passDefense","sacks","turnoverMargin"],labels=["Points per game","Points allowed","Total offense","Rushing offense","Passing offense","Rushing defense","Passing defense","Sacks","Turnover margin"];
          function ordinal(n){var last=n%100;return n+((last>=11&&last<=13)?"th":n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th");}
          function rows(values,ranks){return keys.map(function(k,i){return{key:k,label:labels[i],value:i<7?values[i].toFixed(1):String(values[i]),rank:ranks[i],rankText:ranks[i]?(i>6?"Tied-":"")+ordinal(ranks[i]):null};});}
          var g={id:"review",status:"scheduled",state:"pre",home:true,date:"2026-10-03T19:30:00Z",oppName:"North Carolina",oppAbbr:"UNC"};
          gamePaint(document.getElementById("screenGame"),{team:reviewTeam,oppMark:function(){return "";},game:g,detail:null,lifecycle:TeamOS.game.lifecycle(g),view:"details",preview:{us:rows([42.3,8.3,416.8,141.8,275,53.8,145.5,13,7],[17,null,62,98,48,null,null,10,10]),them:rows([23.3,13.7,366,155,211,123,189.3,10,0],[102,null,93,80,145,null,null,33,41])},side:"us",open:{},weather:null,now:new Date("2026-10-02T12:00:00Z")});
        });
        var edges=await page.evaluate(function(){return [].map.call(document.querySelectorAll(".mu-row"),function(r){return{side:r.querySelector(".mu-v.better").classList.contains("us")?"us":"them",arrow:r.querySelector(".mu-arrow").classList.contains("l")?"us":"them"};});});
        assert.deepStrictEqual(edges.map(function(x){return x.side;}),["us","us","us","them","us","us","us","us","us"]);
        assert(edges.every(function(x){return x.side===x.arrow;}),"Arrow disagrees with highlight");
        // The better side must stand out MORE than the other, not merely
        // differ (David, 2026-11-25: on the dark screen a faint gold tint read
        // duller than the neutral navy inset, so the loser looked highlighted).
        // Salience: how far a cell's ground or edge stands from the card's
        // ground, as a contrast ratio, composited the way the eye sees it.
        var salience=await page.evaluate(function(){
          function rgba(c){var m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
          function over(f,b){return f?{r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1}:b;}
          function lum(c){return[c.r,c.g,c.b].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}).reduce(function(s,v,i){return s+v*[0.2126,0.7152,0.0722][i];},0);}
          function ratio(a,b){var x=lum(a),y=lum(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
          function ground(e){var stack=[],n=e;while(n&&n.nodeType===1){var c=rgba(getComputedStyle(n).backgroundColor);if(c&&c.a>0)stack.unshift(c);if(c&&c.a===1)break;n=n.parentElement;}
            var base={r:255,g:255,b:255,a:1};stack.forEach(function(c){base=over(c,base);});return base;}
          function edge(e,bg){var sh=getComputedStyle(e).boxShadow;if(!sh||sh==="none")return 1;var c=rgba(sh);return c&&c.a>0?ratio(over(c,bg),bg):1;}
          var card=ground(document.querySelector(".mu-list"));
          return [].map.call(document.querySelectorAll(".mu-row"),function(row){
            var b=row.querySelector(".mu-v.better"),o=row.querySelector(".mu-v:not(.better)");if(!b||!o)return null;
            function sal(e){var g=ground(e);return Math.max(ratio(g,card),edge(e,g));}
            return{label:row.querySelector(".mu-l").textContent.trim(),better:sal(b),other:sal(o)};
          }).filter(Boolean);
        });
        var backwards=salience.filter(function(r){return!(r.better>r.other+0.15);});
        assert(salience.length&&!backwards.length,"The better stat does not stand out more than the other ("+team+" "+style+" "+width+"): "+JSON.stringify(backwards));
        assert(await page.evaluate(function(){return document.documentElement.scrollWidth<=innerWidth+1;}),"Matchup overflows");
        var contrast=await audit.auditText(page,"matchup "+team+style+width);assert.deepStrictEqual(contrast.failures,[],JSON.stringify(contrast.failures.slice(0,6)));
        if(style==="team"&&(width===320||width===390))await page.locator(".game-body .gcard").first().screenshot({path:path.join(shots,team+"-"+width+"-matchup.png")});
        passed.push("PASS "+[team,style,width,"nine highlighted comparisons and arrows"].join(" | "));
        await page.evaluate(function(){
          [].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!=="screenHome";});
          homePaint(document.getElementById("screenHome"),{team:reviewTeam,oppMark:function(){return "";},art:{},hero:{},schedule:[],outlook:[],fresh:null,news:[0,1,2].map(function(i){return{title:"A full article headline remains readable",link:"https://publisher.test/story/"+i,source:"Land-Grant Holy Land",image:"",sourceLogo:""};})});
        });
        var railText=await audit.auditText(page,"news rail "+team+style+width);assert.deepStrictEqual(railText.failures,[]);
        // Explicit keyboard mode, then focus the clipped last card.
        await page.keyboard.press("Tab");await page.locator(".news-card").last().focus();
        await page.waitForFunction(function(){var e=document.querySelector(".news-row li:last-child .news-card"),r=e.getBoundingClientRect(),p=e.closest(".news-row").getBoundingClientRect();return r.left>=Math.max(0,p.left)-1&&r.right<=Math.min(innerWidth,p.right)+1;});
        passed.push("PASS "+[team,style,width,"news rail contrast and keyboard reach"].join(" | "));
      }
      // the thumbnail cases below run on the last page open (Suite Style)
      if(style!=="suite")await context.close();
      }
      // Both renderers use the shared policy; distinguish a real article
      // image from the logo, and force every fallthrough without the network.
      await page.setViewportSize({width:390,height:844});
      for(var surface of ["home","news"]){
        for(var kind of ["article","logo","failed-photo","failed-both","none"]){
          await page.evaluate(function(arg){
            var id=arg.surface==="home"?"screenHome":"screenNews";
            [].forEach.call(document.querySelectorAll("#main > div[id^=screen]"),function(d){d.hidden=d.id!==id;});
            var a={title:"A full article headline remains readable",link:"https://publisher.test/story",source:"Land-Grant Holy Land",publishedAt:Date.now(),image:arg.kind==="article"?"https://images.test/article.png":/^failed/.test(arg.kind)?"https://images.test/broken-photo.png":"",sourceLogo:arg.kind==="none"?"":arg.kind==="failed-both"?"https://images.test/broken-logo.png":"https://images.test/logo.png"};
            if(arg.surface==="home")homePaint(document.getElementById("screenHome"),{team:reviewTeam,oppMark:function(){return "";},art:{},hero:{},news:[a],schedule:[],outlook:[],fresh:null});
            else Suite.more.news(document.getElementById("screenNews"),{team:reviewTeam,items:[a],fresh:null});
          },{surface:surface,kind:kind});
          var prefix=surface==="home"?"news":"nw";
          await page.locator("."+prefix+"-img").scrollIntoViewIfNeeded();
          await page.waitForFunction(function(arg){var el=document.querySelector("."+arg.prefix+"-img"),img=el.querySelector("img");return (arg.kind==="none"||arg.kind==="failed-both")?!img:img&&img.complete&&img.naturalWidth>0;},{prefix:prefix,kind:kind});
          var final=await page.locator("."+prefix+"-img").evaluate(function(el){var img=el.querySelector("img");return{src:img&&img.src,logo:el.classList.contains("is-logo"),none:el.classList.contains("none"),text:el.textContent};});
          if(kind==="article")assert(final.src.endsWith("article.png")&&!final.logo);
          if(kind==="logo"||kind==="failed-photo")assert(final.src.endsWith("logo.png")&&final.logo);
          if(kind==="none"||kind==="failed-both")assert(final.none&&final.text==="Land-Grant Holy Land");
          passed.push("PASS "+team+" | "+surface+" | "+kind+" thumbnail fallback");
        }
      }
      assert((requests["https://images.test/broken-logo.png"]||0)<=2,"A failed fallback loops");
      await context.close();
    }
    fs.writeFileSync(path.join(shots,"verification.txt"),passed.join("\n")+"\n");
    console.log(passed.join("\n"));
  }finally{await browser.close();server.close();}
})().catch(function(e){console.error(e);server.close();process.exitCode=1;});
