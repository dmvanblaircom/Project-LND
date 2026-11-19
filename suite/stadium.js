/* Suite - the stadium: Suite's own stage art, drawn, never downloaded
   (Phase 2 brief §6.1, §6.4; spec §3.4).

     Suite.stadium.art(opts)     the shared stadium environment, as inline SVG
     Suite.stadium.helmet(side)  the sculpted helmet form, "us" or "them"

   One original composition for every team: a night (or day) sky, a bowl of
   stands with the crowd's lights in them, banks of floodlights throwing
   beams onto a striped field. Nothing in it belongs to a school - no marks,
   no uniforms, no end zones, no recognizable stadium - so it can be every
   team's (spec §3.4). The team arrives through light: every colour that
   says whose stage this is resolves from the role tokens in app.css
   (--r-stage-*, --r-stage-glow-rgb), so Team Style and Suite Style light it
   differently with no conditional here.

   Drawn inline, it is part of the page: it paints with the first frame, works
   offline, and costs no request. It is decorative (aria-hidden) and static -
   no loop, no animation; the screen around it does the moving, and only when
   the game does.

   The helmet is a form, not a team's helmet. Programs' real helmets differ in
   shell, stripe and decal, and Suite has no licensed helmet art; a helmet
   painted in a team's colours with its logo on the side would misstate most
   of them (Notre Dame's is gold, with no decal). So it is a sculpted shell
   lit by the stage: pearl, with the team's own light along its edge. The
   official mark beside it is what names the school.

   Nothing here fetches, reads a provider payload, or names a team. */

var Suite = Suite || {};

