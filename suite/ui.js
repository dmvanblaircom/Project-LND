/* Suite UI primitives shared by every screen - and by the chooser, which
   runs without app.js.

   Only what more than one screen needs, and only presentation: no data is
   fetched and no provider is named here. TeamOS decides WHAT a team's mark
   is; this decides how one is drawn and what happens when it fails. */

var Suite = Suite || {};

Suite.ui = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // The program's initials, for the fallback mark: "ND", "OSU" from the
  // provider's short code when there is one, else the name's first letters.
  function initials(name, abbr) {
    if (abbr && /^[A-Za-z&]{1,4}$/.test(abbr)) return abbr.toUpperCase();
    // Words that start with a letter: a nickname in quotes ("Anthony
    // “Turbo” Rogers") or a lone "&" is not an initial.
    var w = String(name || "").split(/\s+/).filter(function (x) { return /^[A-Za-z\u00C0-\u024F]/.test(x); });
    return w.slice(0, 3).map(function (x) { return x.charAt(0).toUpperCase(); }).join("") || "?";
  }

  /* A program's mark. The initials are always drawn underneath; the logo, if
     there is one, sits over them and hides them once it has actually loaded.
     A logo that fails is removed, so what shows is the fallback - never a
     broken-image glyph. The mark is decoration: the program's name is always
     in text next to it, so the image carries no alt text of its own. */
  function mark(url, name, abbr, cls, eager) {
    // eager: a mark that shows the moment its view opens (a sheet), where a
    // lazy one waits on the browser and shows initials meanwhile
    return '<span class="mark ' + esc(cls || "plain") + '" aria-hidden="true">' +
             '<span class="initials">' + esc(initials(name, abbr)) + "</span>" +
             (url ? '<img src="' + esc(url) + '"' + (eager ? "" : ' loading="lazy"') + ' alt="" decoding="async" data-mark>' : "") +
           "</span>";
  }

  /* The team art slot (decision 0024 §10). Approved team photography when a
     team declares it; otherwise the fallback, which is a production design
     rather than a placeholder: the team's deep colours, a restrained glow in
     its accent, and its mark as a large, cropped watermark - the logo when
     the provider has it, the program's initials drawn as an outline when it
     does not. Decorative throughout: the team is named in text beside it. */
  function art(opts) {
    opts = opts || {};
    var photo = opts.photo && opts.photo.src
      ? '<img class="art-photo" src="' + esc(opts.photo.src) + '" alt="" decoding="async"' +
        (opts.photo.position ? ' style="object-position:' + esc(opts.photo.position) + '"' : "") + ">"
      : "";
    return '<div class="art-slot' + (photo ? " has-photo" : "") + '" aria-hidden="true" data-decorative>' + photo +
             '<span class="art-watermark">' +
               '<span class="art-initials">' + esc(initials(opts.name, opts.abbr)) + "</span>" +
               // Eager: the watermark is at the top of the first screen.
               (opts.markUrl ? '<img src="' + esc(opts.markUrl) + '" alt="" decoding="async" data-mark>' : "") +
             "</span>" +
           "</div>";
  }

  // "2h ago", "Yesterday", "Sep 21" - for news, in the fan's own time.
  function ago(t, now) {
    if (t == null) return "";
    var ms = (now || Date.now()) - t;
    if (ms < 0) ms = 0;
    var min = Math.round(ms / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return min + " min ago";
    var h = Math.round(min / 60);
    if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    if (h < 48) return "Yesterday";
    return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // A kickoff in the fan's device time (decision 0022 #1), with its zone so
  // "3:30 PM" is never ambiguous. A time not yet announced says so.
  function kickoff(iso, timeSet) {
    var d = new Date(iso);
    if (isNaN(d)) return { day: "", time: "", full: "" };
    var day = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    var time = timeSet === false ? "Time TBA"
      : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    return { day: day, time: time, full: day + " \u00B7 " + time };
  }

  // The one page-level freshness state a screen shows (0024 §13), from
  // TeamOS.freshness.summary(): nothing while fresh.
  function freshBanner(f) {
    if (!f || f.state === "fresh") return "";
    var since = f.since ? ago(f.since) : "";
    var text = f.state === "offline" ? "Offline · Showing last available data"
      : "Data may be outdated" + (since ? " · Last refreshed " + since : "");
    return '<p class="fresh-banner ' + f.state + '">' + esc(text) + "</p>";
  }

  // Image load and error events do not bubble, but they do capture: one
  // listener on the document handles every mark, however it was inserted.
  function settle(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG") return;
    // A photo with a designed fallback behind it: a failure reveals the
    // fallback instead of showing a broken image.
    if (img.hasAttribute("data-fallback")) {
      if (e.type === "error" || !img.naturalWidth) {
        var logo = img.getAttribute("data-fallback-src");
        if (logo && img.parentNode) {
          img.removeAttribute("data-fallback-src");
          img.parentNode.classList.add("is-logo");
          img.src = logo;
          return;
        }
        if (img.parentNode) { img.parentNode.classList.add("none"); img.parentNode.removeChild(img); }
      }
      return;
    }
    if (!img.hasAttribute("data-mark")) return;
    var box = img.parentNode;
    if (e.type === "load" && img.naturalWidth > 0) {
      if (box) box.classList.add("loaded");
      fitMark(img);
    } else if (img.parentNode) {
      img.parentNode.removeChild(img);
    }
  }
  /* Every team's mark at one size (David, 2026-10-25: "logo sizes should be
     the same size"). ESPN draws each mark's longest side at 92% of its square,
     so a wide, solid mark (Notre Dame) reads far bigger than a tall, thin one
     (Navy). Each mark is measured once - the box its drawing fills and the
     ink it carries, on a small canvas - and scaled to one perceived size: the
     geometric mean of the box's side and the ink's, at the median of 24 real
     ESPN marks (probe, 2026-10-25). Never so far that it spills: a bare mark
     to 1.3x ESPN's size, one inside a circle to 1.15x. A mark that cannot be
     read (its host sends no CORS) keeps ESPN's size. */
  var FIT_TARGET = 0.718, FIT_N = 100, FIT_KEY = "suite-markfit:1:", fits = {};
  function measureMark(url, done) {
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = c.height = FIT_N;
        var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, FIT_N, FIT_N);
        var d = cx.getImageData(0, 0, FIT_N, FIT_N).data, ink = 0, x0 = FIT_N, y0 = FIT_N, x1 = -1, y1 = -1;
        for (var i = 0; i < FIT_N * FIT_N; i++) {
          var a = d[i * 4 + 3]; ink += a;
          if (a > 16) { var x = i % FIT_N, y = (i / FIT_N) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) return done(null);
        var w = (x1 - x0 + 1) / FIT_N, h = (y1 - y0 + 1) / FIT_N, inkFrac = ink / 255 / (FIT_N * FIT_N);
        done({ p: Math.sqrt(Math.sqrt(w * h) * Math.sqrt(inkFrac)), side: Math.max(w, h) });
      } catch (err) { done(null); }          // a canvas the host would not let us read
    };
    im.onerror = function () { done(null); };
    im.src = url;
  }
  function applyFit(img, f) {
    var box = img.parentNode;
    if (!f || !box) return;
    var cap = box.classList && box.classList.contains("bare") ? 1.3 : 1.15;
    var s = Math.max(0.8, Math.min(FIT_TARGET / f.p, cap * 0.92 / f.side));
    img.style.transform = Math.abs(s - 1) < 0.01 ? "" : "scale(" + s.toFixed(3) + ")";
  }
  // One measurement per mark: every copy that loads while it is out waits
  // for it, and the answer is kept on the device.
  var waiting = {};
  function fitMark(img) {
    var url = img.getAttribute("src");
    if (!url) return;
    if (fits[url] !== undefined) return applyFit(img, fits[url]);
    if (waiting[url]) return waiting[url].push(img);
    try { var kept = localStorage.getItem(FIT_KEY + url); if (kept) { fits[url] = JSON.parse(kept); return applyFit(img, fits[url]); } } catch (err) { /* no storage */ }
    waiting[url] = [img];
    measureMark(url, function (f) {
      fits[url] = f;
      if (f) { try { localStorage.setItem(FIT_KEY + url, JSON.stringify(f)); } catch (err) { /* full or blocked */ } }
      waiting[url].forEach(function (el) { applyFit(el, f); });
      delete waiting[url];
    });
  }

  document.addEventListener("load", settle, true);
  document.addEventListener("error", settle, true);

  // A peeking news card may count as visible to native keyboard scrolling.
  // Reveal the whole card, so its headline and focus ring remain readable.
  document.addEventListener("focusin", function (e) {
    var card = e.target.closest && e.target.closest(".news-card");
    if (card && card.matches(":focus-visible")) card.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  /* Redraw a section without reloading the logos it already shows. Setting
     innerHTML makes new <img> elements, and a new image paints nothing until
     it decodes again - even from cache - so each redraw flashed the initials
     underneath (Home's hero, three times on a first open, as the schedule,
     rank, line and weather arrived; every tick of a live game). A logo that
     has loaded is moved into the new markup in place of its fresh copy:
     same address, same picture, nothing to reload. */
  function fill(el, html) {
    if (!el) return;
    if (!el.querySelectorAll) { el.innerHTML = html; return; }   // no DOM to keep (a test's stand-in)
    var keep = {};
    Array.prototype.forEach.call(el.querySelectorAll("img[data-mark]"), function (img) {
      var src = img.getAttribute("src");
      if (img.complete && img.naturalWidth > 0) (keep[src] = keep[src] || []).push(img);
    });
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll("img[data-mark]"), function (img) {
      var old = (keep[img.getAttribute("src")] || []).shift();
      if (!old || !img.parentNode) return;
      img.parentNode.replaceChild(old, img);
      old.parentNode.classList.add("loaded");
    });
  }

  /* Suite Style (decision 0026): Suite's standard visual system, the same
     for every team, when the fan chooses it over Team Style. The same colour
     roles a team supplies, so TeamOS.identity checks it exactly as it checks
     a team (tools/suitecheck.js), and app.js applies it the same way.
     Approved Ink actions and Pearl pages; Champagne and Bronze are small
     accents. Instrument Sans is the UI face, Georgia stays editorial. */
  var STYLE = {
    programLabel: "SUITE",
    colors: {
      accent:         "#111D35",
      accentText:     "#D4B896",
      accentOnLight:  "#111D35",
      accentInk:      "#F1F2F0",
      accentSoft:     "#B6BEC7",
      accentTint:     "#D9DEE3",
      accentTintSoft: "#EDF0F2",
      focus:          "#D4B896",
      surface:        "#111D35",
      surfaceDeep:    "#101A2D",
      surfaceAbyss:   "#0B1322",
      surfaceRaise:   "#223047"
    },
    fonts: {
      ui:      "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display: "'Instrument Display',sans-serif"
    }
  };

  // Team identity is primary: a name never ends in an ellipsis. Try the
  // names, then a tighter setting of them, then both abbreviations - both
  // sides alike, so a row never pairs a name with an abbreviation. Measured,
  // because whether a name fits depends on the name, the font and the width,
  // not on any one team. A row is measured when it is drawn and again
  // whenever that could change the answer: a resize, a web font arriving,
  // or its screen coming into view (a hidden row measures nothing).
  var fitting = [];
  function fitOne(f) {
    if (f.shrink) return shrinkOne(f);
    var row = f.host && f.host.querySelector(f.row);
    if (!row) return;
    var names = row.querySelectorAll(f.name);
    function over() { return [].some.call(names, function (n) { return n.scrollWidth > n.clientWidth + 1; }); }
    row.classList.remove("fit-tight", "fit-abbr");
    if (over()) row.classList.add("fit-tight");
    if (over()) row.classList.add("fit-abbr");
  }
  function fitNames(host, row, name) {
    var f = fitting.filter(function (x) { return x.host === host && x.row === row; })[0];
    if (!f) fitting.push(f = { host: host, row: row, name: name });
    fitOne(f);
  }
  // A single title the same way (David, 2026-10-07: "MARYL..." in Ohio
  // State's wider face): its size steps down until every word fits, no
  // further than min px; still too wide, it takes its abbreviation
  // (.fit-short, which the caller's markup provides).
  function shrinkOne(f) {
    var el = f.host && f.host.querySelector(f.row);
    if (!el || !el.clientWidth) return;
    function over() { return el.scrollWidth > el.clientWidth + 1; }
    el.style.fontSize = "";
    el.classList.remove("fit-short");
    var px = parseFloat(getComputedStyle(el).fontSize);
    while (over() && px > f.min) { px = Math.max(f.min, px - 1); el.style.fontSize = px + "px"; }
    if (over()) el.classList.add("fit-short");
  }
  function fitText(host, sel, min) {
    var f = fitting.filter(function (x) { return x.host === host && x.row === sel; })[0];
    if (!f) fitting.push(f = { host: host, row: sel, shrink: true, min: min });
    shrinkOne(f);
  }
  // A label set with a short form beside it (.lbl-long / .lbl-short): the
  // short forms take over when any long one is wider than its box.
  function fitLabels(host, sel) {
    var f = fitting.filter(function (x) { return x.host === host && x.row === sel; })[0];
    if (!f) fitting.push(f = { host: host, row: sel, labels: true });
    labelsOne(f);
  }
  function labelsOne(f) {
    var box = f.host && f.host.querySelector(f.row);
    if (!box || !box.clientWidth) return;
    box.classList.remove("fit-short");
    var long = [].some.call(box.querySelectorAll(".lbl-long"), function (l) {
      var p = l.parentNode; return l.getBoundingClientRect().width > p.getBoundingClientRect().width + 0.5;
    });
    if (long) box.classList.add("fit-short");
  }
  if (typeof window !== "undefined") {
    var refit = function () { fitting.forEach(function (f) { if (f.labels) labelsOne(f); else fitOne(f); }); };
    window.addEventListener("resize", refit);
    window.addEventListener("hashchange", function () { (window.requestAnimationFrame || setTimeout)(refit); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refit);
  }

  // A period as the scoreboard says it: 1st-4th, then OT, 2OT, 3OT...
  function period(p) {
    return p === 1 ? "1st" : p === 2 ? "2nd" : p === 3 ? "3rd" : p === 4 ? "4th" : p === 5 ? "OT" : p > 5 ? (p - 4) + "OT" : "";
  }
  // An opponent with its ranking: "#12 Purdue".
  function oppLabel(g) { return (g.oppRank ? "#" + g.oppRank + " " : "") + g.oppName; }

  // The possession football: one mark, every live screen (--s-football).
  function ball(cls) {
    return '<svg class="' + esc(cls) + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
           '<ellipse cx="12" cy="12" rx="9.5" ry="5.6" transform="rotate(-35 12 12)"/><path d="m9.2 14.8 5.6-5.6M10.6 11.4l2 2M12 10l2 2"/></svg>';
  }

  // One thumbnail policy on Home and News: article photo, publisher logo,
  // then the source-name tile. A failed image advances once, never loops.
  function newsImage(a, prefix, fallbackName) {
    var photo = a.image, logo = a.sourceLogo, src = photo || logo;
    return '<span class="' + prefix + '-img' + (!src ? " none" : !photo ? " is-logo" : "") + '" aria-hidden="true">' +
      '<span class="' + prefix + '-src">' + esc(a.source || fallbackName || "") + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" data-fallback' +
        (photo && logo && photo !== logo ? ' data-fallback-src="' + esc(logo) + '"' : "") + ">" : "") + "</span>";
  }

  // A play's tags (TeamOS cleans ESPN's words) as pills, the same on Game
  // and in Top 25's sheet: a score, a turnover, a void play, a first down.
  var TAG_KIND = { "Touchdown": "score", "Turnover": "turnover", "Turnover on downs": "turnover", "No play": "void", "1st down": "first" };
  function playTags(tags) {
    return (tags || []).map(function (t) { return '<span class="pl-tag ' + (TAG_KIND[t] || "") + '">' + esc(t) + "</span>"; }).join("");
  }

  return { ball: ball, esc: esc, initials: initials, mark: mark, art: art, ago: ago, kickoff: kickoff, freshBanner: freshBanner, newsImage: newsImage,
           fitNames: fitNames, fitText: fitText, fitLabels: fitLabels, STYLE: STYLE, fill: fill, period: period, oppLabel: oppLabel, playTags: playTags };
})();
