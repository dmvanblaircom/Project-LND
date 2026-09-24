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

  // Image load and error events do not bubble, but they do capture: one
  // listener on the document handles every mark, however it was inserted.
  function settle(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || !img.hasAttribute("data-mark")) return;
    var box = img.parentNode;
    if (e.type === "load" && img.naturalWidth > 0) {
      if (box) box.classList.add("loaded");
    } else if (img.parentNode) {
      img.parentNode.removeChild(img);
    }
  }
  document.addEventListener("load", settle, true);
  document.addEventListener("error", settle, true);

  return { esc: esc, initials: initials, mark: mark };
})();
