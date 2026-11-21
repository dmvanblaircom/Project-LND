/* TeamOS - which photographs a game wears (David, 2026-11-20).

     TeamOS.art.venue(game, time)   the stadium photo for the venue the game
                                    is played in: { key, src, srcset, credit,
                                    neutral } - the neutral stand-in when
                                    Suite has no photo of that venue, or null
                                    when there is no art at all
     TeamOS.art.credits()           every photograph's credit, for More

   The venue is the game's own: a home game is our stadium, an away game the
   opponent's, a neutral site its own venue when Suite has a photo of it. All
   three fall out of one rule - match the venue the schedule names - so no
   home/away logic can put a game in the wrong stadium.

   `time` is "day" or "night" (TeamOS.game.atmosphere); anything else is day.
   Reads TEAM_ART (leagues/college-football-art.js). Names no team. Teams are
   shown by their official marks, never helmets (decision 0046). */

var TeamOS = TeamOS || {};

TeamOS.art = (function () {
  "use strict";

  function data() { return typeof TEAM_ART !== "undefined" && TEAM_ART ? TEAM_ART : { venues: {} }; }
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }

  function photo(entry, time, key, neutral) {
    if (!entry) return null;
    var shot = entry[time === "night" ? "night" : "day"] || entry.day || entry.night;
    if (!shot || !shot.widths || !shot.widths.length) return null;
    var w = shot.widths.slice().sort(function (a, b) { return a - b; });
    return {
      key: key, neutral: !!neutral, time: shot === entry.night ? "night" : "day",
      src: shot.path.replace("{w}", w[w.length - 1]),
      srcset: w.map(function (x) { return shot.path.replace("{w}", x) + " " + x + "w"; }).join(", "),
      focus: shot.focus || "50% 50%",
      credit: shot.credit || null
    };
  }

  function venueKey(game) {
    var v = norm(game && game.venue), venues = data().venues;
    if (!v) return null;
    for (var k in venues) {
      if (k === "neutral" || !Object.prototype.hasOwnProperty.call(venues, k)) continue;
      if ((venues[k].names || []).some(function (n) { return norm(n) === v; })) return k;
    }
    return null;
  }

  function venue(game, time) {
    var venues = data().venues, k = venueKey(game);
    return (k && photo(venues[k], time, k, false)) || photo(venues.neutral, time, "neutral", true);
  }

  function credits() {
    var d = data(), out = [];
    Object.keys(d.venues).forEach(function (k) {
      ["day", "night"].forEach(function (t) {
        var s = d.venues[k][t];
        if (s && s.credit) out.push({ kind: "venue", key: k, time: t, name: d.venues[k].label || k, credit: s.credit });
      });
    });
    return out;
  }

  return { venue: venue, venueKey: venueKey, credits: credits };
})();
