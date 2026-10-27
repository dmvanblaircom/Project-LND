/* Suite - the fan's favorite teams (David, 2026-10-27: star teams in the
   chooser; one tap from the header switches between them).

     Suite.favorites.list()      ->  [team id], in the order they were starred
     Suite.favorites.has(id)     ->  boolean
     Suite.favorites.toggle(id)  ->  true when it is now a favorite, false when
                                     it is not (including when the list is full)

   Kept on this device only, as the chosen team and the style are: no
   account. Ids only, shape-checked as the boot script checks a team id, at
   most MAX of them. A full list refuses the next star rather than dropping
   an old one unasked. Whether a favorite can be opened is the registry's to
   say, never this list's: a team whose config is gone is simply not shown.
   Storage that throws or holds something else reads as no favorites. */

var Suite = Suite || {};

Suite.favorites = (function () {
  "use strict";

  var KEY = "suite-favorites", ID = /^[a-z0-9-]+$/, MAX = 12;

  function list() {
    var v;
    try { v = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
    if (!Array.isArray(v)) return [];
    return v.filter(function (x, i) { return typeof x === "string" && ID.test(x) && v.indexOf(x) === i; }).slice(0, MAX);
  }
  function write(l) {
    try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch (e) { return false; }
  }
  function has(id) { return list().indexOf(String(id)) !== -1; }
  function toggle(id) {
    id = String(id);
    if (!ID.test(id)) return false;
    var l = list(), i = l.indexOf(id);
    if (i !== -1) { l.splice(i, 1); write(l); return false; }
    if (l.length >= MAX) return false;
    l.push(id);
    return write(l);
  }

  return { list: list, has: has, toggle: toggle, MAX: MAX };
})();
