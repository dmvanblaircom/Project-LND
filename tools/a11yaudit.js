/* Accessibility gate: text contrast and keyboard focus, measured from what
   the browser actually paints.

   Why pixels and not CSS. The Suite vNext release shipped with every check
   green while team accent text sat at 1.02:1 and three of the first four
   focus rings were invisible or absent. The checks that existed read source
   text or computed styles, and a computed style cannot say what colour is
   behind a word: backgrounds here are gradients, translucent layers and
   pseudo-elements. So this reads the screen.

   TEXT. Every element with its own visible text is located. All text on the
   page is then made transparent and ONE screenshot is taken, so the pixels
   behind each word are pure background. The dominant colour in the box
   behind the glyphs is the background; the element's computed colour,
   blended by its own alpha and every ancestor's opacity, is the foreground.
   WCAG 2.x AA: 4.5:1, or 3:1 for large text (24px, or 18.66px bold).

   FOCUS. Tabs through the page exactly as a keyboard user does. At each stop
   the focus ring is screenshotted and two things are checked: that the ring
   is actually PAINTED where its computed style says (a ring clipped by an
   overflow or hidden under a sticky header is not a ring), and that it
   reaches 3:1 against what is directly around it (WCAG 1.4.11). A control
   with no outline and no box-shadow has no focus indicator at all.

   selfTest() runs the auditor on a page whose answers are known before the
   real pages are trusted to it. If the auditor cannot tell #777 on white
   (4.48:1, fail) from #767676 on white (4.54:1, pass), or cannot see an
   invisible ring, nothing it says about the Suite means anything. */
"use strict";
var zlib = require("zlib");

