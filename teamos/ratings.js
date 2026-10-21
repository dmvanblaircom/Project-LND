/* TeamOS - predictive ratings for Top 25 -> Rankings (W07, issue #29).

     data/league/fpi.json  ->  TeamOS.ratings.fpi(snapshot, TEAM_CONFIG, season)  ->  Rating | null
     <edge>/v1/cfbd/sp     ->  TeamOS.ratings.spPlus(body, TEAM_CONFIG, season, TEAM_REGISTRY)
                                                                                 ->  Rating | null

   A rating is not a poll: nobody votes, there are no first-place votes, and
   it is never blended with one. It has the shape of a Poll
   (TeamOS.espn.rankings) so the Rankings view can offer it as one more
   choice, plus what only a rating has:

     Rating = { key, label, name, kind: "rating",
                season, current, asOf, updated, fetchedAt, sourceUrl, credit,
                changeWindow, total,
                ranks: [Row] (the top 25, in the source's order),
                mine:  Row | null (the active team, wherever it ranks) }
     Row    = { rank, team, abbr, providerId, record, rating, change, mine }

   - rank and rating stay separate; a 0 or negative rating is a real rating.
   - change is the source's own rank change over `changeWindow` (ESPN
     publishes a 7-day change); null when the source gives none. It is
     never computed here against some other edition. A source with no
     change at all has changeWindow null: the Suite leaves the column out.
   - updated is the source's own edition time, null when it gives none;
     fetchedAt is only when it was read, and never stands in for it.
   - credit is who the source line names.
   - current is false when the snapshot belongs to another season (the
     rollover, or a source that has not published this season yet): the
     Suite must say which season it is, never pass it off as this one.
   - null when there is no usable snapshot at all: "not published" and
     "couldn't load" are the app's to tell apart, not this file's.

   FPI: the producer (tools/producers/fpi.py) has already validated the
   table: season, completeness, duplicates, columns. This file trusts that
   and only shapes it. SP+: the edge API has already cut CFBD's table to the
   permitted top 25 and joined each school to CFBD's id; this file checks
   that id against the registry once more. Pure: no fetch, no DOM. Names no
   team. */

var TeamOS = TeamOS || {};

TeamOS.ratings = (function () {
  "use strict";

  var TOP = 25;
  // ESPN says FPI updates daily. Three days covers a missed day or two
  // around a weekend; older than that is stale for a rating that moves
  // every game day.
  var MAX_AGE_MS = 3 * 24 * 3600 * 1000;

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function str(v) { return v == null ? "" : String(v); }

  function fpi(snap, config, season) {
    if (!snap || snap.source !== "fpi" || !Array.isArray(snap.teams) || !snap.teams.length) return null;
    var teamId = str(config && config.sources && config.sources.espn && config.sources.espn.teamId);
    var rows = snap.teams.filter(function (t) { return t && num(t.rank) != null && num(t.rating) != null; })
      .map(function (t) {
        return { rank: t.rank, team: str(t.name), abbr: t.abbr ? str(t.abbr) : null,
                 providerId: t.espnId != null ? str(t.espnId) : null,
                 record: t.record ? str(t.record) : "", rating: t.rating,
                 change: num(t.rankChange), mine: !!teamId && str(t.espnId) === teamId };
      })
      .sort(function (a, b) { return a.rank - b.rank; });
    if (!rows.length) return null;
    return {
      key: "fpi", label: "FPI", name: str(snap.label || "ESPN FPI"), kind: "rating",
      season: snap.season != null ? snap.season : null,
      current: season == null || snap.season === season,
      asOf: str(snap.weekText), updated: snap.sourceUpdated || null, fetchedAt: snap.fetchedAt || null,
      sourceUrl: snap.sourceUrl || null,
      changeWindow: "7 days",
      total: rows.length,
      ranks: rows.slice(0, TOP),
      mine: rows.filter(function (r) { return r.mine; })[0] || null
    };
  }

  // SP+, as the edge API serves it (worker/src/index.js, GET /v1/cfbd/sp).
  // Bill's permission (Oct 1) is the top 25 with ranks and ratings, credited
  // to SP+ and CFBD: so no record, no change, no row past 25 (ties can add
  // one), and `mine` only when the active team is in those rows.
  // Identity: CFBD's id is ESPN's, but it is taken only when the registry
  // lists that id under the same school name. Anything else - an id the
  // registry does not know, or knows by another name - stays unidentified:
  // no mark, never the active team, rather than borrowing someone's.
  // CFBD gives no edition time: updated and changeWindow are null. A week
  // the edge API kept carries its label ("Week 8"), shown as asOf. An empty
  // table (not published for that season) is null.
  function spPlus(body, config, season, registry) {
    if (!body || body.source !== "cfbd-sp" || !Array.isArray(body.ranks) || num(body.year) == null) return null;
    var teamId = str(config && config.sources && config.sources.espn && config.sources.espn.teamId);
    var known = {};
    (registry || []).forEach(function (t) { if (t && t.providerId != null && t.name) known[str(t.providerId)] = str(t.name); });
    var rows = body.ranks.filter(function (r) {
      return r && num(r.rank) != null && r.rank >= 1 && r.rank <= TOP && num(r.rating) != null && typeof r.team === "string" && r.team;
    }).map(function (r) {
      var id = r.id != null && known[str(r.id)] === r.team ? str(r.id) : null;
      return { rank: r.rank, team: r.team, abbr: null, providerId: id, record: "", rating: r.rating,
               change: null, mine: !!teamId && id === teamId };
    }).sort(function (a, b) { return a.rank - b.rank; });
    if (!rows.length) return null;
    return {
      key: "sp-plus", label: "SP+", name: "SP+", kind: "rating",
      season: body.year, current: season == null || body.year === season,
      asOf: typeof body.label === "string" ? body.label : "", updated: null, fetchedAt: body.fetchedAt || null,
      sourceUrl: "https://collegefootballdata.com/", credit: "SP+ and CollegeFootballData (CFBD)",
      changeWindow: null,
      total: rows.length,
      ranks: rows,
      mine: rows.filter(function (r) { return r.mine; })[0] || null
    };
  }

  // The freshness entry for a rating on screen (TeamOS.freshness.summary).
  // Its own edition time when it has one, else when it was read.
  function freshnessSource(rating, cached, key) {
    if (!rating) return { key: key || "fpi", missing: true, optional: true };
    return { key: rating.key, fetchedAt: rating.updated || rating.fetchedAt, cached: !!cached, maxAgeMs: MAX_AGE_MS };
  }

  return { fpi: fpi, spPlus: spPlus, freshnessSource: freshnessSource, TOP: TOP, MAX_AGE_MS: MAX_AGE_MS };
})();
