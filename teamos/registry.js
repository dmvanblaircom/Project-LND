/* TeamOS - the program registry.

   Answers the questions the Suite asks about programs it is not currently
   showing: which ones exist, which ones can be selected, and what a given id
   is called. The list itself is data (teams/index.js); this file is the rule
   that turns it into answers, so that "is this team available?" is decided in
   one place rather than by whoever is rendering a list at the time.

   The rule: **a program is available when it names a config.** Nothing else
   marks availability - no flag to forget to set, no parallel list to keep in
   step (docs/decisions/0014-one-registry.md).

   Pure. No fetch, no DOM, no provider, no team named in the code. A malformed
   row is dropped rather than thrown on: a typo in one program must not take
   the chooser down with it. */

var TeamOS = TeamOS || {};

TeamOS.registry = (function () {
  "use strict";

  // Also what the boot script enforces on ?team=, because an id becomes a
  // file path. Keep the two in step; tools/bootcheck.js checks that they are.
  var ID = /^[a-z0-9-]+$/;

  function clean(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (t) {
      if (!t || typeof t !== "object") return;
      if (typeof t.id !== "string" || !ID.test(t.id)) return;
      if (typeof t.name !== "string" || !t.name) return;
      if (seen[t.id]) return;                       // first row wins
      seen[t.id] = true;
      out.push(Object.freeze({
        id:         t.id,
        name:       t.name,
        short:      typeof t.short === "string" && t.short ? t.short : t.name,
        conference: typeof t.conference === "string" && t.conference ? t.conference : "Independent",
        // What a fan might type instead of the name: the provider's official
        // short code ("OSU") and the nickname ("Buckeyes"). Both optional -
        // a registry row without them is still a program.
        abbr:       typeof t.abbr === "string" && t.abbr ? t.abbr : null,
        nick:       typeof t.nick === "string" && t.nick ? t.nick : null,
        config:     typeof t.config === "string" && t.config ? t.config : null,
        available:  !!(typeof t.config === "string" && t.config)
      }));
    });
    return out;
  }

  function byName(a, b) {
    return String(a).localeCompare(String(b), "en", { sensitivity: "base" });
  }

  function create(list) {
    var all = clean(list);
    var byId = {};
    all.forEach(function (t) { byId[t.id] = t; });

    return Object.freeze({
      // Every program known, in the order the registry lists them.
      all: function () { return all.slice(); },

      // Only the ones a fan can actually open.
      available: function () {
        return all.filter(function (t) { return t.available; });
      },

      // Every program, A-Z by name. This is the order a list of programs is
      // presented in unless something has a reason to differ, so it is
      // decided here rather than by each caller.
      //
      // localeCompare, not `<`: the roster carries accents and punctuation
      // (San José State, Hawai'i, Miami (OH), Texas A&M) and byte order puts
      // those in places no reader would look for them. The locale is named
      // so the order does not depend on the machine.
      sorted: function () {
        return all.slice().sort(function (a, b) { return byName(a.name, b.name); });
      },

      get: function (id) { return byId[id] || null; },
      isAvailable: function (id) { return !!(byId[id] && byId[id].available); },
      configFor: function (id) { return byId[id] ? byId[id].config : null; },
      isId: function (id) { return typeof id === "string" && ID.test(id); }
    });
  }

  return { create: create, ID: ID };
})();