// ---- PNG -------------------------------------------------------------------
// Playwright screenshots are 8-bit, non-interlaced RGBA (or RGB) PNGs. That
// is the only case handled; anything else throws rather than misreads.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  var pos = 8, w = 0, h = 0, depth = 0, type = 0, lace = 0, idat = [];
  while (pos < buf.length) {
    var len = buf.readUInt32BE(pos), tag = buf.toString("ascii", pos + 4, pos + 8);
    var data = buf.slice(pos + 8, pos + 8 + len);
    if (tag === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; type = data[9]; lace = data[12];
    } else if (tag === "IDAT") idat.push(data);
    else if (tag === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || lace !== 0 || (type !== 6 && type !== 2)) {
    throw new Error("unsupported PNG: depth " + depth + ", type " + type + ", interlace " + lace);
  }
  var bpp = type === 6 ? 4 : 3, stride = w * bpp;
  var raw = zlib.inflateSync(Buffer.concat(idat));
  var out = Buffer.alloc(w * h * 4);
  var prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (var y = 0; y < h; y++) {
    var filter = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (var x = 0; x < stride; x++) {
      var a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0, v = cur[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[x] = v;
    }
    for (x = 0; x < w; x++) {
      var o = (y * w + x) * 4, i = x * bpp;
      out[o] = cur[i]; out[o + 1] = cur[i + 1]; out[o + 2] = cur[i + 2];
      out[o + 3] = bpp === 4 ? cur[i + 3] : 255;
    }
    var t = prev; prev = cur; cur = t;
  }
  return { width: w, height: h, data: out };
}

// ---- colour ---------------------------------------------------------------
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function luminance(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
function ratio(a, b) {
  var x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function hex(c) {
  return "#" + c.slice(0, 3).map(function (v) {
    return ("0" + Math.round(v).toString(16)).slice(-2);
  }).join("").toUpperCase();
}

// The dominant colour in a rectangle of the image, optionally only where
// `keep(x, y)` says so. Colours are bucketed at 5 bits a channel and the
// winning bucket is averaged, so anti-aliasing and gentle gradients do not
// split the vote. Returns null when nothing was sampled.
function dominant(img, x0, y0, x1, y1, keep) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(img.width, Math.ceil(x1)); y1 = Math.min(img.height, Math.ceil(y1));
  var buckets = new Map(), best = null, total = 0;
  for (var y = y0; y < y1; y++) {
    for (var x = x0; x < x1; x++) {
      if (keep && !keep(x, y)) continue;
      var o = (y * img.width + x) * 4, r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
      var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      var e = buckets.get(key);
      if (!e) { e = [0, 0, 0, 0]; buckets.set(key, e); }
      e[0]++; e[1] += r; e[2] += g; e[3] += b; total++;
      if (!best || e[0] > best[0]) best = e;
    }
  }
  if (!best) return null;
  return { color: [best[1] / best[0], best[2] / best[0], best[3] / best[0]], share: best[0] / total, n: total };
}

// ---- in-page collection (runs in the browser) -----------------------------
function collectTextInPage() {
  function rgba(s) {
    var m = (s || "").match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1];
  }
  function describe(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += "." + cls.join(".");
    return s;
  }
  var out = [];
  var els = document.body.querySelectorAll("*");
  for (var i = 0; i < els.length; i++) {
    var el = els[i], st = getComputedStyle(el);
    if (st.display === "none" || st.visibility !== "visible") continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|SVG)$/.test(el.tagName)) continue;
    // Content of a collapsed <details> is not painted, yet the browser still
    // reports it visible and gives it a position. Measured, it reads as text
    // on whatever is underneath, and reports defects nobody can see.
    // checkVisibility() knows about collapsed and content-visibility content;
    // the closed-details test covers engines without it.
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) continue;
    var shut = el.closest("details:not([open])");
    if (shut && !el.closest("summary")) continue;

    // Placeholder text is text a user must read, and it has no text node.
    if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.placeholder && !el.value) {
      var pr = el.getBoundingClientRect();
      var pc = rgba(getComputedStyle(el, "::placeholder").color);
      if (pr.width > 2 && pr.height > 2 && pc) {
        out.push({ text: "placeholder: " + el.placeholder.slice(0, 36), sel: describe(el),
                   x: pr.left + scrollX, y: pr.top + scrollY, w: pr.width, h: pr.height,
                   fg: pc, alpha: pc[3], px: parseFloat(st.fontSize),
                   weight: parseInt(st.fontWeight, 10) || 400 });
      }
    }

    var nodes = [];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.textContent.trim()) nodes.push(n);
    }
    if (!nodes.length) continue;

    // The box of the glyphs themselves, not of the element: a paragraph's box
    // can be far wider than its words, and the background sampled should be
    // the one directly behind them.
    var L = Infinity, T = Infinity, R = -Infinity, B = -Infinity, text = "";
    for (var k = 0; k < nodes.length; k++) {
      var range = document.createRange();
      range.selectNodeContents(nodes[k]);
      var rects = range.getClientRects();
      for (var j = 0; j < rects.length; j++) {
        var rr = rects[j];
        if (rr.width < 1 || rr.height < 1) continue;
        L = Math.min(L, rr.left); T = Math.min(T, rr.top);
        R = Math.max(R, rr.right); B = Math.max(B, rr.bottom);
      }
      text += nodes[k].textContent;
    }
    if (!isFinite(L) || R - L < 2 || B - T < 2) continue;

    // Pure decoration is exempt from text contrast (WCAG 1.4.3): the team
    // art's outlined watermark initials are artwork, hidden from assistive
    // technology, with the team named in real text beside them. Only an
    // element that says so - [data-decorative] - is skipped.
    if (el.closest && el.closest("[data-decorative]")) continue;

    // Something clipped to a pixel (the sr-only pattern) is not on screen.
    var box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;

    var alpha = 1;
    for (var a = el; a && a.nodeType === 1; a = a.parentElement) alpha *= +getComputedStyle(a).opacity;
    if (alpha < 0.05) continue;

    var fg = rgba(st.webkitTextFillColor) || rgba(st.color);
    if (!fg) continue;
    out.push({ text: text.trim().replace(/\s+/g, " ").slice(0, 40), sel: describe(el),
               x: L + scrollX, y: T + scrollY, w: R - L, h: B - T,
               fg: fg, alpha: fg[3] * alpha, px: parseFloat(st.fontSize),
               weight: parseInt(st.fontWeight, 10) || (st.fontWeight === "bold" ? 700 : 400) });
  }
  return out;
}

