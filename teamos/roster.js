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
  // Out means out of the game. Out for the first half is not: that player
  // still plays, so the chart and roster keep him (Big Ten reports, 2026).
  var OUT = /^out-(game|season)$/;
  function outNames(report, chart) {
    var out = {};
    if (!report || !report.reported) return out;
    // A report its producer marks as not current - last game's, kept on
    // file through a bye or until this week's is filed - says who missed
    // that game, not who will miss the next (Codex, #118).
    if (report.current === false) return out;
    if (chart && (!report.game || report.game !== chart.game)) return out;
    (report.players || []).forEach(function (p) {
      if (OUT.test(p.status || "") && fold(p.name)) out[fold(p.name)] = p.status;
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
  // What changed since the last chart, for the compact disclosure under the
  // chart's source (issue #30, David 2026-09-28): one entry per player per
  // place that changed, previous -> current, across every unit. It uses the
  // SAME previous chart as the arrows, so the count and the arrows never
  // disagree about what "the last chart" is. null when there is no previous
  // chart to compare with - never "no changes" from missing history; a
  // count of 0 means a real comparison found nothing.
  //
  // A place is { unit, spot, level, or }: `or` lists who shared that level
  // (the chart's OR), so a move into or out of a co-listing reads as one.
  // A player who left one spot and appeared at another is one "moved"
  // entry, paired in chart order; new to the chart is "enters", gone from
  // it is "leaves"; still on the chart but at fewer or more spots is
  // "removed" / "added".
  function placements(chart) {
    var out = [];
    ((chart && chart.units) || []).forEach(function (u) { (u.slots || []).forEach(function (s) {
      var repeated = u.slots.filter(function (x) { return x.label === s.label; }).length > 1;
      (s.levels || []).forEach(function (lv) { (lv.players || []).forEach(function (p) {
        var n = fold(p.name); if (!n) return;
        out.push({ who: n, name: p.name, no: String(p.no || ""), key: spotKey(u, s),
                   place: { unit: u.unit, spot: spotName(s.label) + (repeated ? " " + s.ordinal : ""), label: s.label,
                            level: lv.level, or: lv.players.filter(function (q) { return q !== p; }).map(function (q) { return q.name; }) } });
      }); });
    }); });
    return out;
  }
  function sinceLast(chart, hist) {
    var prev = previousChart(chart, hist);
    if (!prev || !prev.units) return null;
    var now = placements(chart), was = placements(prev), items = [];
    function of(list, who) { return list.filter(function (x) { return x.who === who; }); }
    var people = [];
    now.concat(was).forEach(function (x) { if (people.indexOf(x.who) < 0) people.push(x.who); });
    people.forEach(function (who) {
      var a = of(was, who), b = of(now, who), gone = [], fresh = [];
      b.forEach(function (x) {
        var y = a.filter(function (z) { return z.key === x.key; })[0];
        if (!y) fresh.push(x);
        else if (x.place.level !== y.place.level)
          items.push({ kind: x.place.level < y.place.level ? "up" : "down", name: x.name, no: x.no, from: y.place, to: x.place });
      });
      a.forEach(function (y) { if (!b.some(function (x) { return x.key === y.key; })) gone.push(y); });
      while (fresh.length && gone.length) {
        var t = fresh.shift(), f = gone.shift();
        items.push({ kind: "moved", name: t.name, no: t.no, from: f.place, to: t.place });
      }
      fresh.forEach(function (x) { items.push({ kind: a.length ? "added" : "enters", name: x.name, no: x.no, from: null, to: x.place }); });
      gone.forEach(function (y) { items.push({ kind: b.length ? "removed" : "leaves", name: y.name, no: y.no, from: y.place, to: null }); });
    });
    return { count: items.length, game: prev.game || "", title: prev.title || "", changes: items };
  }

  // Battle framing (issue #31, David 2026-09-30, option A): a first-team OR
  // reads as a position battle only on the season's first chart - preseason
  // or Game 1. From the team's Game 2 chart on, co-starters are just
  // co-starters: the OR stays, the Battle badge and the open-jobs count go.
  // The edition comes from the chart's own title ("DEPTH CHART - GAME 5 AT
  // NORTH CAROLINA"), never the device date. A title that names no game and
  // no preseason is unknown, and unknown gets no battle framing: an OR late
  // in the season must never be called unresolved. A new season's first
  // chart is Game 1 again, so it resets on its own.
  function phase(chart) {
    var t = String((chart && chart.title) || ""), m = /\bGAME\s+(\d+)\b/i.exec(t);
    var game = m ? Number(m[1]) : null;
    var pre = !m && /\b(PRE-?SEASON|SPRING|FALL CAMP|CAMP)\b/i.test(t);
    return { game: game, preseason: pre, known: game != null || pre, battles: pre || game === 1 };
  }

  function depth(chart, groups, report, hist) {
    if (!chart || !chart.units) return null;
    var ph = phase(chart);
    var all = everyone(groups), outs = outNames(report, chart);
    var prev = previousChart(chart, hist), was = prev ? placesOf(prev) : null;
    function moved(u, s, lv, p) {
      if (!was) return null;
      var n = fold(p.name), before = was.at[spotKey(u, s) + "|" + n];
      if (before == null) return was.anywhere[n] ? null : "up";
      return lv.level < before ? "up" : lv.level > before ? "down" : null;
    }
    return {
      title: chart.title || "", game: chart.game || "", phase: ph,
      source: { url: chart.sourceUrl || null, label: chart.sourceLabel || null },
      changes: (chart.changes || []).map(function (c) { return { kind: c.kind, text: c.text }; }),
      since: sinceLast(chart, hist),
      units: chart.units.map(function (u) {
        return { unit: u.unit, key: fold(u.unit), slots: (u.slots || []).map(function (s) {
          var repeated = u.slots.filter(function (x) { return x.label === s.label; }).length > 1;
          return { label: s.label, ordinal: s.ordinal, repeated: repeated,
                   name: spotName(s.label) + (repeated ? " " + s.ordinal : ""),
                   // co-starters at first team (a fact of the chart), and
                   // whether that reads as a battle (the season's phase)
                   sharedFirst: !!(s.levels[0] && s.levels[0].players.length > 1),
                   open: ph.battles && !!(s.levels[0] && s.levels[0].players.length > 1),
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
  // A conference report (the Big Ten's) adds two: out for the first half,
  // and the gameday report's game-time decision.
  var STATUS = [["out-season", "Out for the season"], ["out-game", "Out for the game"],
                ["out-half", "Out for the first half"], ["doubtful", "Doubtful"],
                ["gtd", "Game-time decision"], ["questionable", "Questionable"], ["probable", "Probable"]];
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
                 out: ps.filter(function (p) { return OUT.test(p.status); }).length,
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

  return { views: views, depth: depth, phase: phase, availability: availability, history: history, spotName: spotName, withStatus: withStatus };
})();
