/* TeamOS - Around: the week's games, in the layers that matter to one team
   (docs/product/around-your-team-brief.md and navigation-brief.md; David,
   2026-11-05).
     1. Our conference: every game this week with a member of the team's
        conference. An independent has no conference layer.
     2. Games that matter: the team's past and future opponents, its rivals
        (the team's `series`, trophies and rivalries - not branded events),
        and the teams ranked near it in the leading poll.
     3. Top 25: the week's ranked games, as Around has always shown them.
   A game is listed once, in the first layer that claims it.
   Pure: no fetch, no DOM, no team named in the code. Everything about the
   team is its data: its conference from the registry, its schedule, its
   series, its rank.
     TeamOS.around.layers({
       games:       LeagueGame[]       the week's FBS scoreboard
       teamId:      provider id of the team
       teamName:    the team's short name ("Notre Dame")
       conference:  the registry's conference name for the team
       conferences: { providerId: conference name } for every FBS program
       short:       { conference name: what fans call it } (league data)
       schedule:    Game[] - the team's season (oppProviderId, date, us, them)
       series:      the team config's series table
       polls:       Poll[] - the leading poll first (CFP once released)
       now:         Date
     }) -> { conference: { name, games: [{ game, why }] } | null,
             matter: [{ game, why: [string] }],
             top25: LeagueGame[] }                                          */
var TeamOS = TeamOS || {};
TeamOS.around = (function () {
  "use strict";
  var NEAR = 3;                      // places either side in the poll that count as "near"
  var INDEPENDENT = /independent/i;

  function sides(g) { return [g.home || {}, g.away || {}]; }
  function ids(g) { return sides(g).map(function (s) { return s.providerId ? String(s.providerId) : null; }); }
  function day(d) {
    var t = new Date(d);
    return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // A series entry from the team's config: [pattern, name] or { match, name, kind }.
  function rivalOf(series, name) {
    for (var i = 0; i < (series || []).length; i++) {
      var e = series[i], m = Array.isArray(e) ? { match: e[0], name: e[1], kind: "trophy" } : e;
      if (!m || !m.match || !m.match.test) continue;
      if (m.kind === "event") continue;              // a branded game is not a rival
      // The name, from its start, and not a different school that merely
      // begins or ends with it: Illinois's trophy is not Northern Illinois's,
      // Texas's is not Texas A&M's - but a pattern written as a prefix
      // ("michigan st") is Michigan State's (Codex, #232). The series
      // patterns are written for the team's own opponents; Around tests
      // every team in the week's games.
      var full = String(name || "").trim(), hit = full.match(m.match);
      if (hit && hit.index === 0) {
        var end = hit[0].length;
        if (end === full.length || (/\w/.test(full.charAt(end)) && /\w/.test(full.charAt(end - 1)))) return m.name;
      }
    }
    return null;
  }

  function layers(o) {
    o = o || {};
    var games = (o.games || []).filter(Boolean), me = o.teamId != null ? String(o.teamId) : null;
    var conferences = o.conferences || {}, claimed = {};
    var confName = o.conference && !INDEPENDENT.test(o.conference) ? o.conference : null;

    // 1. our conference
    var conference = null;
    if (confName) {
      var cg = games.filter(function (g) {
        return ids(g).some(function (id) { return id && conferences[id] === confName; });
      });
      cg.forEach(function (g) { claimed[g.id] = true; });
      conference = { name: (o.short || {})[confName] || confName,
                     games: cg.map(function (g) { return { game: g, why: [] }; }) };
    }

    // 2. games that matter: opponents, rivals, teams near us in the leading poll
    var opp = {};
    (o.schedule || []).forEach(function (s) {
      if (s && s.oppProviderId != null) opp[String(s.oppProviderId)] = s;
    });
    var poll = (o.polls || [])[0], near = {};
    if (poll && poll.ranks) {
      var mine = poll.ranks.filter(function (r) { return r.mine || (me && String(r.providerId) === me); })[0];
      if (mine && typeof mine.rank === "number") {
        poll.ranks.forEach(function (r) {
          if (r === mine || r.providerId == null || typeof r.rank !== "number") return;
          if (Math.abs(r.rank - mine.rank) <= NEAR) near[String(r.providerId)] = poll.label + " No. " + r.rank;
        });
      }
    }
    var now = o.now ? +new Date(o.now) : Date.now(), name = o.teamName || "you";
    var matter = [];
    games.forEach(function (g) {
      if (claimed[g.id] || g.mine) return;
      var why = [];
      sides(g).forEach(function (s) {
        var id = s.providerId ? String(s.providerId) : null;
        var sg = id && opp[id];
        if (sg) {
          var past = sg.date && +new Date(sg.date) < now;
          why.push(s.name + (past ? " played " : " plays ") + name + (sg.date ? " " + day(sg.date) : ""));
        }
        var rival = rivalOf(o.series, s.name);
        if (rival) why.push("Rival: " + s.name + " (" + rival + ")");
        if (id && near[id]) why.push(s.name + ": " + near[id] + ", near " + name);
      });
      if (why.length) {
        claimed[g.id] = true;
        matter.push({ game: g, why: why });
      }
    });

    // 3. Top 25: the ranked games no layer above has listed
    var top25 = games.filter(function (g) {
      return !claimed[g.id] && ((g.home && g.home.rank) || (g.away && g.away.rank));
    });
    return { conference: conference, matter: matter, top25: top25 };
  }

  return { layers: layers, NEAR: NEAR };
})();
