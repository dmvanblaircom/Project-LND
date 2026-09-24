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
    var w = String(name || "").split(/\s+/).filter(Boolean);
    return w.slice(0, 3).map(function (x) { return x.charAt(0).toUpperCase(); }).join("") || "?";
  }

  /* A program's mark. The initials are always drawn underneath; the logo, if
     there is one, sits over them and hides them once it has actually loaded.
     A logo that fails is removed, so what shows is the fallback - never a
     broken-image glyph. The mark is decoration: the program's name is always
     in text next to it, so the image carries no alt text of its own. */
  function mark(url, name, abbr, cls) {
    return '<span class="mark ' + esc(cls || "plain") + '" aria-hidden="true">' +
             '<span class="initials">' + esc(initials(name, abbr)) + "</span>" +
             (url ? '<img src="' + esc(url) + '" alt="" loading="lazy" decoding="async" data-mark>' : "") +
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
               (opts.markUrl ? '<img src="' + esc(opts.markUrl) + '" alt="" loading="lazy" decoding="async" data-mark>' : "") +
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

  // Image load and error events do not bubble, but they do capture: one
  // listener on the document handles every mark, however it was inserted.
  function settle(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG") return;
    // A photo with a designed fallback behind it: a failure reveals the
    // fallback instead of showing a broken image.
    if (img.hasAttribute("data-fallback")) {
      if (e.type === "error" || !img.naturalWidth) {
        if (img.parentNode) { img.parentNode.classList.add("none"); img.parentNode.removeChild(img); }
      }
      return;
    }
    if (!img.hasAttribute("data-mark")) return;
    var box = img.parentNode;
    if (e.type === "load" && img.naturalWidth > 0) {
      if (box) box.classList.add("loaded");
    } else if (img.parentNode) {
      img.parentNode.removeChild(img);
    }
  }
  document.addEventListener("load", settle, true);
  document.addEventListener("error", settle, true);

  return { esc: esc, initials: initials, mark: mark, art: art, ago: ago, kickoff: kickoff };
})();
