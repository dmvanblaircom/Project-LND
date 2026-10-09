/* TeamOS - this week's facts from the team's official game notes
   (David, 2026-10-09: pronunciations, captains and honors, the series card,
   By the Numbers; docs/product/game-notes-features.md).

     data/<team>/notes.json  ->  TeamOS.notes.model(snap, config)  ->  Notes | null
                                 TeamOS.notes.player(notes, name)   ->  { say, captain, honors } | null
                                 TeamOS.notes.forGame(notes, game)  ->  Notes | null

     Notes = { game, publishedAt, source: { url, label },
               glance: [fact], numbers: [{ n, text }],
               pronounce, captains, honors }          (players by name)

   - The snapshot is the team's own (decision 0008): another team's file, or
     one without a source, is null.
   - A player is matched by name across the notes and the provider's roster
     with case, punctuation, curly apostrophes and a Jr./III suffix ignored -
     never by guesswork beyond that: an unmatched player simply has nothing.
   - The series facts and By the Numbers belong to ONE game, the one the
     notes were written for: forGame() gives them only for that opponent and
     only before it is final, so last week's numbers never sit beside next
     week's game.

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.notes = (function () {
  "use strict";

  function str(v) { return v == null ? "" : String(v); }
  function key(name) {
    return str(name).replace(/[‘’ʼ`]/g, "'").replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "")
      .toLowerCase().replace(/[^a-z']/g, "");
  }

  function model(snap, config) {
    var team = config && config.team && config.team.id;
    if (!snap || snap.capability !== "notes" || (team && snap.team !== team)) return null;
    var pronounce = {}, honors = {}, captains = {};
    Object.keys(snap.pronounce || {}).forEach(function (n) { var s = str(snap.pronounce[n]).trim(); if (s) pronounce[key(n)] = s; });
    Object.keys(snap.honors || {}).forEach(function (n) {
      var list = (snap.honors[n] || []).map(str).filter(Boolean);
      if (list.length) honors[key(n)] = list;
    });
    (snap.captains || []).forEach(function (n) { if (n) captains[key(n)] = true; });
    return {
      game: snap.game ? str(snap.game) : null,
      publishedAt: snap.publishedAt || null,
      source: { url: snap.sourceUrl || snap.pdf || null, label: str(snap.sourceLabel || "Official game notes") },
      glance: (snap.glance || []).map(str).filter(Boolean),
      numbers: (snap.numbers || []).filter(function (x) { return x && x.n && x.text; })
        .map(function (x) { return { n: str(x.n), text: str(x.text) }; }),
      pronounce: pronounce, captains: captains, honors: honors
    };
  }

  function player(notes, name) {
    if (!notes || !name) return null;
    var k = key(name);
    var say = notes.pronounce[k] || null, captain = !!notes.captains[k], honors = notes.honors[k] || [];
    return say || captain || honors.length ? { say: say, captain: captain, honors: honors } : null;
  }

  // The opponent the notes were written for is the game's opponent, by
  // name: case, spaces and punctuation aside, and "State" the same as
  // ESPN's "St." ("Michigan State" / "Michigan St").
  function sameOpp(a, b) {
    var x = key(a).replace(/'/g, ""), y = key(b).replace(/'/g, "");
    if (!x || !y) return false;
    if (x === y) return true;
    var sx = x.replace(/state$/, "st"), sy = y.replace(/state$/, "st");
    return sx === sy;
  }
  function forGame(notes, game) {
    if (!notes || !game || !notes.game) return null;
    if (game.status === "final" || game.status === "canceled" || game.status === "postponed") return null;
    return sameOpp(notes.game, game.oppName) ? notes : null;
  }

  return { model: model, player: player, forGame: forGame, key: key };
})();
