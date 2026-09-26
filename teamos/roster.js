/* TeamOS - the team's people: which roster views a team has, the depth chart
   joined to the roster, and what a spot is called.

     TEAM_CONFIG + snapshots  ->  TeamOS.roster.views()     the Roster views
     depth snapshot + roster  ->  TeamOS.roster.depth()     spots with people
       (+ availability report,                                who is out, and
          + season's charts)                                  who moved
     roster + report (+ chart)->  TeamOS.roster.withStatus() the roster, out marked
     a spot's label           ->  TeamOS.roster.spotName()  "Defensive Tackle"

   Pure: no fetch, no DOM, no provider named. The depth chart and the
   availability report are the official documents (decision 0019), read by
   the producers into the snapshot schema; the roster is normalized by the
   adapter (TeamOS.espn.roster). This file only combines them.

   The join is strict on purpose. A depth-chart entry takes the roster
   player with the same jersey number AND the same last name, or failing
   that the one player with exactly the same name. Never the number alone:
   college teams reuse numbers across offense and defense, and a wrong
   photo or height on the wrong player is worse than none. An entry with no
   match keeps what the official chart says and nothing more. */

var TeamOS = TeamOS || {};

TeamOS.roster = (function () {
  "use strict";

  // Which views the Roster screen has, from what the team actually has
  // (a capability, not a team branch): the depth chart and the availability
  // report only where a source is declared; the roster always.
  function views(config) {
    var get = TeamOS.snapshots && TeamOS.snapshots.get;
    var out = [];
    if (get && get(config, "depth")) out.push({ id: "depth", label: "Depth Chart" });
    out.push({ id: "roster", label: "Roster" });
    if (get && get(config, "availability")) out.push({ id: "availability", label: "Availability" });
    return out;
  }

  var SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;
  function fold(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }
  function lastName(name) {
    var w = String(name || "").trim().split(/\s+/).filter(function (x) { return !SUFFIX.test(x); });
    return w.length ? fold(w[w.length - 1]) : "";
  }

  // roster groups -> one lookup of every player
  function everyone(groups) {
    var all = [];
    (groups || []).forEach(function (g) { (g.players || []).forEach(function (p) { all.push(p); }); });
    return all;
  }
  function match(entry, all) {
    var ln = lastName(entry.name);
    var byNo = all.filter(function (p) { return p.jersey === String(entry.no) && lastName(p.name) === ln && ln; });
    if (byNo.length === 1) return byNo[0];
    var full = fold(entry.name);
    var byName = all.filter(function (p) { return fold(p.name) === full && full; });
    return byName.length === 1 ? byName[0] : null;
  }

  // The depth chart with each entry joined to its roster player. Units keep
  // the chart's own order; spots, levels and OR groups are untouched
  // (decision 0019) - only people gain height, weight, hometown and photo.
  //
  // With the availability report for the SAME game, a player the report
  // lists as out (for the game or the season) is marked `out`: the chart
  // is the coaches' order, the report says who will not play, and a fan
  // should see both (David, 2026-09-26). By exact name - the report carries
  // no numbers. A report for another game marks nobody.
  // With no chart to compare against (a team with a report but no depth
  // chart), the report alone decides.
  function outNames(report, chart) {
    var out = {};
    if (!report || !report.reported) return out;
    if (chart && (!report.game || report.game !== chart.game)) return out;
    (report.players || []).forEach(function (p) {
      if (/^out-/.test(p.status || "") && fold(p.name)) out[fold(p.name)] = p.status;
    });
    return out;
  }
  // Who moved since the previous chart (David and a tester, 2026-09-26): an
  // arrow on the player, not a list of changes. Up when he is higher at the
  // same spot than on the last chart, or new to the chart; down when he is
  // lower. Moving to another spot is not up or down. The arrow lasts one
  // chart: next week, still where he is, it drops off.
  function spotKey(u, s) { return fold(u.unit) + "|" + String(s.label) + "|" + String(s.ordinal); }
  function previousChart(chart, hist) {
    var snaps = (hist && hist.snapshots) || [], i;
    for (i = snaps.length - 1; i >= 0; i--) if (snaps[i].game === chart.game) break;
    if (i < 0) i = snaps.length;                 // the chart is newer than the history
    for (var j = i - 1; j >= 0; j--) if (snaps[j].game !== chart.game) return snaps[j];
    return null;
  }
  function placesOf(chart) {
    var at = {}, anywhere = {};
    ((chart && chart.units) || []).forEach(function (u) { (u.slots || []).forEach(function (s) {
      (s.levels || []).forEach(function (lv) { (lv.players || []).forEach(function (p) {
        var n = fold(p.name); if (!n) return;
        anywhere[n] = true; at[spotKey(u, s) + "|" + n] = lv.level;
      }); });
    }); });
    return { at: at, anywhere: anywhere };
  }
  function depth(chart, groups, report, hist) {
    if (!chart || !chart.units) return null;
    var all = everyone(groups), outs = outNames(report, chart);
    var prev = previousChart(chart, hist), was = prev ? placesOf(prev) : null;
    function moved(u, s, lv, p) {
      if (!was) return null;
      var n = fold(p.name), before = was.at[spotKey(u, s) + "|" + n];
      if (before == null) return was.anywhere[n] ? null : "up";
      return lv.level < before ? "up" : lv.level > before ? "down" : null;
    }
    return {
      title: chart.title || "", game: chart.game || "",
      source: { url: chart.sourceUrl || null, label: chart.sourceLabel || null },
      changes: (chart.changes || []).map(function (c) { return { kind: c.kind, text: c.text }; }),
      units: chart.units.map(function (u) {
        return { unit: u.unit, key: fold(u.unit), slots: (u.slots || []).map(function (s) {
          var repeated = u.slots.filter(function (x) { return x.label === s.label; }).length > 1;
          return { label: s.label, ordinal: s.ordinal, repeated: repeated,
                   name: spotName(s.label) + (repeated ? " " + s.ordinal : ""),
                   open: !!(s.levels[0] && s.levels[0].players.length > 1),
                   levels: s.levels.map(function (lv) {
                     return { level: lv.level, players: lv.players.map(function (p) {
                       var mv = moved(u, s, lv, p);
                       var r = match(p, all);
                       return { no: String(p.no || ""), name: p.name, classYear: p.cl || (r && r.classYear) || "",
                                height: r ? r.height : "", weight: r ? r.weight : "",
                                hometown: r ? r.hometown : null, photo: r ? r.photo : null, matched: !!r,
                                out: outs[fold(p.name)] || null, moved: mv };
                     }) };
                   }) };
        }) };
      })
    };
  }

  // What a spot is called, in words. Football's general positions have
  // names; a team's own terms (WILL, MIKE, BOUND, FIELD, NICKEL...) are
  // shown as the official chart writes them.
  var NAMES = {
    QB: "Quarterback", RB: "Running Back", TB: "Tailback", FB: "Fullback", WR: "Wide Receiver",
    TE: "Tight End", LT: "Left Tackle", LG: "Left Guard", C: "Center", RG: "Right Guard",
    RT: "Right Tackle", OL: "Offensive Line", DE: "Defensive End", DT: "Defensive Tackle",
    NT: "Nose Tackle", DL: "Defensive Line", LB: "Linebacker", ILB: "Inside Linebacker",
    OLB: "Outside Linebacker", MLB: "Middle Linebacker", CB: "Cornerback", S: "Safety",
    FS: "Free Safety", SS: "Strong Safety", K: "Kicker", PK: "Placekicker", P: "Punter",
    KO: "Kickoff", LS: "Long Snapper", H: "Holder", KR: "Kick Returner", PR: "Punt Returner"
  };
  function spotName(label) { return NAMES[String(label || "").toUpperCase()] || String(label || ""); }

  // The official availability report (decision 0019), grouped by status in
  // the report's own order of severity, each person joined to the roster for
  // a photo by exact name only - the report carries no jersey numbers.
  // `reported: false` is "no report", never "everyone is fine".
  var STATUS = [["out-season", "Out for the season"], ["out-game", "Out for the game"],
                ["doubtful", "Doubtful"], ["questionable", "Questionable"], ["probable", "Probable"]];
  function availability(report, groups) {
    if (!report) return null;
    var all = everyone(groups);
    var people = report.players || [];
    return {
      reported: !!report.reported, game: report.game || "", effectiveAt: report.effectiveAt || null,
      source: { url: report.sourceUrl || report.pdf || null, label: report.sourceLabel || null },
      groups: STATUS.map(function (st) {
        return { status: st[0], label: st[1], players: people.filter(function (p) { return p.status === st[0]; }).map(function (p) {
          var r = match({ no: p.no, name: p.name }, all);
          return { name: p.name, pos: p.pos || "", detail: p.detail || "", no: p.no || (r ? r.jersey : ""), photo: r ? r.photo : null };
        }) };
      }).filter(function (g) { return g.players.length; })
    };
  }

  // Every depth chart this season, newest first: what moved each week and
  // that week's availability, as counts - how they are worded is Suite's.
  function history(depthHistory, availHistory) {
    var snaps = (depthHistory && depthHistory.snapshots) || [];
    var reports = (availHistory && availHistory.reports) || [];
    return snaps.slice().reverse().map(function (s) {
      var r = reports.filter(function (x) { return x.game === s.game; })[0];
      var ps = r && r.players || [];
      return { game: s.game || "", title: s.title || "", url: s.sourceUrl || null,
               changes: (s.changes || []).map(function (c) { return { kind: c.kind, text: c.text }; }),
               availability: !r ? null : { reported: !!r.reported,
                 out: ps.filter(function (p) { return /^out/.test(p.status); }).length,
                 questionable: ps.filter(function (p) { return p.status === "questionable"; }).length } };
    });
  }

  // The roster with each player the report lists as out marked `out`, by the
  // same rule as the depth chart: the report for the chart's game, or the
  // report alone when the team has no chart. Copies; the groups are shared.
  function withStatus(groups, report, chart) {
    var outs = outNames(report, chart);
    var all = everyone(groups), byPlayer = [];
    (report && report.players || []).forEach(function (p) {
      if (!outs[fold(p.name)]) return;
      var r = match({ no: p.no, name: p.name }, all);
      if (r) byPlayer.push([r, outs[fold(p.name)]]);
    });
    return (groups || []).map(function (g) {
      return Object.assign({}, g, { players: (g.players || []).map(function (p) {
        var hit = byPlayer.filter(function (x) { return x[0] === p; })[0] || (outs[fold(p.name)] ? [p, outs[fold(p.name)]] : null);
        return hit ? Object.assign({}, p, { out: hit[1] }) : p;
      }) });
    });
  }

  return { views: views, depth: depth, availability: availability, history: history, spotName: spotName, withStatus: withStatus };
})();
