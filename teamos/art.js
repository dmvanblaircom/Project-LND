/* TeamOS - which photographs a game wears (David, 2026-11-20).

     TeamOS.art.venue(game, time)   the stadium photo for the venue the game
                                    is played in: { key, src, srcset, credit,
                                    neutral } - the neutral stand-in when
                                    Suite has no photo of that venue, or null
                                    when there is no art at all
     TeamOS.art.helmet(teamId)      a team's helmet photo, or null (the Suite
                                    shows the team's official mark instead)
     TeamOS.art.helmetByProvider(providerId)
                                    the same, for an opponent known only by
                                    the provider's id (through the registry)
     TeamOS.art.credits()           every photograph's credit, for More

   The venue is the game's own: a home game is our stadium, an away game the
   opponent's, a neutral site its own venue when Suite has a photo of it. All
   three fall out of one rule - match the venue the schedule names - so no
   home/away logic can put a game in the wrong stadium.

   `time` is "day" or "night" (TeamOS.game.atmosphere); anything else is day.
   Reads TEAM_ART (leagues/college-football-art.js) and TEAM_REGISTRY. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.art = (function () {
  "use strict";

  function data() { return typeof TEAM_ART !== "undefined" && TEAM_ART ? TEAM_ART : { venues: {}, helmets: {} }; }
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

  function helmet(teamId) {
    var h = teamId && data().helmets[teamId];
    if (!h || !h.path || !h.widths || !h.widths.length) return null;
    var w = h.widths.slice().sort(function (a, b) { return a - b; });
    return {
      team: teamId, facing: h.facing === "left" ? "left" : "right", mirror: h.mirror !== false,
      src: h.path.replace("{w}", w[w.length - 1]),
      srcset: w.map(function (x) { return h.path.replace("{w}", x) + " " + x + "w"; }).join(", "),
      credit: h.credit || null
    };
  }

  function helmetByProvider(providerId) {
    if (providerId == null || typeof TEAM_REGISTRY === "undefined") return null;
    var id = String(providerId), list = TEAM_REGISTRY.teams || TEAM_REGISTRY || [];
    var hit = (Array.isArray(list) ? list : []).filter(function (t) { return t && String(t.providerId) === id; })[0];
    return hit ? helmet(hit.id) : null;
  }

  function credits() {
    var d = data(), out = [];
    Object.keys(d.venues).forEach(function (k) {
      ["day", "night"].forEach(function (t) {
        var s = d.venues[k][t];
        if (s && s.credit) out.push({ kind: "venue", key: k, time: t, name: d.venues[k].label || k, credit: s.credit });
      });
    });
    Object.keys(d.helmets).forEach(function (k) {
      if (d.helmets[k].credit) out.push({ kind: "helmet", key: k, name: d.helmets[k].label || k, credit: d.helmets[k].credit });
    });
    return out;
  }

  return { venue: venue, venueKey: venueKey, helmet: helmet, helmetByProvider: helmetByProvider, credits: credits };
})();