// ---- motion ----------------------------------------------------------------
// Buttons here animate their focus ring and colours in (transition: all
// .18s). Read mid-animation, a ring is half its real colour and half drawn,
// and the audit reports a defect that a user, who sees the settled state,
// never meets. So motion is frozen while measuring: only the final state is
// what anyone reads.
var FREEZE = "*,*::before,*::after{transition:none!important;animation:none!important;" +
             "scroll-behavior:auto!important}";
async function freeze(page) { return page.addStyleTag({ content: FREEZE }); }
async function unfreeze(handle) { await handle.evaluate(function (n) { n.remove(); }); }

// ---- text audit ------------------------------------------------------------
// Grows the viewport to the document so ONE screenshot holds every element at
// the coordinates it was measured at (a full-page screenshot moves fixed
// elements, which would put the tab bar's measurements over the wrong
// pixels). Capped, so a very long list cannot produce a gigantic image.
async function auditText(page, label, opts) {
  opts = opts || {};
  var vp = page.viewportSize();
  var still = await freeze(page);
  var cap = opts.maxHeight || 12000;
  var height = vp.height;
  for (var i = 0; i < 3; i++) {
    var sh = await page.evaluate(function () { return document.documentElement.scrollHeight; });
    var want = Math.min(cap, Math.max(vp.height, sh));
    if (want === height) break;
    height = want;
    await page.setViewportSize({ width: vp.width, height: height });
    await page.waitForTimeout(120);
  }
  await page.evaluate(function () { window.scrollTo(0, 0); });

  var items = await page.evaluate(collectTextInPage);
  var style = await page.addStyleTag({ content:
    "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;" +
    "text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}" +
    "::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important}" });
  await page.waitForTimeout(60);
  var img = decodePng(await page.screenshot({ type: "png" }));
  await style.evaluate(function (n) { n.remove(); });
  await unfreeze(still);
  await page.setViewportSize(vp);
  await page.waitForTimeout(80);

  var failures = [], checked = 0, unassessed = 0, skipped = [];
  items.forEach(function (it) {
    if (it.y >= img.height || it.x >= img.width) { unassessed++; skipped.push(it.sel + ' "' + it.text + '" (below the capture)'); return; }
    var bg = dominant(img, it.x, it.y, it.x + it.w, it.y + it.h);
    if (!bg || bg.share < 0.2) { unassessed++; skipped.push(it.sel + ' "' + it.text + '" (no clear background)'); return; }   // say so, do not guess
    var a = Math.max(0, Math.min(1, it.alpha));
    var fg = [0, 1, 2].map(function (c) { return it.fg[c] * a + bg.color[c] * (1 - a); });
    var cr = ratio(fg, bg.color);
    var large = it.px >= 24 || (it.weight >= 700 && it.px >= 18.66);
    var need = large ? 3 : 4.5;
    checked++;
    if (cr < need) {
      failures.push({ label: label, kind: "text", sel: it.sel, text: it.text,
                      box: [Math.round(it.x), Math.round(it.y), Math.round(it.w), Math.round(it.h)],
                      detail: hex(fg) + " on " + hex(bg.color) + " = " + cr.toFixed(2) + ":1, needs " + need +
                              " (" + it.px.toFixed(1) + "px" + (it.weight >= 700 ? " bold" : "") + ")",
                      ratio: cr });
    }
  });
  return { failures: failures, checked: checked, unassessed: unassessed, skipped: skipped };
}

