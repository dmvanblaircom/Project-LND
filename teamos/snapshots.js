/* TeamOS - snapshot ownership.

   Some files in this repository are team data, not application data: the
   depth chart, the availability report, the odds price history and the
   beat-writer stories. They live in data/<team id>/ (league-wide files, such
   as the Kalshi markets every team's price is read from, in data/league/).
   The Action once wrote them at the root for one team, and app.js read them
   by name for whichever team was configured - so a second team's page
   showed the first team's two-deep, sparklines and beat stories under its
   own name
   (docs/engineering/phase-5a-ohio-state-proof.md, findings 1-3).

   This module makes ownership explicit and gives the Suite one question to
   ask instead of a filename to assume:

     TeamOS.snapshots.get(config, kind)   ->  the team's declaration for that
                                              kind of snapshot, or null when
                                              the team has none
     TeamOS.snapshots.owned(team, json)   ->  whether a loaded snapshot
                                              belongs to this team

   A team declares the snapshots it has in its config's `snapshots` section:

     snapshots: {
       depth:        { file: "data/<id>/depth.json", history: "data/<id>/depth-history.json", label: "..." },
       availability: { file: "data/<id>/availability.json", history: "data/<id>/availability-history.json" },
       oddsHistory: { file: "data/<id>/odds-history.json" },
       beatNews:    { file: "data/<id>/news.json" }
     }

   A team with no depth-chart source simply leaves `depth` out, and the
   Suite renders its unavailable state; it never borrows another team's
   file. Ownership is by declaration plus, where the file carries one, a
   `team` field matching the Team's id. Every producer stamps that field
   now (backlog C2); a file without one - written before the stamping - is
   still trusted on the strength of the declaration, as recorded in
   docs/decisions/0008-snapshots-are-owned-by-declaration.md. A stamped file
   for another team is refused. */

var TeamOS = TeamOS || {};

TeamOS.snapshots = (function () {
  "use strict";

  var KINDS = { depth: 1, availability: 1, oddsHistory: 1, beatNews: 1 };

  function fail(what) { throw new Error("TeamOS.snapshots: " + what); }

  // The team's declaration for one kind of snapshot, or null. The kind is
  // checked so a typo in app.js fails loudly rather than reading as "none".
  function get(config, kind) {
    if (!KINDS[kind]) fail("unknown snapshot kind \"" + kind + "\"");
    var all = config && config.snapshots;
    var s = all && all[kind];
    if (s == null) return null;
    if (typeof s !== "object") fail(kind + " must be an object");
    if (typeof s.file !== "string" || !s.file.trim()) fail(kind + ".file must be a non-empty string");
    if (s.history != null && (typeof s.history !== "string" || !s.history.trim())) fail(kind + ".history must be a non-empty string");
    return s;
  }

  // Does a loaded snapshot belong to this team? A file that names a team
  // must name this one; a file that names none is trusted because the
  // team declared it (see the note above).
  function owned(team, json) {
    if (!json || typeof json !== "object") return false;
    if (json.team == null) return true;
    return json.team === team.id;
  }

  // Every file this team declares, across all kinds - the file and, where a
  // kind keeps one, its history. The service worker asks for this: it has no
  // TEAM_CONFIG of its own, so the page has to tell it what this team's
  // offline copy consists of (decision 0015). Deriving it here rather than
  // listing it in the worker means a team that adds a snapshot gets it cached
  // without anyone remembering to update a second list.
  function files(config) {
    var out = [];
    Object.keys(KINDS).forEach(function (kind) {
      var s = get(config, kind);
      if (!s) return;
      out.push(s.file);
      if (s.history) out.push(s.history);
    });
    return out;
  }

  return { get: get, owned: owned, files: files };
})();
