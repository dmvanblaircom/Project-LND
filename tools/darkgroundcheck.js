#!/usr/bin/env node
/* Home and Game are dark (Stage 2, 2026-11-20): inside them --t-surface is
   redefined as the light ink, so a component that paints that token as a
   ground there turns white and loses the team's colour. 2026-11-21: the drive
   field's own end zone went white and its "ND" disappeared, and no check saw
   it. This renders the real screens (tools/stagereview.js with STAGE_PROBE)
   across the lifecycle and fails on any element that paints the ink as a
   background or an SVG fill. */
"use strict";
var spawnSync = require("child_process").spawnSync, path = require("path");
var root = path.join(__dirname, ".."), out = path.join(root, "artifacts", "darkground"), failed = false;
[
  { STAGE_TEAMS: "notre-dame,ohio-state", STAGE_STYLES: "team,suite", STAGE_WIDTHS: "390,1280", STAGE_STATES: "pre-far,live,halftime,final-win" },
  { STAGE_SCREEN: "game", STAGE_TEAMS: "notre-dame,ohio-state", STAGE_STYLES: "team,suite", STAGE_WIDTHS: "390,1280", STAGE_STATES: "pre-far,live,final-win" }
].forEach(function (env) {
  var r = spawnSync(process.execPath, [path.join(__dirname, "stagereview.js"), out], {
    cwd: root, encoding: "utf8", env: Object.assign({}, process.env, env, { STAGE_PROBE: "1", STAGE_NOSHOT: "1" }) });
  var lines = (r.stdout || "").split("\n").filter(function (l) { return /INK AS GROUND|ink as a ground|skipped/.test(l); });
  console.log((env.STAGE_SCREEN || "home") + ":\n" + lines.join("\n"));
  if (r.status !== 0) { failed = true; if (r.stderr) console.log(r.stderr); }
});
console.log(failed ? "FAIL: a component paints the dark screens' ink as a ground" : "every ground on Home and Game keeps its colour");
process.exit(failed ? 1 : 0);