// ---- focus audit -----------------------------------------------------------
async function auditFocus(page, label, opts) {
  opts = opts || {};
  var maxStops = opts.maxStops || 60;
  var vp = page.viewportSize();
  var still = await freeze(page);
  await page.evaluate(function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  var failures = [], seen = {}, first = null, stops = 0, unverified = [];
  for (var i = 0; i < maxStops; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    var f = await page.evaluate(function () {
      var e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return null;
      var st = getComputedStyle(e), r = e.getBoundingClientRect();
      var path = [], n = e;
      while (n && n.nodeType === 1 && path.length < 6) {
        var i = 0, s = n;
        while ((s = s.previousElementSibling)) i++;
        path.unshift(n.tagName + ":" + i);
        n = n.parentElement;
      }
      var name = e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") +
        ((e.getAttribute("class") || "").trim() ? "." + e.getAttribute("class").trim().split(/\s+/)[0] : "");
      return { key: path.join("/"), sel: name,
               text: (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30),
               x: r.left, y: r.top, w: r.width, h: r.height,
               // The ring follows the element's real shape: one box per line
               // for a link that wraps, and rounded corners where it has them.
               frags: Array.prototype.map.call(e.getClientRects(), function (q) {
                 return { x: q.left, y: q.top, w: q.width, h: q.height };
               }).filter(function (q) { return q.width > 0 || q.w > 0; }),
               radius: (function () {
                 var v = st.borderTopLeftRadius || "0";
                 var n = parseFloat(v) || 0;
                 return /%$/.test(v) ? Math.min(r.width, r.height) * n / 100 : n;
               })(),
               style: st.outlineStyle, width: parseFloat(st.outlineWidth) || 0,
               color: st.outlineColor, offset: parseFloat(st.outlineOffset) || 0,
               shadow: st.boxShadow };
    });
    if (!f) break;
    if (seen[f.key]) break;        // wrapped round to where we started
    seen[f.key] = true;
    if (!first) first = f.key;
    stops++;

    var where = f.sel + (f.text ? ' "' + f.text + '"' : "");
    if (f.w < 1 || f.h < 1) continue;

    if (f.style === "auto") continue;   // the browser's own two-tone ring
    if (f.style === "none" || f.width < 1) {
      if (f.shadow && f.shadow !== "none") { unverified.push(where); continue; }
      failures.push({ label: label, kind: "focus", sel: where,
                      detail: "no focus indicator: outline " + f.style + " " + f.width + "px, no box-shadow" });
      continue;
    }

    var inner = f.offset, outer = f.offset + f.width, pad = outer + 5;
    var cx = Math.max(0, Math.floor(f.x - pad)), cy = Math.max(0, Math.floor(f.y - pad));
    var cx2 = Math.min(vp.width, Math.ceil(f.x + f.w + pad)), cy2 = Math.min(vp.height, Math.ceil(f.y + f.h + pad));
    if (cx2 - cx < 2 || cy2 - cy < 2) {
      failures.push({ label: label, kind: "focus", sel: where, detail: "focused element is off screen" });
      continue;
    }
    // Two pictures of the same spot: focused as it is, then with every
    // outline hidden. The element stays focused throughout, so tab order is
    // untouched. The pixels that differ ARE the ring, at whatever colour it
    // really renders - through opacity, gradients and blending - so nothing
    // here has to predict a colour from computed styles.
    var clip = { x: cx, y: cy, width: cx2 - cx, height: cy2 - cy };
    var on = decodePng(await page.screenshot({ type: "png", clip: clip }));
    var hide = await page.addStyleTag({ content: "*,*:focus,*:focus-visible{outline-style:none!important}" });
    var off = decodePng(await page.screenshot({ type: "png", clip: clip }));
    await hide.evaluate(function (n) { n.remove(); });

    // The element's shape in clip coordinates. A ring is drawn around each
    // line fragment, and follows border-radius: its corner radius grows with
    // the offset (Chromium's rule), and stays square where the element is
    // square. Sampling a rectangle around a circle would count the empty
    // corners as missing ring and report a good ring as absent.
    var frags = (f.frags && f.frags.length ? f.frags : [{ x: f.x, y: f.y, w: f.w, h: f.h }])
      .map(function (q) { return { x: q.x - cx, y: q.y - cy, w: q.w, h: q.h }; });
    function inShape(px, py, grow) {
      for (var i = 0; i < frags.length; i++) {
        var q = frags[i], x0 = q.x - grow, y0 = q.y - grow, w = q.w + 2 * grow, h = q.h + 2 * grow;
        if (px < x0 || py < y0 || px >= x0 + w || py >= y0 + h) continue;
        var rad = f.radius > 0 ? Math.max(0, Math.min(f.radius + grow, w / 2, h / 2)) : 0;
        if (!rad) return true;
        var ccx = px < x0 + rad ? x0 + rad : (px > x0 + w - rad ? x0 + w - rad : px);
        var ccy = py < y0 + rad ? y0 + rad : (py > y0 + h - rad ? y0 + h - rad : py);
        var dx = px - ccx, dy = py - ccy;
        if (dx * dx + dy * dy <= rad * rad) return true;
      }
      return false;
    }
    function inRing(x, y) { return inShape(x + .5, y + .5, outer) && !inShape(x + .5, y + .5, inner); }
    function aroundRing(x, y) {
      return inner >= 0 ? inShape(x + .5, y + .5, outer + 3) && !inShape(x + .5, y + .5, outer)
                        : inShape(x + .5, y + .5, inner) && !inShape(x + .5, y + .5, inner - 3);
    }

    var changed = {}, ringPixels = 0, nChanged = 0;
    for (var y = 0; y < on.height; y++) {
      for (var x = 0; x < on.width; x++) {
        if (!inRing(x, y)) continue;
        ringPixels++;
        var o = (y * on.width + x) * 4;
        var d = Math.abs(on.data[o] - off.data[o]) + Math.abs(on.data[o + 1] - off.data[o + 1]) +
                Math.abs(on.data[o + 2] - off.data[o + 2]);
        if (d > 40) { changed[y * on.width + x] = true; nChanged++; }
      }
    }
    var visibleShare = ringPixels ? nChanged / ringPixels : 0;
    if (visibleShare < 0.35) {
      failures.push({ label: label, kind: "focus", sel: where,
                      detail: "ring not visible: only " + Math.round(visibleShare * 100) +
                              "% of where it should be differs from the unfocused page " +
                              "(clipped, covered, or the same colour as its background)" });
      continue;
    }
    // The ring as drawn, and what it is drawn against, both measured.
    var ringSeen = dominant(on, 0, 0, on.width, on.height, function (x, y) { return changed[y * on.width + x]; });
    var around = dominant(off, 0, 0, off.width, off.height, aroundRing);
    if (ringSeen && around) {
      var cr = ratio(ringSeen.color, around.color);
      if (cr < 3) {
        failures.push({ label: label, kind: "focus", sel: where,
                        detail: "ring " + hex(ringSeen.color) + " against " + hex(around.color) + " = " +
                                cr.toFixed(2) + ":1, needs 3" });
      }
    }
  }
  await page.evaluate(function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await unfreeze(still);
  return { failures: failures, stops: stops, unverified: unverified };
}

// ---- self-test ---------------------------------------------------------------
// Known answers. Ratios computed independently: #777777 on white 4.48:1,
// #767676 on white 4.54:1, #9DAABC on #F6F3EC 2.17:1, #EFF1F2 ring on
// #F6F3EC 1.02:1, #245C72 ring on white 7.37:1.
var SELF_TEST_PAGE = [
  "<!doctype html><html><head><style>",
  "body{margin:0;padding:24px;background:#FFFFFF;font:16px/1.4 sans-serif}",
  "p{margin:0 0 14px;padding:6px 8px}",
  "#fail-grey{color:#777777;background:#FFFFFF}",
  "#pass-grey{color:#767676;background:#FFFFFF}",
  "#pass-gradient{color:#FFFFFF;background:linear-gradient(90deg,#0C2340,#102844)}",
  "#fail-cream{color:#9DAABC;background:#F6F3EC}",
  "#pass-faded{color:#FFFFFF;background:#0C2340}",
  "#fail-faded{color:#FFFFFF;background:#0C2340;opacity:.25}",
  ".row{display:flex;gap:24px;padding:16px;background:#F6F3EC}",
  "button{font:16px sans-serif;padding:8px 12px;border:0;background:#E4E0D6;color:#142033}",
  "#ring-invisible:focus{outline:3px solid #EFF1F2;outline-offset:2px}",
  "#ring-none:focus{outline:0}",
  "#ring-good:focus{outline:3px solid #245C72;outline-offset:2px}",
  "#ring-animated{outline:3px solid rgba(36,92,114,0);outline-offset:2px;transition:outline-color 3s linear}",
  "#ring-round{width:80px;height:80px;border-radius:50%;padding:0;border:0;background:#FFFFFF}",
  "#ring-round:focus{outline:2px solid #245C72;outline-offset:4px}",
  ".narrow{width:150px;padding:16px;background:#FFFFFF}",
  "#ring-wrap{color:#142033}",
  "#ring-wrap:focus{outline:3px solid #245C72;outline-offset:2px}",
  ".dim{opacity:.85;background:#0B213D;padding:12px}",
  "#hidden-fold p{color:#777777;background:#FFFFFF}",
  "#ring-dim{background:#0B213D;color:#F8F4EC}",
  "#ring-dim:focus{outline:3px solid #FFD966;outline-offset:-3px}",
  "#ring-animated:focus{outline-color:#245C72}",
  "</style></head><body>",
  "<p id='fail-grey'>grey 777 on white</p>",
  "<p id='pass-grey'>grey 767676 on white</p>",
  "<p id='pass-gradient'>white on navy gradient</p>",
  "<p id='fail-cream'>dark-theme muted on cream</p>",
  "<p id='pass-faded'>white on navy, opaque</p>",
  "<p id='fail-faded'>white on navy at quarter opacity</p>",
  "<div class='row'>",
  "<button id='ring-invisible'>invisible ring</button>",
  "<button id='ring-none'>no ring</button>",
  "<button id='ring-good' style='background:#FFFFFF'>good ring</button>",
  "<button id='ring-animated' style='background:#FFFFFF'>animated ring</button>",
  "<button id='ring-round' aria-label='round'>&#8943;</button>",
  "</div><div class='narrow'><a id='ring-wrap' href='#x'>a link long enough that it wraps onto a second line</a>",
  "</div><div class='dim'><button id='ring-dim'>dimmed past-game row</button>",
  "</div><details id='hidden-fold'><summary>folded section</summary><p id='fail-folded'>hidden grey 777</p></details><div>",
  "</div></body></html>"
].join("");

async function selfTest(browser) {
  var ctx = await browser.newContext({ viewport: { width: 700, height: 500 } });
  var page = await ctx.newPage();
  await page.setContent(SELF_TEST_PAGE);
  var t = await auditText(page, "self-test");
  var f = await auditFocus(page, "self-test");
  await ctx.close();

  var flaggedText = t.failures.map(function (x) { return x.sel; }).sort();
  var flaggedFocus = f.failures.map(function (x) { return x.sel.split(" ")[0]; }).sort();
  var wantText = ["p#fail-cream", "p#fail-faded", "p#fail-grey"];
  var wantFocus = ["button#ring-invisible", "button#ring-none"];
  var problems = [];
  if (JSON.stringify(flaggedText) !== JSON.stringify(wantText)) {
    problems.push("text: flagged " + JSON.stringify(flaggedText) + ", expected " + JSON.stringify(wantText));
  }
  if (JSON.stringify(flaggedFocus) !== JSON.stringify(wantFocus)) {
    problems.push("focus: flagged " + JSON.stringify(flaggedFocus) + ", expected " + JSON.stringify(wantFocus));
  }
  var greyFail = t.failures.filter(function (x) { return x.sel === "p#fail-grey"; })[0];
  if (greyFail && Math.abs(greyFail.ratio - 4.48) > 0.05) {
    problems.push("text: measured #777 on white at " + greyFail.ratio.toFixed(2) + ":1, expected 4.48");
  }
  return { ok: problems.length === 0, problems: problems, text: t, focus: f };
}

module.exports = { auditText: auditText, auditFocus: auditFocus, selfTest: selfTest,
                   decodePng: decodePng, ratio: ratio, dominant: dominant };
