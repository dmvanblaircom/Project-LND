/* TeamOS - where a team's data comes from, for About Suite.

     TEAM_CONFIG  ->  TeamOS.sources.list()  ->  Source[]

   Every entry is read from what the team's configuration declares, so a team
   is credited exactly the sources it uses and no others: a team with no
   official depth chart lists no official source, a team with no beat feeds
   lists none. What each source supplies is a capability id; how it is worded
   is Suite's.

     Source = { id, name, url|null, supplies: [capability id, ...] }

   Pure: no fetch, no DOM. */

var TeamOS = TeamOS || {};

TeamOS.sources = (function () {
  "use strict";

  function https(u) { return typeof u === "string" && /^https:\/\//.test(u) ? u : null; }

  function list(config) {
    var src = (config && config.sources) || {};
    var snap = TeamOS.snapshots && TeamOS.snapshots.get;
    var out = [];

    if (src.espn) {
      out.push({ id: "espn", name: "ESPN", url: "https://www.espn.com/college-football/",
                 supplies: ["scores", "schedule", "rankings", "rosters", "news"] });
    }

    // The official documents (decision 0019), under the label the team's
    // configuration gives them, only where a snapshot is declared.
    var off = src.official || {}, official = {};
    function credit(kind, label, url) {
      if (!snap || !snap(config, kind) || !label) return;
      var o = official[label] || (official[label] = { id: "official", name: label, url: https(url), supplies: [] });
      o.supplies.push(kind);
    }
    credit("depth", off.depthChartLabel, off.depthChartIndex);
    credit("availability", off.availabilityReportLabel, off.availabilityReportIndex);
    Object.keys(official).forEach(function (k) { out.push(official[k]); });

    // Beat coverage, where the team declares feeds AND the snapshot the
    // Action commits from them.
    if (snap && snap(config, "beatNews")) {
      (src.beatFeeds || []).forEach(function (f) {
        if (f && f.name) out.push({ id: "beat", name: f.name, url: https(f.site), supplies: ["news"] });
      });
    }

    if (src.kalshi) {
      out.push({ id: "kalshi", name: "Kalshi", url: "https://kalshi.com/", supplies: ["outlook"] });
    }

    // Kickoff weather, for any team: it is looked up by the venue.
    out.push({ id: "weather", name: "Open-Meteo", url: "https://open-meteo.com/", supplies: ["weather"] });
    return out;
  }

  return { list: list };
})();
