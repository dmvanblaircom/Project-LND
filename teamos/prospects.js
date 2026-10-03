/* TeamOS - the team's recruiting class and its NFL draft prospects (W16).

     data/<team>/recruits.json  ->  TeamOS.prospects.recruits(snap, TEAM_CONFIG)  ->  RecruitClass | null
     data/league/draft.json     ->  TeamOS.prospects.draft(snap, TEAM_CONFIG)     ->  DraftClass | null

   Both come from ESPN (David, 2026-10-03; offseason proposal §7 rows 4 and
   6), through tools/producers/prospects.py, which has already kept only
   committed recruits and only the fields shown here.

     RecruitClass = { label, sourceUrl, classYear, fetchedAt, total,
                      recruits: [Recruit] }   best grade first
     Recruit      = { name, position, highSchool, hometown, grade,
                      rank, positionRank, stateRank, status }

     DraftClass   = { label, sourceUrl, year, fetchedAt, phase, total,
                      prospects: [Prospect] }
     Prospect     = { name, position, positionRank, overall, grade, pick }
     pick         = { round, pick, overall, team } | null

   - phase is "board" before the draft (ESPN's board, in its overall order)
     and "drafted" once any pick is made (in draft order, undrafted last).
   - The board is ESPN's ranking, not a projection: there is no projected
     pick, and none is invented from the rank. grade is null until ESPN
     publishes one.
   - A rank, a grade or a pick that ESPN does not give is null, never 0.
   - null when there is no usable snapshot, or the snapshot is another
     team's: "not published" and "couldn't load" are the app's to tell
     apart, not this file's.

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.prospects = (function () {
  "use strict";

  function pos(v) { return typeof v === "number" && isFinite(v) && v > 0 ? v : null; }
  function str(v) { return v == null ? "" : String(v); }
  function teamId(config) { return str(config && config.sources && config.sources.espn && config.sources.espn.teamId); }

  function recruits(snap, config) {
    var id = teamId(config);
    if (!snap || snap.source !== "espn-recruiting" || !Array.isArray(snap.recruits) || !id || str(snap.teamId) !== id) return null;
    var rows = snap.recruits.filter(function (r) { return r && r.name; }).map(function (r) {
      return {
        name: str(r.name), position: r.position ? str(r.position) : null,
        highSchool: r.highSchool ? str(r.highSchool) : null,
        hometown: [r.city, r.state].filter(Boolean).join(", ") || null,
        grade: pos(r.grade), rank: pos(r.rank), positionRank: pos(r.positionRank), stateRank: pos(r.stateRank),
        status: r.status ? str(r.status) : null
      };
    });
    return {
      label: str(snap.label || "ESPN recruiting"), sourceUrl: snap.sourceUrl || null,
      classYear: snap.classYear != null ? snap.classYear : null, fetchedAt: snap.fetchedAt || null,
      total: rows.length, recruits: rows
    };
  }

  function draft(snap, config) {
    var id = teamId(config);
    if (!snap || snap.source !== "espn-draft" || !Array.isArray(snap.prospects) || !id) return null;
    var mine = snap.prospects.filter(function (p) { return p && p.name && str(p.collegeId) === id; }).map(function (p) {
      var k = p.pick;
      return {
        name: str(p.name), position: p.position ? str(p.position) : null,
        positionRank: pos(p.positionRank), overall: pos(p.overall), grade: pos(p.grade),
        pick: k && pos(k.round) && pos(k.overall)
          ? { round: k.round, pick: pos(k.pick), overall: k.overall, team: k.nflTeam ? str(k.nflTeam) : null }
          : null
      };
    });
    var drafted = snap.prospects.some(function (p) { return p && p.pick; });
    var BIG = 1e9;
    mine.sort(drafted
      ? function (a, b) { return ((a.pick && a.pick.overall) || BIG) - ((b.pick && b.pick.overall) || BIG) || (a.overall || BIG) - (b.overall || BIG); }
      : function (a, b) { return (a.overall || BIG) - (b.overall || BIG); });
    return {
      label: str(snap.label || "ESPN draft board"), sourceUrl: snap.sourceUrl || null,
      year: snap.year != null ? snap.year : null, fetchedAt: snap.fetchedAt || null,
      phase: drafted ? "drafted" : "board", total: mine.length, prospects: mine
    };
  }

  return { recruits: recruits, draft: draft };
})();