Suite.stadium = (function () {
  "use strict";

  // A fixed scatter (a small LCG, one seed): the crowd's lights in the stands
  // fall in the same place on every paint, so a redraw never shimmers. Drawn
  // as a few stroked paths of zero-length segments (round caps make each a
  // dot), so a few hundred lights are six elements, not hundreds.
  function crowd(n, seed, box, cls) {
    var s = seed >>> 0, buckets = {};
    function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (var i = 0; i < n; i++) {
      var x = Math.round(box.x + r() * box.w), y = Math.round(box.y + r() * box.h);
      var k = (r() < 0.35 ? "b" : "s") + (r() < 0.3 ? 3 : r() < 0.6 ? 2 : 1);
      (buckets[k] = buckets[k] || []).push("M" + x + " " + y + "h0");
    }
    return Object.keys(buckets).sort().map(function (k) {
      return '<path class="' + cls + " is-" + k + '" d="' + buckets[k].join("") + '"/>';
    }).join("");
  }

  // One bank of floodlights: a frame of lamps on a mast, and the beam it
  // throws toward the middle of the field.
  function tower(x, top, lean, scale) {
    var w = 54 * scale, h = 26 * scale, lamps = "";
    for (var row = 0; row < 3; row++)
      for (var col = 0; col < 6; col++)
        lamps += '<circle class="sd-lamp" cx="' + (x - w / 2 + 6 * scale + col * (w - 12 * scale) / 5).toFixed(1) +
                 '" cy="' + (top + 5 * scale + row * (h - 10 * scale) / 2).toFixed(1) + '" r="' + (2.6 * scale).toFixed(1) + '"/>';
    var bx = 600 + lean, by = 640;
    return '<g class="sd-tower">' +
             '<path class="sd-beam" d="M' + (x - w / 2) + " " + (top + h) + " L" + (x + w / 2) + " " + (top + h) +
               " L" + (bx + 260 * scale) + " " + by + " L" + (bx - 260 * scale) + " " + by + 'Z"/>' +
             '<rect class="sd-mast" x="' + (x - 2.5 * scale) + '" y="' + (top + h) + '" width="' + (5 * scale) + '" height="' + Math.max(0, 286 - top - h) + '"/>' +
             '<rect class="sd-frame" x="' + (x - w / 2) + '" y="' + top + '" width="' + w + '" height="' + h + '" rx="' + (3 * scale) + '"/>' +
             '<ellipse class="sd-bloom" cx="' + x + '" cy="' + (top + h / 2) + '" rx="' + (w * 1.15) + '" ry="' + (h * 1.6) + '"/>' +
             lamps +
           "</g>";
  }

  // The field: mown stripes running away from the viewer to one vanishing
  // point - a texture, not a field (no boundaries, end zones or numbers;
  // decision 0041).
  function field() {
    var vx = 600, vy = 470, stripes = "";
    for (var i = -8; i < 8; i++) {
      var x1 = 600 + i * 150, x2 = 600 + (i + 1) * 150;
      stripes += '<path class="sd-stripe' + (i % 2 ? " is-alt" : "") + '" d="M' + x1 + " 800 L" + x2 + " 800 L" +
                 (vx + (x2 - 600) * 0.12).toFixed(1) + " " + vy + " L" + (vx + (x1 - 600) * 0.12).toFixed(1) + " " + vy + 'Z"/>';
    }
    return '<g class="sd-field"><rect class="sd-turf" x="0" y="' + vy + '" width="1200" height="' + (800 - vy) + '"/>' + stripes + "</g>";
  }

  // The bowl: two tiers of stands, a rim with its own lights, and the crowd.
  function stands() {
    return '<g class="sd-stands">' +
             '<path class="sd-tier sd-tier-up" d="M0 300 C 300 262, 900 262, 1200 300 L1200 392 C 900 360, 300 360, 0 392Z"/>' +
             '<path class="sd-rim" d="M0 300 C 300 262, 900 262, 1200 300" fill="none"/>' +
             crowd(150, 1031, { x: 0, y: 284, w: 1200, h: 92 }, "sd-crowd") +
             '<path class="sd-tier sd-tier-low" d="M0 392 C 300 360, 900 360, 1200 392 L1200 476 C 900 452, 300 452, 0 476Z"/>' +
             crowd(110, 2741, { x: 0, y: 384, w: 1200, h: 78 }, "sd-crowd is-near") +
             '<path class="sd-wall" d="M0 476 C 300 452, 900 452, 1200 476 L1200 486 C 900 462, 300 462, 0 486Z"/>' +
           "</g>";
  }

  var GRADS =
    '<defs>' +
      '<linearGradient id="sdSky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop class="sd-sky-0" offset="0"/><stop class="sd-sky-1" offset=".55"/><stop class="sd-sky-2" offset="1"/></linearGradient>' +
      '<radialGradient id="sdHalo" cx=".5" cy=".62" r=".6">' +
        '<stop class="sd-halo-0" offset="0"/><stop class="sd-halo-1" offset="1"/></radialGradient>' +
      '<linearGradient id="sdBeam" x1="0" y1="0" x2="0" y2="1">' +
        '<stop class="sd-beam-0" offset="0"/><stop class="sd-beam-1" offset="1"/></linearGradient>' +
      '<radialGradient id="sdBloom"><stop class="sd-bloom-0" offset="0"/><stop class="sd-bloom-1" offset="1"/></radialGradient>' +
      '<linearGradient id="sdTurf" x1="0" y1="0" x2="0" y2="1">' +
        '<stop class="sd-turf-0" offset="0"/><stop class="sd-turf-1" offset="1"/></linearGradient>' +
      '<radialGradient id="sdSun"><stop class="sd-sun-0" offset="0"/><stop class="sd-sun-1" offset="1"/></radialGradient>' +
      '<radialGradient id="sdPool" cx=".5" cy=".86" r=".5">' +
        '<stop class="sd-pool-0" offset="0"/><stop class="sd-pool-1" offset="1"/></radialGradient>' +
    "</defs>";

  // The environment, once per stage. `time` is TeamOS.game.atmosphere's
  // answer ("day" or "night"); the CSS reads it from the stage's class.
  function art() {
    return '<svg class="sd" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + GRADS +
             '<rect class="sd-sky" width="1200" height="800" fill="url(#sdSky)"/>' +
             '<rect class="sd-halo" width="1200" height="800" fill="url(#sdHalo)"/>' +
             '<circle class="sd-sun" cx="1060" cy="10" r="300" fill="url(#sdSun)"/>' +
             stands() + field() +
             '<rect class="sd-pool" width="1200" height="800" fill="url(#sdPool)"/>' +
             '<g class="sd-lights">' +
               tower(150, 168, -120, 0.85) + tower(392, 140, -40, 1.05) + tower(808, 140, 40, 1.05) + tower(1050, 168, 120, 0.85) +
             "</g>" +
           "</svg>";
  }

  // The helmet in profile, facing right; the stage mirrors the opponent's so
  // the two face each other across the middle.
  function helmetSvg(k) {
    return '<svg class="hm" viewBox="0 0 250 200" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="hmShell' + k + '" x1=".2" y1="0" x2=".7" y2="1">' +
          '<stop class="hm-s0" offset="0"/><stop class="hm-s1" offset=".46"/><stop class="hm-s2" offset="1"/></linearGradient>' +
        '<radialGradient id="hmSpec' + k + '" cx=".62" cy=".2" r=".55">' +
          '<stop class="hm-spec-0" offset="0"/><stop class="hm-spec-1" offset="1"/></radialGradient>' +
        '<linearGradient id="hmRim' + k + '" x1="0" y1="0" x2="1" y2="0">' +
          '<stop class="hm-rim-0" offset="0"/><stop class="hm-rim-1" offset=".55"/></linearGradient>' +
        '<linearGradient id="hmMask' + k + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop class="hm-m0" offset="0"/><stop class="hm-m1" offset="1"/></linearGradient>' +
      "</defs>" +
      '<ellipse class="hm-shadow" cx="122" cy="186" rx="92" ry="9"/>' +
      // the shell: crown, brow, the jaw flap and the back
      '<path class="hm-shell" fill="url(#hmShell' + k + ')" d="M34 150C18 112 25 58 80 31C127 9 188 24 210 68C216 81 215 96 206 105L189 108C183 120 179 134 173 151C162 170 122 178 97 174C70 170 46 165 34 150Z"/>' +
      '<path class="hm-spec" fill="url(#hmSpec' + k + ')" d="M60 70C82 36 140 22 184 44C160 40 112 46 86 70C74 82 64 86 60 70Z"/>' +
      '<path class="hm-rim" fill="none" stroke="url(#hmRim' + k + ')" d="M38 146C22 110 30 60 82 34"/>' +
      // the jaw flap's seam, the ear hole and the chin's shadow
      '<path class="hm-seam" fill="none" d="M96 172C100 150 104 132 118 120C134 108 160 104 189 108"/>' +
      '<circle class="hm-ear" cx="120" cy="118" r="8"/>' +
      '<path class="hm-chin" d="M97 174C122 178 162 170 173 151L168 150C158 164 124 170 97 168Z"/>' +
      // the facemask: frame and bars
      '<g class="hm-mask" fill="none" stroke="url(#hmMask' + k + ')">' +
        '<path d="M206 76C222 84 236 102 238 124C239 146 228 164 210 172C196 177 182 174 172 166"/>' +
        '<path d="M204 104C214 108 226 112 238 116"/>' +
        '<path d="M190 136C206 136 222 138 236 142"/>' +
        '<path d="M214 104C210 124 210 146 216 168"/>' +
      "</g>" +
      '<path class="hm-clip" d="M199 70l10 3-2 9-10-2z"/>' +
    "</svg>";
  }

  function helmet(side) {
    var k = side === "them" ? "them" : "us";
    return '<span class="hm-wrap hm-' + k + '" aria-hidden="true">' + helmetSvg(k === "them" ? "T" : "U") + "</span>";
  }

  return { art: art, helmet: helmet };
})();
