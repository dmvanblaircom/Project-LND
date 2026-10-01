/* TeamOS - predictive ratings for Top 25 -> Rankings (W07, issue #29).

     data/league/fpi.json  ->  TeamOS.ratings.fpi(snapshot, TEAM_CONFIG, season)  ->  Rating | null

   A rating is not a poll: nobody votes, there are no first-place votes, and
   it is never blended with one. It has the shape of a Poll
   (TeamOS.espn.rankings) so the Rankings view can offer it as one more
   choice, plus what only a rating has:

     Rating = { key, label, name, kind: "rating",
                season, current, asOf, updated, fetchedAt, sourceUrl,
                changeWindow, total,
                ranks: [Row] (the top 25, in the source's order),
                mine:  Row | null (the active team, wherever it ranks) }
     Row    = { rank, team, abbr, providerId, record, rating, change, mine }

   - rank and rating stay separate; a 0 or negative rating is a real rating.
   - change is the source's own rank change over `changeWindow` (ESPN
     publishes a 7-day change); null when the source gives none. It is
     never computed here against some other edition.
   - current is false when the snapshot belongs to another season (the
     rollover, or a source that has not published this season yet): the
     Suite must say which season it is, never pass it off as this one.
   - null when there is no usable snapshot at all: "not published" and
     "couldn't load" are the app's to tell apart, not this file's.

   The producer (tools/producers/fpi.py) has already validated the table:
   season, completeness, duplicates, columns. This file trusts that and
   only shapes it. Pure: no fetch, no DOM. Names no team. */

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

  // The freshness entry for a rating on screen (TeamOS.freshness.summary).
  function freshnessSource(rating, cached) {
    if (!rating) return { key: "fpi", missing: true, optional: true };
    return { key: rating.key, fetchedAt: rating.updated || rating.fetchedAt, cached: !!cached, maxAgeMs: MAX_AGE_MS };
  }

  return { fpi: fpi, freshnessSource: freshnessSource, TOP: TOP, MAX_AGE_MS: MAX_AGE_MS };
})();
