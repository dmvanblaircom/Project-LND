/* TeamOS - the FBS-wide season figures Suite adds up from ESPN's own box
   scores (tools/producers/season_stats.py -> data/league/season-stats.json).

   ESPN's season totals get turnovers wrong (its margin matched the NCAA's
   FBS table for 8% of teams) and its yards-allowed figures are stubs, but
   its box scores, added up game by game, matched the NCAA's turnovers for
   99% (2026-11-11; docs/engineering/espn-accuracy-2026-11-11.md). So the
   producer adds them up once a day, for every registry program:

     takeaways, giveaways     -> the turnover margin (Matchup, Stats)
     rushAllowed, passAllowed -> Matchup's Rushing and Passing defense
     ranks                    -> the FBS ranks of passing offense and the
                                 turnover margin, the two ESPN ranks wrong
                                 (passing across all of Division I)

   Keyed by ESPN team id, the same opaque key the app already holds for each
   side. CollegeFootballData is not asked for any of it (David, 2026-11-10).

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.fbs = (function () {
  "use strict";

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }

  // Where the snapshot is served (the app reads it as it reads FPI's).
  var PATH = "data/league/season-stats.json";

  // The snapshot and an ESPN team id -> that team's row, or null when the
  // file is not one, is for another season, or has no figures for it (an
  // FCS opponent, or a season with a game whose box score never came).
  function teamRow(snap, id, year) {
    if (!snap || snap.source !== "espn-box-scores" || !snap.teams) return null;
    if (year != null && snap.season !== year) return null;
    var row = snap.teams[String(id)];
    return row && num(row.games) ? row : null;
  }

  // A team's row -> { rush, pass, games }: yards allowed per game, to one
  // decimal as the card shows them, null where there is none (never 0;
  // a real 0 is kept).
  function yardsAllowed(row) {
    return { rush: row ? num(row.rushAllowed) : null, pass: row ? num(row.passAllowed) : null,
             games: row ? num(row.games) : null };
  }

  // A team's row -> { margin, takeaways, giveaways }: season totals, null
  // where there is none, and the margin only when both sides of it came.
  function turnovers(row) {
    var given = row ? num(row.giveaways) : null, taken = row ? num(row.takeaways) : null;
    return { margin: given != null && taken != null ? taken - given : null, takeaways: taken, giveaways: given };
  }
  // A margin as Suite prints one: "+8", "-6", "0".
  function signed(n) { return n == null ? null : (n > 0 ? "+" : "") + n; }

  // A team's season as TeamOS.espn.teamSeason() shapes it, with the
  // turnover rows put first in its "turnovers" group (made, after the rest,
  // if ESPN's figures left it out). Rows with no figure are left
  // out, as teamSeason leaves out its own. The margin's rank comes from
  // withRanks.
  function withTurnovers(season, t) {
    if (!season || !t) return season;
    var rows = [["turnoverMargin", "Turnover margin", signed(t.margin)],
                ["takeaways", "Takeaways", t.takeaways == null ? null : String(t.takeaways)],
                ["giveaways", "Giveaways", t.giveaways == null ? null : String(t.giveaways)]]
      .filter(function (r) { return r[2] != null; })
      .map(function (r) { return { key: r[0], label: r[1], value: r[2], rank: null }; });
    if (!rows.length) return season;
    var groups = season.groups.slice(), at = -1;
    groups.forEach(function (g, i) { if (g.id === "turnovers") at = i; });
    if (at === -1) groups.push({ id: "turnovers", label: "Turnovers and penalties", rows: rows });
    else groups[at] = { id: groups[at].id, label: groups[at].label, rows: rows.concat(groups[at].rows) };
    return { games: season.games, groups: groups };
  }

  // 1 -> "1st", 22 -> "22nd", 113 -> "113th"; a shared place is "Tied-".
  function ordinal(n) {
    var t = n % 100, s = t >= 11 && t <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + s;
  }
  // The snapshot and an ESPN team id -> { passOffense, turnoverMargin },
  // each { rank, rankText } or absent, or null when there is no row.
  function ranksFor(snap, id, year) {
    var row = teamRow(snap, id, year), mine = row && row.ranks;
    if (!mine) return null;
    var out = {};
    ["passOffense", "turnoverMargin"].forEach(function (k) {
      var r = mine[k];
      if (r && typeof r.rank === "number" && r.rank >= 1 && Math.floor(r.rank) === r.rank)
        out[k] = { rank: r.rank, rankText: (r.tied ? "Tied-" : "") + ordinal(r.rank) };
    });
    return out;
  }
  // The Stats screen's season with those ranks on its passing-yards and
  // turnover-margin rows. A row without one keeps no rank.
  function withRanks(season, r) {
    if (!season || !r) return season;
    var on = { passYards: r.passOffense, turnoverMargin: r.turnoverMargin };
    return { games: season.games, groups: season.groups.map(function (g) {
      return { id: g.id, label: g.label, rows: g.rows.map(function (row) {
        var k = on[row.key];
        return k ? { key: row.key, label: row.label, value: row.value, rank: k.rankText } : row;
      }) };
    }) };
  }

  return { PATH: PATH, teamRow: teamRow, yardsAllowed: yardsAllowed, turnovers: turnovers, signed: signed,
           withTurnovers: withTurnovers, ranksFor: ranksFor, withRanks: withRanks };
})();
