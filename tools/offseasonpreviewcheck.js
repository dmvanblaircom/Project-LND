#!/usr/bin/env node
/* Review-only offseason S2/S4 preview: both teams, both styles, three
   source outcomes, narrow/desktop layout and actual browser screenshots.
   The production app is deliberately unchanged. */
"use strict";
const fs = require("fs"), path = require("path"), assert = require("assert");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const server = require("./lib/serve")(root);
const shots = path.join(root, "artifacts/visual/offseason-v2");
fs.mkdirSync(shots, { recursive:true });
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({headless:true,executablePath:process.env.PW_CHROMIUM||undefined});
  let checks = 0;
  try {
    for (const team of ["notre-dame","ohio-state"])
      for (const style of ["suite","team"])
        for (const state of ["awaiting","complete","failed"]) {
          const page = await browser.newPage({viewport:{width:390,height:844}});
          const errors = []; page.on("pageerror", e => errors.push(String(e)));
          await page.goto(base + "/docs/design/offseason-preview-v2.html?team=" + team + "&style=" + style + "&state=" + state);
          await page.waitForSelector(".season-result .result-details b");
          await page.evaluate(() => document.fonts.ready);
          for (const width of [320,375,390,1280]) {
            await page.setViewportSize({width,height:844});
            const layout = await page.evaluate(() => {
              const result = document.querySelector(".season-result");
              const opponent = document.querySelector(".result-details b");
              const action = document.querySelector(".preview-action");
              const nav = document.querySelectorAll(".preview-nav span");
              return {
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
                opponent: opponent.textContent,
                resultRight: result.getBoundingClientRect().right,
                opponentRight: opponent.getBoundingClientRect().right,
                actionHeight: action.getBoundingClientRect().height,
                nav: [...nav].map(x => x.textContent),
                hero: document.querySelector(".season-hero").textContent
              };
            });
            assert(!layout.overflow, team+" "+style+" "+state+" "+width+" overflows");
            assert(layout.opponent==="vs Sample State University", "opponent is visible");
            assert(layout.resultRight<=width+1 && layout.opponentRight<=width+1, "result stays within viewport");
            assert(layout.actionHeight>=44,"action has usable touch target");
            assert(layout.nav.length===5,"five destinations");
            assert(state==="awaiting" ? /Bowl and playoff selections/.test(layout.hero):/Next season/.test(layout.hero), "correct season section");
            if(state==="failed")assert(/couldn’t load/.test(layout.hero),"failed is not mislabeled empty");
            checks += 6;
            if(width===390) await page.screenshot({path:path.join(shots,team+"-"+style+"-"+state+".png"),fullPage:true});
          }
          assert(!errors.length, "runtime error: "+errors.join("; "));
          checks++;
          await page.close();
        }
    console.log("Offseason v2 review: "+checks+" assertions passed; 12 screenshot captures.");
  } finally { await browser.close();server.close(); }
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
